import { useEffect, useRef, useCallback } from "react";
import { quizAttemptAPI } from "@/services/api";
import { Camera } from "lucide-react";

/** Slightly spaced snapshots reduce GPU contention with typing/layout. */
const SNAPSHOT_MS = 3500;
/** More frequent face checks when typing to catch violations */
const TYPING_CHECK_MS = 1500;
/** Rate limit for duplicate warnings (prevent spam) */
const FACE_WARNING_RATE_LIMIT_MS = 800;

/** Same-origin assets from `public/mediapipe/` (run `npm run mediapipe:sync`). */
function mediapipePublicUrl(subPath: string): string {
  const normalized = subPath.replace(/^\//, "");
  const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
  const pathPart = `${base}${normalized}`;
  return new URL(pathPart, window.location.origin).href;
}

async function canLoadAsset(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) return true;
  } catch {
    /* ignore */
  }
  try {
    const res = await fetch(url, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

type Props = {
  attemptId: number;
  active: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onNoFace?: (reason: string) => void;
  disableServerOps?: boolean;
};

/**
 * Required webcam + periodic JPEG snapshots to server (proctor logs).
 * Advanced ML (phone / pose / multi-face) needs a separate service — we log snapshots only.
 */
export function ExamProctor({ attemptId, active, videoRef, onNoFace, disableServerOps = false }: Props) {
  const streamRef = useRef<MediaStream | null>(null);
  /** Direct track capture avoids drawImage(video), which can flash black on some GPUs while typing. */
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastNoFaceAtRef = useRef<number>(0);
  const faceDetectedRef = useRef(false);
  const faceDetectorRef = useRef<any>(null);
  const assetBaseRef = useRef<{ wasmBase: string; modelPath: string } | null>(null);
  /** Keep latest callback without changing identity every parent re-render (e.g. each keystroke). */
  const onNoFaceRef = useRef<Props["onNoFace"]>(onNoFace);
  onNoFaceRef.current = onNoFace;

  const triggerFaceIssue = useCallback((message: string) => {
    const now = Date.now();
    const timeSinceLastIssue = now - lastNoFaceAtRef.current;
    // Rate-limit to avoid spamming, but allow repeated detections over time.
    if (timeSinceLastIssue <= FACE_WARNING_RATE_LIMIT_MS) {
      console.debug(`[FACE] Rate-limited (${timeSinceLastIssue}ms < ${FACE_WARNING_RATE_LIMIT_MS}ms): ${message}`);
      return;
    }
    lastNoFaceAtRef.current = now;
    console.warn(`[FACE] Issue triggered (after ${timeSinceLastIssue}ms): ${message}`);
    onNoFaceRef.current?.(message);
  }, []);

  const ensureFaceDetector = useCallback(async () => {
    if (faceDetectorRef.current) {
      console.log("[DETECTOR] Already initialized");
      return faceDetectorRef.current;
    }
    try {
      console.log("[DETECTOR] Initializing MediaPipe FaceDetector...");
      const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
      let assetBase = assetBaseRef.current;
      if (!assetBase) {
        const localWasm = mediapipePublicUrl("mediapipe/wasm");
        const localModel = mediapipePublicUrl("mediapipe/models/blaze_face_full_range.tflite");
        console.log("[DETECTOR] Checking local assets...");
        const localOk = await canLoadAsset(`${localWasm}/vision_wasm_internal.js`);
        const modelOk = await canLoadAsset(localModel);
        if (localOk && modelOk) {
          console.log("[DETECTOR] Using local MediaPipe assets");
          assetBase = { wasmBase: localWasm, modelPath: localModel };
        } else {
          console.log("[DETECTOR] Using CDN MediaPipe assets (local not available)");
          // Fallback so detection still works even when mediapipe:sync wasn't run.
          assetBase = {
            wasmBase: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
            modelPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite",
          };
        }
        assetBaseRef.current = assetBase;
      }
      const vision = await FilesetResolver.forVisionTasks(assetBase.wasmBase);
      // Use a full-range model + allow multiple faces.
      // Without `maxFaces`, the detector may only ever return 0/1 even for 2+ people.
      const detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: assetBase.modelPath,
        },
        // IMAGE mode is more reliable for periodic snapshot-based detection.
        runningMode: "IMAGE",
        minDetectionConfidence: 0.15,
      });
      faceDetectorRef.current = detector;
      console.log("[DETECTOR] ✅ FaceDetector initialized successfully");
      return detector;
    } catch (e) {
      console.error("[DETECTOR] ❌ Failed to initialize:", e instanceof Error ? e.message : String(e));
      faceDetectorRef.current = null;
      return null;
    }
  }, []);

  const captureFrame = useCallback(async (video: HTMLVideoElement, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const track = videoTrackRef.current;
    if (typeof ImageCapture !== "undefined" && track && track.readyState === "live") {
      try {
        const ic = new ImageCapture(track) as any;
        const bitmap = await ic.grabFrame();
        canvas.width = Math.min(640, bitmap.width);
        canvas.height = Math.min(480, bitmap.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        return true;
      } catch {
        /* fallback to video element */
      }
    }
    const vw = video.videoWidth > 0 ? video.videoWidth : 640;
    const vh = video.videoHeight > 0 ? video.videoHeight : 480;
    canvas.width = Math.min(640, vw);
    canvas.height = Math.min(480, vh);
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return true;
    } catch {
      return false;
    }
  }, []);

  const captureAndUpload = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !active) return;
    // Wait for next paints so keystrokes / layout don’t compete with capture (reduces black flashes).
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ok = await captureFrame(video, ctx, canvas);
    if (!ok) return;
    if (!disableServerOps) {
      await new Promise<void>((resolve) => {
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              resolve();
              return;
            }
            try {
              await quizAttemptAPI.uploadProctorFrame(attemptId, blob);
            } catch {
              /* network — continue exam */
            }
            resolve();
          },
          "image/jpeg",
          0.72
        );
      });
    }

    // Defer ML so the browser can paint the live video first (avoids “blink” while typing).
    const snapshotW = canvas.width;
    const snapshotH = canvas.height;
    setTimeout(() => {
      void (async () => {
      try {
        const detector = faceDetectorRef.current ?? (await ensureFaceDetector());
        if (detector) {
          const result = detector.detect(canvas);
          const detections = (result as any)?.detections ?? [];
          if (detections.length === 0) {
            faceDetectedRef.current = false;
            triggerFaceIssue("Face not detected");
          } else if (detections.length > 1) {
            faceDetectedRef.current = false;
            triggerFaceIssue("Multiple faces detected");
          } else {
            const det0 = detections[0];
            const box = det0?.boundingBox;
            const boxW = typeof box?.width === "number" ? box.width : null;
            const boxH = typeof box?.height === "number" ? box.height : null;
            if (boxW != null && boxH != null) {
              const wRatio = boxW / snapshotW;
              const hRatio = boxH / snapshotH;
              const rawScore = det0?.score;
              const score =
                typeof rawScore === "number"
                  ? rawScore
                  : Array.isArray(rawScore) && typeof rawScore[0] === "number"
                    ? rawScore[0]
                    : null;
              if (score != null && score < 0.45) {
                faceDetectedRef.current = false;
                triggerFaceIssue("Face not detected (low confidence)");
              } else if (wRatio < 0.16 || hRatio < 0.16) {
                faceDetectedRef.current = false;
                triggerFaceIssue("Face too far / too small");
              } else {
                faceDetectedRef.current = true;
              }
            } else {
              faceDetectedRef.current = true;
            }
          }
        } else {
          const { data } = ctx.getImageData(
            Math.floor(snapshotW * 0.25),
            Math.floor(snapshotH * 0.25),
            Math.floor(snapshotW * 0.5),
            Math.floor(snapshotH * 0.5)
          );
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) sum += data[i]! + data[i + 1]! + data[i + 2]!;
          const avg = sum / (data.length / 4) / 3;
          if (avg < 40 || avg > 230) {
            faceDetectedRef.current = false;
            triggerFaceIssue("Face not detected (low signal)");
          } else {
            faceDetectedRef.current = true;
          }
        }
      } catch {
        /* ignore face detection errors */
      }
      })();
    }, 0);
  }, [attemptId, active, videoRef, captureFrame, ensureFaceDetector, triggerFaceIssue]);

  const detectFromLiveVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      console.warn("[DETECT] ❌ No video element available");
      return;
    }
    if (!active) {
      console.debug("[DETECT] Skipping - exam not active");
      return;
    }
    
    // Check video stream status
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      console.debug(`[DETECT] Video not ready (readyState: ${video.readyState}, need: ${HTMLMediaElement.HAVE_CURRENT_DATA})`);
      return;
    }
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.debug(`[DETECT] Video dimensions not set (${video.videoWidth}x${video.videoHeight})`);
      return;
    }
    
    try {
      const detector = faceDetectorRef.current ?? (await ensureFaceDetector());
      if (!detector) {
        console.warn("[DETECT] ❌ No detector available");
        return;
      }
      const result = detector.detect(video);
      const detections = (result as any)?.detections ?? [];
      console.log(`[DETECT] ✓ Video ${video.videoWidth}x${video.videoHeight} | Found ${detections.length} face(s)`);
      
      if (detections.length === 0) {
        faceDetectedRef.current = false;
        triggerFaceIssue("Face not detected");
      } else if (detections.length > 1) {
        faceDetectedRef.current = false;
        triggerFaceIssue("Multiple faces detected");
      } else {
        // Single face - check quality
        const det0 = detections[0];
        const rawScore = det0?.score;
        const score =
          typeof rawScore === "number"
            ? rawScore
            : Array.isArray(rawScore) && typeof rawScore[0] === "number"
              ? rawScore[0]
              : null;
        
        const box = det0?.boundingBox;
        const boxW = typeof box?.width === "number" ? box.width : null;
        const boxH = typeof box?.height === "number" ? box.height : null;
        
        console.log(`[DETECT] Single face - confidence: ${score?.toFixed(3)}, boxW: ${boxW?.toFixed(1)}, boxH: ${boxH?.toFixed(1)}`);
        
        if (score != null && score < 0.45) {
          faceDetectedRef.current = false;
          triggerFaceIssue("Face not detected (low confidence)");
        } else if (boxW != null && boxH != null) {
          const videoW = video.videoWidth > 0 ? video.videoWidth : 640;
          const videoH = video.videoHeight > 0 ? video.videoHeight : 480;
          const wRatio = boxW / videoW;
          const hRatio = boxH / videoH;
          console.log(`[DETECT] Face ratio - W: ${(wRatio * 100).toFixed(1)}%, H: ${(hRatio * 100).toFixed(1)}%`);
          
          if (wRatio < 0.16 || hRatio < 0.16) {
            faceDetectedRef.current = false;
            triggerFaceIssue("Face too far / too small");
          } else {
            faceDetectedRef.current = true;
          }
        } else {
          faceDetectedRef.current = true;
        }
      }
    } catch (e) {
      console.warn("[DETECT] Error:", e instanceof Error ? e.message : String(e));
    }
  }, [active, videoRef, ensureFaceDetector, triggerFaceIssue]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        console.log("[STREAM] Requesting camera access...");
        // Video (required)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          console.log("[STREAM] Setup cancelled, stopping stream");
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        console.log("[STREAM] ✅ Got video stream");
        streamRef.current = stream;
        videoTrackRef.current = stream.getVideoTracks()[0] ?? null;
        if (videoRef.current) {
          console.log("[STREAM] Attaching stream to video element...");
          videoRef.current.srcObject = stream;
          await new Promise<void>((resolve) => {
            const v = videoRef.current!;
            const onReady = () => {
              console.log(`[STREAM] ✅ Video ready: ${v.videoWidth}x${v.videoHeight}`);
              v.removeEventListener("loadeddata", onReady);
              v.removeEventListener("playing", onReady);
              resolve();
            };
            v.addEventListener("loadeddata", onReady);
            v.addEventListener("playing", onReady);
            v.play().catch((e) => {
              console.debug("[STREAM] Play error (continuing anyway):", e);
              resolve();
            }); // resolve anyway on error
          });
        } else {
          console.warn("[STREAM] ⚠️ videoRef.current is null!");
        }
        if (!disableServerOps) {
          await quizAttemptAPI.log(attemptId, "camera_on", "stream_started");
        }
        // Warm-up capture: initialize canvas/detector once before interval checks.
        setTimeout(() => {
          void captureAndUpload();
        }, 500);
      } catch (err) {
        console.error("[STREAM] ❌ Camera access failed:", err instanceof Error ? err.message : String(err));
        if (!disableServerOps) {
          await quizAttemptAPI.log(attemptId, "camera_denied", "getUserMedia_failed");
        }
        onNoFaceRef.current?.("Camera permission denied or camera not available");
      }
    })();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        console.log("[STREAM] Stopping video stream");
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      videoTrackRef.current = null;
    };
  }, [active, attemptId, videoRef, disableServerOps, captureAndUpload]);

  // Microphone (required): keep mic permission alive for the whole exam.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        if (cancelled) {
          micStream.getTracks().forEach((t) => t.stop());
          return;
        }
        micStreamRef.current = micStream;
        if (!disableServerOps) {
          await quizAttemptAPI.log(attemptId, "mic_on", "permission_granted");
        }
      } catch {
        if (!disableServerOps) {
          await quizAttemptAPI.log(attemptId, "mic_denied", "permission_denied");
        }
        onNoFaceRef.current?.("Microphone permission denied");
      }
    })();

    return () => {
      cancelled = true;
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
    };
  }, [active, attemptId, disableServerOps]);

  // If mic stops mid-exam, treat it as a violation.
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      const micTrack = micStreamRef.current?.getAudioTracks?.()?.[0];
      if (!micTrack || micTrack.readyState !== "live") {
        triggerFaceIssue("Microphone stopped during the exam");
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [active, triggerFaceIssue]);

  // If camera stops mid-exam, treat it as a violation.
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      const track = streamRef.current?.getVideoTracks?.()?.[0];
      if (!track || track.readyState !== "live") {
        triggerFaceIssue("Camera stopped during the exam");
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [active, triggerFaceIssue]);

  useEffect(() => {
    if (!active || !attemptId) return;
    console.log(`[INTERVALS] Setting up detection intervals for attempt ${attemptId}`);
    // Warm up detector once so first checks don't miss due to model init delay.
    void ensureFaceDetector();
    
    // Continuous face detection - runs every 2 seconds regardless of typing
    // This catches face violations immediately when student looks away
    const faceCheckInterval = window.setInterval(() => {
      console.log("[INTERVAL] Running 2sec face check...");
      void detectFromLiveVideo();
    }, 2000);
    
    // Heavy snapshot capture with upload (less frequent)
    const snapshotInterval = window.setInterval(() => {
      console.log("[INTERVAL] Running 3.5sec snapshot upload...");
      void captureAndUpload();
    }, SNAPSHOT_MS);
    
    // Extra face checks during typing for faster response
    const typingCheckInterval = window.setInterval(() => {
      if (typingActiveRef.current && active) {
        console.log("[INTERVAL] Running 1sec typing face check...");
        void detectFromLiveVideo();
      }
    }, 1000);
    
    console.log("[INTERVALS] ✅ All detection intervals started");
    
    return () => {
      console.log("[INTERVALS] Cleaning up detection intervals");
      clearInterval(faceCheckInterval);
      clearInterval(snapshotInterval);
      clearInterval(typingCheckInterval);
    };
  }, [active, attemptId, captureAndUpload, detectFromLiveVideo, ensureFaceDetector]);

  // Track key activity to pause heavy capture during typing.
  useEffect(() => {
    if (!active) return;
    const onKeyDown = () => {
      typingActiveRef.current = true;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => {
        typingActiveRef.current = false;
      }, 1200);
    };
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      document.removeEventListener("keydown", onKeyDown, { capture: true } as any);
      typingActiveRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    };
  }, [active]);

  return (
    <div className="fixed bottom-4 right-4 z-40 w-44 rounded-lg border-2 border-primary/40 bg-black overflow-hidden shadow-lg">
      <video
        ref={videoRef}
        className="h-28 w-full object-cover bg-black"
        playsInline
        muted
        autoPlay
      />
      <div className="flex items-center gap-1 bg-black/70 px-2 py-1 text-[10px] text-white">
        <Camera className="h-3 w-3 shrink-0 text-red-400" />
        <span className="truncate">Proctor cam (required)</span>
      </div>
    </div>
  );
}
