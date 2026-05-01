import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, ShieldAlert, Maximize, AlertCircle, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProctoringOverlayProps {
    onViolation: (reason: string) => void;
    isActive: boolean;
    disableCameraPreview?: boolean;
}

/** How long the tab/window must stay hidden before it counts as a violation (reduces accidental switches). */
const VISIBILITY_GRACE_MS = 2500;

const MAX_STRIKES_BEFORE_AUTO = 3;
/** Reset strikes after the user stays on the page (visible) for this long. */
const STRIKE_RESET_MS = 8000;

/**
 * Session integrity without over-relying on camera or cursor position.
 * - Required: stay in fullscreen; do not leave this tab for extended periods.
 * - Optional: webcam preview when permitted (denial does not block or fail the session).
 * - Not used: document mouseleave, cursor “hot zones” — too many false positives in real browsers.
 */
export const ProctoringOverlay = ({ onViolation, isActive, disableCameraPreview = false }: ProctoringOverlayProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const onViolationRef = useRef(onViolation);
    const visibilityTimerRef = useRef<number | null>(null);
    const resetTimerRef = useRef<number | null>(null);
    const intervalRef = useRef<number | null>(null);
    const startedAtRef = useRef<number | null>(null);
    const [cameraMode, setCameraMode] = useState<"idle" | "live" | "denied">("idle");
    const [violations, setViolations] = useState(0);
    const [showWarning, setShowWarning] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [elapsedSec, setElapsedSec] = useState(0);

    const mm = Math.floor(elapsedSec / 60);
    const ss = elapsedSec % 60;

    onViolationRef.current = onViolation;

    const recordStrike = useCallback(
        (reason: string) => {
            setViolations((prev) => {
                const next = prev + 1;
                if (next >= MAX_STRIKES_BEFORE_AUTO) {
                    onViolationRef.current(`Maximum violations reached: ${reason}`);
                } else {
                    setShowWarning(
                        `${reason} · Strike ${next}/${MAX_STRIKES_BEFORE_AUTO}.`
                    );
                }
                return next;
            });
        },
        []
    );

    useEffect(() => {
        if (!isActive) {
            setCameraMode("idle");
            setViolations(0);
            setShowWarning(null);
            setElapsedSec(0);
            startedAtRef.current = null;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        setIsFullscreen(!!document.fullscreenElement);

        // Optional camera — never fails the session if denied or unavailable
        const setupCamera = async () => {
            if (disableCameraPreview) {
                setCameraMode("idle");
                return;
            }
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    setCameraMode("denied");
                    return;
                }
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
                    audio: false,
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    const v = videoRef.current;
                    v.srcObject = stream;
                    // Wait until real frames are available; avoids "Camera: on" with black tile.
                    await new Promise<void>((resolve) => {
                        const onReady = () => {
                            if (v.videoWidth > 0 && v.videoHeight > 0) {
                                v.removeEventListener("loadeddata", onReady);
                                v.removeEventListener("playing", onReady);
                                resolve();
                            }
                        };
                        v.addEventListener("loadeddata", onReady);
                        v.addEventListener("playing", onReady);
                        const playPromise = v.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(() => {
                                // Autoplay might be blocked; still wait for loadeddata
                                resolve();
                            });
                        }
                        // Timeout fallback in case events don't fire
                        setTimeout(() => resolve(), 3000);
                    });
                }
                setCameraMode("live");
            } catch (err) {
                console.debug("Camera access failed:", err);
                setCameraMode("denied");
            }
        };
        void setupCamera();

        // Playback watchdog: if Chrome drops to a black paused frame, try play() again.
        const playbackWatchdog = window.setInterval(() => {
            const v = videoRef.current;
            if (!v) return;
            if (cameraMode !== "live") return;
            if (v.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || v.videoWidth === 0 || v.videoHeight === 0) {
                const playPromise = v.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {});
                }
            }
        }, 1200);

        // Simple elapsed timer (proctored session duration).
        startedAtRef.current = Date.now();
        setElapsedSec(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = window.setInterval(() => {
            if (!startedAtRef.current) return;
            const sec = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
            setElapsedSec(sec);
        }, 1000);

        const clearVisibilityTimer = () => {
            if (visibilityTimerRef.current != null) {
                clearTimeout(visibilityTimerRef.current);
                visibilityTimerRef.current = null;
            }
        };

        const clearResetTimer = () => {
            if (resetTimerRef.current != null) {
                clearTimeout(resetTimerRef.current);
                resetTimerRef.current = null;
            }
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                clearResetTimer();
                visibilityTimerRef.current = window.setTimeout(() => {
                    recordStrike("This page was left in the background for too long (another tab, minimize, or overlay)");
                }, VISIBILITY_GRACE_MS);
            } else {
                clearVisibilityTimer();
                clearResetTimer();
                // If user stays on the exam tab long enough, allow a "fresh start".
                resetTimerRef.current = window.setTimeout(() => {
                    setViolations(0);
                    setShowWarning(null);
                    resetTimerRef.current = null;
                }, STRIKE_RESET_MS);
            }
        };

        const onFullscreenChange = () => {
            const full = !!document.fullscreenElement;
            setIsFullscreen(full);
            if (!full && isActive) {
                recordStrike("Fullscreen was exited");
            }
        };

        window.addEventListener("visibilitychange", onVisibilityChange);
        document.addEventListener("fullscreenchange", onFullscreenChange);

        return () => {
            clearVisibilityTimer();
            clearResetTimer();
            window.clearInterval(playbackWatchdog);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            window.removeEventListener("visibilitychange", onVisibilityChange);
            document.removeEventListener("fullscreenchange", onFullscreenChange);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
        };
    }, [isActive, recordStrike, cameraMode, disableCameraPreview]);

    const enterFullscreen = () => {
        document.documentElement.requestFullscreen().catch(() => {
            recordStrike("Fullscreen could not be activated — do not block fullscreen prompts");
        });
    };

    if (!isActive) return null;

    return (
        <>
            {/* Compact status: what is being monitored (not only video) */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed z-50 bottom-4 right-4 max-w-[min(100vw-2rem,280px)] rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-elevated overflow-hidden"
            >
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
                    <MonitorSmartphone className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-foreground leading-tight">Session integrity</p>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                            Fullscreen + tab focus · Camera:{" "}
                            {cameraMode === "live" ? "✓ on" : cameraMode === "denied" ? "✗ off" : "⟳ pending"} ·{" "}
                            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
                        </p>
                    </div>
                </div>
                <div className="relative w-full aspect-[4/3] bg-black/90">
                    {disableCameraPreview ? (
                        <div className="absolute inset-0 flex items-center justify-center p-3 text-center">
                            <p className="text-[10px] text-muted-foreground">
                                Camera preview is shown in proctor tile.
                            </p>
                        </div>
                    ) : cameraMode === "live" ? (
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
                            {cameraMode === "denied" ? (
                                <CameraOff className="w-8 h-8 text-muted-foreground opacity-80" />
                            ) : (
                                <Camera className="w-8 h-8 text-muted-foreground opacity-50 animate-pulse" />
                            )}
                            <p className="text-[10px] text-muted-foreground px-1">
                                {cameraMode === "denied"
                                    ? "Camera unavailable — please enable camera permissions in your browser settings"
                                    : "Starting camera… (checking permissions)"}
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>

            {!isFullscreen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/85 p-6 text-center backdrop-blur-md">
                    <div className="max-w-md space-y-4">
                        <ShieldAlert className="mx-auto h-14 w-14 text-warning" />
                        <h2 className="text-xl font-bold text-foreground">Fullscreen required</h2>
                        <p className="text-sm text-muted-foreground">
                            Stay in this tab and fullscreen while you work. We monitor{" "}
                            <span className="font-medium text-foreground">leaving the page</span> and{" "}
                            <span className="font-medium text-foreground">exiting fullscreen</span>, not cursor position.
                            Camera is optional if your browser allows it.
                        </p>
                        <Button type="button" onClick={enterFullscreen} className="w-full gap-2">
                            <Maximize className="h-4 w-4" /> Enter fullscreen to continue
                        </Button>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {showWarning && (
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        className="fixed bottom-8 left-1/2 z-[60] flex w-full max-w-md -translate-x-1/2 items-start gap-3 rounded-xl border border-destructive/30 bg-destructive p-4 text-destructive-foreground shadow-elevated"
                    >
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                        <div className="min-w-0 flex-1 text-left">
                            <p className="text-sm font-bold">Integrity notice</p>
                            <p className="text-xs opacity-95">{showWarning}</p>
                        </div>
                        <button
                            type="button"
                            className="rounded p-1 hover:bg-white/10"
                            onClick={() => setShowWarning(null)}
                            aria-label="Dismiss warning"
                        >
                            <span className="sr-only">Dismiss</span>
                            <AlertCircle className="h-4 w-4 opacity-70" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
