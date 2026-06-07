/**
 * On-device full-body gate for the Physique Scanner (real MoveNet).
 *
 * Runs AFTER capture, BEFORE upload: decode the JPEG, run MoveNet single-pose,
 * and require confident upper (shoulders) AND lower (hips/knees/ankles) keypoints
 * so a non-body (object, pet, face-only crop, empty frame) is blocked locally and
 * never spends an AI call — the prompt's privacy/cost rule.
 *
 * RESILIENCE: TF init (esp. the expo-gl WebGL backend) can fail on some
 * devices/SDK combos. Every failure path returns { available:false } and the
 * caller defers to the SERVER `isBody` check, which is the always-on hard gate.
 * So the feature works regardless; on-device is a privacy/cost enhancement.
 */
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native"; // registers the RN platform + rn-webgl backend
import { decodeJpeg } from "@tensorflow/tfjs-react-native";
import * as poseDetection from "@tensorflow-models/pose-detection";

export type BodyCheck =
  | { available: false }
  | { available: true; isFullBody: boolean; confidence: number };

let _detector: poseDetection.PoseDetector | null = null;
let _ready = false;
let _initTried = false;

async function ensureDetector(): Promise<boolean> {
  if (_initTried) return _ready;
  _initTried = true;
  try {
    await tf.ready();
    _detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    });
    _ready = true;
  } catch {
    _ready = false;
  }
  return _ready;
}

export function isPoseDetectionAvailable(): boolean {
  return _ready;
}

// dependency-free base64 → bytes (no reliance on a global atob in RN)
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = (() => {
  const t = new Uint8Array(256);
  for (let i = 0; i < B64.length; i++) t[B64.charCodeAt(i)] = i;
  return t;
})();
function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  let len = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const e1 = LOOKUP[clean.charCodeAt(i)] ?? 0;
    const e2 = LOOKUP[clean.charCodeAt(i + 1)] ?? 0;
    const e3 = LOOKUP[clean.charCodeAt(i + 2)] ?? 0;
    const e4 = LOOKUP[clean.charCodeAt(i + 3)] ?? 0;
    if (p < len) bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < len) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < len) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes;
}

const UPPER = ["left_shoulder", "right_shoulder"];
const LOWER = ["left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"];
const MIN_SCORE = 0.3;

export async function detectFullBody(base64Jpeg: string): Promise<BodyCheck> {
  if (!(await ensureDetector()) || !_detector) return { available: false };

  let imageTensor: tf.Tensor3D | null = null;
  try {
    imageTensor = decodeJpeg(base64ToBytes(base64Jpeg));
    const poses = await _detector.estimatePoses(imageTensor);
    const first = poses?.[0];
    if (!first) return { available: true, isFullBody: false, confidence: 0 };

    const kp = first.keypoints ?? [];
    const named = new Map<string | undefined, number>(kp.map((k) => [k.name, k.score ?? 0]));
    const upperOk = UPPER.some((n) => (named.get(n) ?? 0) > MIN_SCORE);
    const lowerHits = LOWER.filter((n) => (named.get(n) ?? 0) > MIN_SCORE).length;
    const confidence = kp.reduce((a, k) => a + (k.score ?? 0), 0) / Math.max(1, kp.length);

    return { available: true, isFullBody: upperOk && lowerHits >= 2, confidence: Math.round(confidence * 100) / 100 };
  } catch {
    return { available: false };
  } finally {
    try { imageTensor?.dispose(); } catch { /* noop */ }
  }
}
