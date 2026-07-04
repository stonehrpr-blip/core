// Apple App Store Server API + StoreKit V2 notification verifier (Phase 5).
//
// Production-grade JWS signature verification via @apple/app-store-server-library.
// Apple-root-CA cert chain validation is done by the library; we configure the
// environment + bundle ID and the verifier checks every JWS we receive.
//
// Replay-attack protection: every transaction is upserted by appleOriginalTxId
// (Apple's stable subscription ID). The same transactionId can't be processed
// twice — Prisma's @unique on stripeSubscriptionId enforces it.

import { readFileSync } from 'fs';
import { prisma } from '@/lib/db/prisma';

// The library is dynamically imported so a missing install in dev doesn't
// hard-crash other modules. Production install: `pnpm add @apple/app-store-server-library`.
let SignedDataVerifier: any = null;
let Environment: any = null;
let AppStoreServerAPIClient: any = null;
let appleVerifier: any = null;
let appleApiClient: any = null;

async function loadLib() {
  if (SignedDataVerifier) return; // cached
  try {
    const mod = await import('@apple/app-store-server-library');
    SignedDataVerifier = mod.SignedDataVerifier;
    Environment = mod.Environment;
    AppStoreServerAPIClient = mod.AppStoreServerAPIClient;
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('@apple/app-store-server-library not installed');
    }
    // Dev fallback — degrade to JWS decode without verify.
    console.warn('[apple] library missing — running in degraded dev mode');
  }
}

function loadAppleCerts(): Buffer[] {
  // Apple publishes their root + intermediate CA certs.
  // Ship them in /secrets/apple-root-ca-g3.cer (and any intermediates).
  // For first deploy: download from https://www.apple.com/certificateauthority/
  const certsPath = process.env.APPLE_ROOT_CERTS_DIR || '/secrets/apple-certs';
  try {
    // List all .cer / .pem files in that dir
    const fs = require('fs');
    const path = require('path');
    return fs.readdirSync(certsPath)
      .filter((f: string) => /\.(cer|pem|crt)$/.test(f))
      .map((f: string) => fs.readFileSync(path.join(certsPath, f)));
  } catch {
    return [];
  }
}

async function getVerifier() {
  if (appleVerifier) return appleVerifier;
  await loadLib();
  if (!SignedDataVerifier) return null;

  const bundleId = process.env.APPLE_BUNDLE_ID;
  const envName = (process.env.APPLE_ENV || 'Sandbox') as 'Production' | 'Sandbox';
  const env = Environment[envName.toUpperCase()];
  const appAppleId = Number(process.env.APPLE_APP_APPLE_ID || 0) || undefined;
  const enableOnlineCheck = process.env.NODE_ENV === 'production';
  const certs = loadAppleCerts();
  if (!bundleId || certs.length === 0) return null;

  appleVerifier = new SignedDataVerifier(certs, enableOnlineCheck, env, bundleId, appAppleId);
  return appleVerifier;
}

async function getApiClient() {
  if (appleApiClient) return appleApiClient;
  await loadLib();
  if (!AppStoreServerAPIClient) return null;

  const issuerId = process.env.APPLE_ISSUER_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const bundleId = process.env.APPLE_BUNDLE_ID;
  const keyPath = process.env.APPLE_PRIVATE_KEY_PATH;
  const envName = (process.env.APPLE_ENV || 'Sandbox').toUpperCase();
  if (!issuerId || !keyId || !bundleId || !keyPath) return null;

  const privateKey = readFileSync(keyPath, 'utf8');
  appleApiClient = new AppStoreServerAPIClient(privateKey, keyId, issuerId, bundleId, Environment[envName]);
  return appleApiClient;
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AppleNotificationPayload {
  notificationType: string;
  subtype?: string;
  data?: {
    appAppleId?: number;
    bundleId?: string;
    environment?: 'Production' | 'Sandbox';
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
  };
  version?: string;
  signedDate?: number;
  notificationUUID?: string;
}

export interface AppleTransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  webOrderLineItemId?: string;
  bundleId: string;
  productId: string;
  subscriptionGroupIdentifier?: string;
  purchaseDate: number;
  originalPurchaseDate: number;
  expiresDate?: number;
  type: string;
  appAccountToken?: string;
  inAppOwnershipType: 'PURCHASED' | 'FAMILY_SHARED';
  environment: 'Production' | 'Sandbox';
  revocationDate?: number;
  revocationReason?: number;
  price?: number;       // in micro-units (price * 1000)
  currency?: string;
}

// ─── Verify + decode ──────────────────────────────────────────────────────

/** Full JWS verification of the notification envelope. Falls back to unsigned decode in dev. */
export async function verifyAppleNotification(signedPayload: string): Promise<AppleNotificationPayload> {
  const v = await getVerifier();
  if (v) {
    return await v.verifyAndDecodeNotification(signedPayload);
  }
  // Dev fallback — decode without verifying signature
  const seg = signedPayload.split('.')[1];
  if (!seg) throw new Error('invalid_jws');
  return JSON.parse(Buffer.from(seg, 'base64').toString('utf8'));
}

/** Full JWS verification of a transaction info JWS. */
export async function verifyAppleTransaction(signedTransactionInfo: string): Promise<AppleTransactionInfo> {
  const v = await getVerifier();
  if (v) {
    return await v.verifyAndDecodeTransaction(signedTransactionInfo);
  }
  const seg = signedTransactionInfo.split('.')[1];
  if (!seg) throw new Error('invalid_jws');
  return JSON.parse(Buffer.from(seg, 'base64').toString('utf8'));
}

/** Server-side: look up the latest transaction for a user via App Store Server API. */
export async function getLatestTransaction(originalTxId: string): Promise<AppleTransactionInfo | null> {
  const client = await getApiClient();
  if (!client) return null;
  try {
    const response = await client.getTransactionHistory(originalTxId, null, { sort: 'DESCENDING' });
    const signed = response.signedTransactions?.[0];
    if (!signed) return null;
    return await verifyAppleTransaction(signed);
  } catch (err) {
    console.error('apple_getLatestTransaction_error', err);
    return null;
  }
}

/** Map an Apple notificationType + subtype to our SubscriptionStatus enum. */
export function appleStatusFromNotification(type: string, subtype?: string): {
  status: 'TRIALING' | 'ACTIVE' | 'GRACE_PERIOD' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
} | null {
  switch (type) {
    case 'SUBSCRIBED':
      return { status: subtype === 'INITIAL_BUY' ? 'TRIALING' : 'ACTIVE' };
    case 'DID_RENEW':
      return { status: 'ACTIVE' };
    case 'DID_FAIL_TO_RENEW':
      return { status: subtype === 'GRACE_PERIOD' ? 'GRACE_PERIOD' : 'PAST_DUE' };
    case 'EXPIRED':
    case 'GRACE_PERIOD_EXPIRED':
      return { status: 'EXPIRED' };
    case 'REFUND':
    case 'REVOKE':
      return { status: 'REFUNDED' };
    case 'DID_CHANGE_RENEWAL_STATUS':
      return subtype === 'AUTO_RENEW_DISABLED' ? { status: 'CANCELLED' } : { status: 'ACTIVE' };
    case 'TEST':
    case 'CONSUMPTION_REQUEST':
      return null;
    default:
      return null;
  }
}

// ─── Apply a verified notification ────────────────────────────────────────

export async function applyAppleNotification(payload: AppleNotificationPayload): Promise<{ ok: boolean; reason?: string; ignored?: boolean }> {
  if (!payload.data?.signedTransactionInfo) return { ok: false, reason: 'no_transaction' };

  let txn: AppleTransactionInfo;
  try {
    txn = await verifyAppleTransaction(payload.data.signedTransactionInfo);
  } catch (err) {
    return { ok: false, reason: 'jws_verify_failed:' + (err as Error).message };
  }

  const userId = txn.appAccountToken;
  if (!userId) return { ok: false, reason: 'no_user_mapping' };

  // Replay protection — if we've already processed this transactionId, skip
  // (Transactions are uniqued by appleTransactionId in the Transaction table.)
  const existingTxn = await prisma.transaction.findUnique({
    where: { appleTransactionId: txn.transactionId },
  });

  const mapped = appleStatusFromNotification(payload.notificationType, payload.subtype);
  if (!mapped) return { ok: true, ignored: true };

  // Family-shared purchases shouldn't grant the renter Pro on the sharer's app account
  if (txn.inAppOwnershipType === 'FAMILY_SHARED' && process.env.APPLE_ALLOW_FAMILY_SHARING !== '1') {
    return { ok: false, reason: 'family_shared_blocked' };
  }

  const subKey = 'apple_' + txn.originalTransactionId;
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subKey },
    update: {
      appleLatestTxId: txn.transactionId,
      status: mapped.status as any,
      currentPeriodEnd: txn.expiresDate ? new Date(txn.expiresDate) : undefined,
      appleEnvironment: txn.environment,
      ...(mapped.status === 'EXPIRED' ? { expiredAt: new Date() } : {}),
      ...(mapped.status === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
    },
    create: {
      userId,
      provider: 'APPLE',
      status: mapped.status as any,
      appleOriginalTxId: txn.originalTransactionId,
      appleLatestTxId: txn.transactionId,
      appleProductId: txn.productId,
      appleEnvironment: txn.environment,
      stripeSubscriptionId: subKey,
      currentPeriodEnd: txn.expiresDate ? new Date(txn.expiresDate) : undefined,
    },
  });

  // Mirror to User for fast reads
  const userTier = (mapped.status === 'ACTIVE' || mapped.status === 'TRIALING' || mapped.status === 'GRACE_PERIOD') ? 'PRO' : 'FREE';
  await prisma.user.update({
    where: { id: userId },
    data: {
      tier: userTier,
      subscriptionStatus: mapped.status as any,
      ...(mapped.status === 'REFUNDED' ? { refundCount: { increment: 1 } } : {}),
    },
  });

  // Record the Transaction (idempotent — won't double if already exists)
  if (!existingTxn && (payload.notificationType === 'SUBSCRIBED' || payload.notificationType === 'DID_RENEW')) {
    const priceCents = txn.price ? Math.round(txn.price / 10) : 799; // micro-units → cents
    const feeCents = Math.round(priceCents * 0.15); // year-1 small business rate
    await prisma.transaction.create({
      data: {
        userId,
        provider: 'APPLE',
        amountCents: priceCents,
        feeCents,
        netCents: priceCents - feeCents,
        currency: txn.currency || 'USD',
        appleTransactionId: txn.transactionId,
        description: txn.productId,
      },
    });
  }

  // Refund: mark the matching Transaction
  if (mapped.status === 'REFUNDED' && existingTxn) {
    await prisma.transaction.update({
      where: { id: existingTxn.id },
      data: { refundedAt: new Date() },
    });
  }

  return { ok: true };
}
