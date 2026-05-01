/**
 * Copies MediaPipe Tasks Vision WASM from node_modules into public/
 * and downloads the face-detector .tflite so the app works without CDN.
 * Run: npm run mediapipe:sync
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const wasmSrc = path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmDst = path.join(root, "public", "mediapipe", "wasm");
const modelDir = path.join(root, "public", "mediapipe", "models");
const modelFile = path.join(modelDir, "blaze_face_full_range.tflite");
const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite";

if (!fs.existsSync(wasmSrc)) {
  console.error("Missing:", wasmSrc, "— run npm install");
  process.exit(1);
}

fs.mkdirSync(wasmDst, { recursive: true });
for (const name of fs.readdirSync(wasmSrc)) {
  fs.copyFileSync(path.join(wasmSrc, name), path.join(wasmDst, name));
}
console.log("Copied WASM -> public/mediapipe/wasm");

fs.mkdirSync(modelDir, { recursive: true });
const needModel = !fs.existsSync(modelFile) || process.env.FORCE_MEDIAPIPE_MODEL === "1";
if (needModel) {
  try {
    const res = await fetch(modelUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(modelFile, buf);
    console.log("Downloaded face model -> public/mediapipe/models/blaze_face_full_range.tflite");
  } catch (e) {
    console.warn(
      "Face model download failed (%s). Proctoring ML may use fallback until you run: npm run mediapipe:sync",
      e instanceof Error ? e.message : e
    );
    process.exit(0);
  }
} else {
  console.log("Face model already present (set FORCE_MEDIAPIPE_MODEL=1 to re-download)");
}
