/**
 * On-device photo storage for the Physique Scanner.
 *
 * PRIVACY: scan photos are copied into the app's PRIVATE document directory
 * (`<documentDirectory>/physique-scans/`). They never leave the device — not to
 * Supabase, not to any bucket. The vision analysis sends bytes to our edge
 * function over HTTPS for in-memory rating only; that path never persists them.
 * "Delete all scans" wipes this folder.
 */
import * as FileSystem from "expo-file-system";

const SCAN_DIR = FileSystem.documentDirectory + "physique-scans/";

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(SCAN_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SCAN_DIR, { intermediates: true });
  }
}

/** Copy a freshly-captured photo (temp uri) into app-private storage; returns the saved uri. */
export async function savePhoto(tempUri: string, id: string): Promise<string> {
  await ensureDir();
  const dest = `${SCAN_DIR}${id}.jpg`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

/** Delete a single saved photo (no-op if missing). */
export async function deletePhoto(uri: string | null | undefined): Promise<void> {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* already gone */
  }
}

/** Wipe the entire scan-photo directory (used by "delete all scans"). */
export async function deleteAllPhotos(): Promise<void> {
  try {
    await FileSystem.deleteAsync(SCAN_DIR, { idempotent: true });
  } catch {
    /* already gone */
  }
}

/** Read a saved photo back as base64 (for re-analysis / debugging). */
export async function readPhotoBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}
