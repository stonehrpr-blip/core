/**
 * On-device full-body gate for the Physique Scanner.
 *
 * WHY THIS IS A NO-OP RIGHT NOW (and that's safe):
 * The authoritative body check is server-side — the `physique-scan` edge
 * function returns `isBody:false` for anything that isn't a clear full body, and
 * the screen shows a retry WITHOUT rendering a fake rating. That gate is always
 * on and real.
 *
 * The on-device MoveNet pre-gate (which would also avoid spending an AI call on a
 * non-body) needs TensorFlow deps that are NOT installed and CANNOT be referenced
 * here: Metro bundles every import at build time, so importing an uninstalled
 * `@tensorflow/*` module would break the whole app bundle. So we keep this file
 * import-free and return `{ available:false }`; the caller falls back to the
 * server gate. No bricked bundle, feature still works.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * TO ENABLE ON-DEVICE DETECTION (do this on a dev client / prebuild, not Expo Go):
 *   1) pnpm --filter mobile add @tensorflow/tfjs @tensorflow/tfjs-react-native \
 *        @tensorflow-models/pose-detection expo-gl
 *   2) Replace the body of `detectFullBody` below with the reference impl in
 *      `bodyDetect.movenet.ts.txt` (kept next to this file), which:
 *        - tf.ready() + createDetector(MoveNet, SINGLEPOSE_LIGHTNING)
 *        - decodeJpeg(base64 → bytes) → estimatePoses
 *        - require shoulders + ≥2 confident lower-body joints for "full body"
 *   3) Test on a physical device; verify a non-body is blocked locally.
 * Until then the server `isBody` check is the gate.
 * ──────────────────────────────────────────────────────────────────────────
 */

export type BodyCheck =
  | { available: false }
  | { available: true; isFullBody: boolean; confidence: number };

export function isPoseDetectionAvailable(): boolean {
  return false;
}

/**
 * On-device full-body check. Currently a graceful no-op (returns available:false)
 * so the caller defers to the server-side isBody gate — see file header to light
 * up real MoveNet detection once the optional TF deps are installed.
 */
export async function detectFullBody(_base64Jpeg: string): Promise<BodyCheck> {
  return { available: false };
}
