# CORE Backend — Security Posture

This document is the threat model + audit trail for Phase 4 (Security Hardening).
Every OWASP Top 10 category has a mitigation here.

## OWASP Top 10 (2021) — coverage

| # | Risk | Mitigation in this codebase |
|---|------|------------------------------|
| A01 | Broken Access Control | JWT verified at edge (`middleware.ts`); admin routes stealth-404; entitlement resolver gates Pro features; cascade-deletes never cross user boundaries |
| A02 | Cryptographic Failures | `lib/security/encrypt.ts` AES-256-GCM for sensitive fields; bcrypt cost 12 for passwords/PIN/OTPs; JWT secrets via env (never source); all cookies httpOnly + secure + sameSite |
| A03 | Injection | Prisma parameterized queries everywhere; no raw SQL except `$queryRaw\`SELECT 1\`` in health probe; Zod validates every body |
| A04 | Insecure Design | Two-tier rate limiting; account lockouts with exponential backoff; CSRF double-submit; suspicious login detection; OTP attempt counting + invalidation |
| A05 | Security Misconfiguration | `.env.example` enumerates required vars; `cache-control: no-store` on /api responses; `Strict-Transport-Security` in prod (Vercel default); `sameSite: lax` on cookies |
| A06 | Vulnerable & Outdated Components | Pin major versions in package.json; `pnpm audit` in CI; renovate-bot when we wire CI in Phase 10 |
| A07 | Identification & Auth Failures | bcrypt password hashing; OTP-based 2FA; refresh-token rotation; brute-force lockout; constant-time dummy bcrypt on user-not-found |
| A08 | Software & Data Integrity | Stripe webhook signature verified with raw body; Apple StoreKit V2 JWS decoding (Phase 5 adds full cert-chain validation) |
| A09 | Security Logging & Monitoring | `AuditLog` + `AdminLog` + `FailedLogin` + `SuspiciousLogin` + `AnalyticsEvent`; structured logs with no PII |
| A10 | Server-Side Request Forgery | No user-controlled URLs are fetched server-side; Stripe + Apple SDKs only |

## Authentication flow

```
Sign-in:
  1. POST /api/auth/sign-in (email, password, fingerprint)
  2. Edge middleware passes through (public route)
  3. AccountLockout check — 423 if locked
  4. Rate limit — 5 attempts per 15min per IP AND per email
  5. bcrypt-verify password (dummy bcrypt on user-not-found to defeat timing)
  6. serverFingerprint(client_fp + ua + country) → sha256
  7. issueSession() — creates DeviceSession row + sets core_at + core_rt cookies
  8. checkSuspiciousLogin() — flags new-country / new-device / too-many-devices
  9. clearFailures() — wipes lockout counters
  10. AuditLog entry, AnalyticsEvent fired
```

## Owner auth flow (admin dashboard)

```
Owner accesses /admin:
  1. POST /api/admin/auth/pin (email, pin)
     - If email != OWNER_EMAIL → 404 (not 401, hides existence)
     - bcrypt-verify pin vs OwnerSecret.pinHash
     - On success: issue Email OTP (purpose=OWNER_DASHBOARD, 10min TTL)
  2. Email arrives with 6-digit code (Phase 9 wires real send)
  3. POST /api/admin/auth/verify (email, code, fingerprint)
     - verifyOtp() — bcrypt-compare against stored hash, max 5 attempts
     - issueOwnerSession() — creates core_owner cookie (1h TTL, sameSite=strict)
  4. All /api/admin/* routes call requireOwner() — non-owners get 404
```

## Cookies

| Cookie | Purpose | Lifetime | Attributes |
|--------|---------|----------|-----------|
| `core_at` | JWT access token | 15min | httpOnly, secure, sameSite=lax |
| `core_rt` | Opaque refresh token (hashed in DB) | 30 days | httpOnly, secure, sameSite=lax |
| `core_csrf` | CSRF double-submit token | 8h | secure, sameSite=lax (readable by JS) |
| `core_owner` | Owner dashboard session | 1h | httpOnly, secure, sameSite=strict |

## Rate limit buckets

| Bucket | Limit | Window |
|--------|-------|--------|
| `login` (per IP) | 5 | 15min |
| `login` (per email) | 5 | 15min |
| `coin_send` | 20 | 1h |
| `post:create` | 6 | 1h |
| `admin_pin` | 5 | 15min |
| `password_reset` | 3 | 1h |
| `otp:issuance` | 3 | 1h (shared with password_reset) |

## Brute-force lockout

- 5 failed login attempts in 15min → 15-minute account lockout
- Each subsequent lockout doubles the timeout (15→30→60→120 min, capped at 24h)
- Lockout is per-email; IP-based limiting separately stops attackers spraying many emails

## Suspicious login detection (post-auth, non-blocking)

- New country (user has never signed in from this country) → flagged
- New device fingerprint (no prior DeviceSession matches) → flagged
- >10 concurrent active devices → flagged
- (Phase 5/9: impossible-travel via GeoIP, push notification to user, optional auto-revoke)

## What we DON'T do (intentionally)

- We don't expose detailed error messages on auth failures — always "invalid_credentials"
- We don't disclose whether an email is registered (signup vs forgot flow are identical first response)
- We don't return 401 from admin routes — always 404, hiding the route's existence
- We don't store OTP plaintext — bcrypt-hashed, single-use, attempt-counted
- We don't trust the client's `x-user-id` — middleware verifies JWT and stamps its own header
- We don't log OTP codes in production (dev-only console)
- We don't allow weak passwords (Zod min 8) — Phase 5 adds zxcvbn check for entropy
- We don't auto-extend sessions on every request — refresh tokens rotate on access expiry only

## Owner-dashboard-specific hardening

- Separate cookie (`core_owner`) — even if the regular `core_at` JWT is stolen, the attacker still needs the PIN + OTP to reach revenue data
- `sameSite=strict` on the owner cookie — blocks all cross-origin access
- 1h session lifetime — re-PIN every hour, no "remember me"
- Email OTP required for every owner session (toggleable via OwnerSecret.requireOtp)
- All owner actions logged to AdminLog (LOGIN, USER_VIEW, USER_BAN, REFUND_ISSUED, …)
- 404 instead of 401/403 on every admin endpoint — non-owners cannot enumerate routes

## Operational secrets

All secrets live in environment variables. Never in source. Never in client bundles.
Vercel encrypts them at rest. For local dev: `.env.local` (gitignored).

Rotation:
- JWT_SECRET — rotate yearly. Old tokens become invalid immediately (acceptable since access tokens are 15min).
- ENCRYPTION_KEY — rotate with key versioning; future Phase work covers this.
- Stripe/Apple keys — rotate when team members leave or every 90 days, whichever is sooner.
- Owner PIN — change via `pnpm tsx scripts/setup-owner.ts`. Old PIN immediately invalidated.

## Pending (later phases)

- WAF / DDoS protection — Vercel + Cloudflare in front
- DAST scanning (OWASP ZAP) — Phase 10
- Penetration test before App Store submission — Phase 10
- SBOM + signed releases — when CI/CD lands in Phase 10
- Phase 9: APNs/FCM signed receipts (we currently no-op send, no signing yet)
