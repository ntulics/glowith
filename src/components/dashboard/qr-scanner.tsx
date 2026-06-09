"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, QrCode, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ScanResult = {
  bookingId: string;
  clientName: string;
  service: string;
  startsAt: string;
  checkInCode: string;
  checkedInAt?: string | null;
  bookingFor?: string;
  attendeeName?: string | null;
};

export function QrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);

  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    cancelAnimationFrame(animRef.current);
    setScanning(false);
  }

  async function startCamera() {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        scanLoop();
      }
    } catch {
      setCameraError("Camera access denied or not available. Use manual code entry.");
    }
  }

  function scanLoop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    // @ts-ignore — BarcodeDetector is newer API
    if ("BarcodeDetector" in window) {
      // @ts-ignore
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      detector.detect(canvas).then((codes: any[]) => {
        if (codes.length > 0) {
          const raw = codes[0].rawValue;
          stopCamera();
          processCode(raw);
          return;
        }
        animRef.current = requestAnimationFrame(scanLoop);
      }).catch(() => {
        animRef.current = requestAnimationFrame(scanLoop);
      });
    } else {
      // BarcodeDetector not supported - prompt manual entry
      stopCamera();
      setCameraError("QR scanning not supported in this browser. Use manual entry below.");
    }
  }

  async function processCode(code: string) {
    setError("");
    setResult(null);
    setChecking(true);
    try {
      const res = await fetch("/api/bookings/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, action: checkoutMode ? "checkout" : "checkin" })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not process check-in");
        return;
      }
      setResult(data.booking);
      setCheckedIn(true);
    } finally {
      setChecking(false);
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processCode(manualCode.trim().toUpperCase());
  }

  function reset() {
    setResult(null);
    setError("");
    setManualCode("");
    setCheckedIn(false);
    if (mode === "camera") startCamera();
  }

  useEffect(() => {
    if (open && mode === "camera") {
      startCamera();
    }
    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  function handleClose() {
    stopCamera();
    setOpen(false);
    setResult(null);
    setError("");
    setManualCode("");
    setCheckedIn(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-[var(--brand,#E85D2F)] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition"
      >
        <QrCode className="h-4 w-4" />
        Scan client QR
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 max-w-sm mx-auto rounded-3xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Check-in scanner</p>
                <h2 className="text-lg font-black">Scan client QR code</h2>
              </div>
              <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Mode + checkout toggle */}
              <div className="flex gap-2">
                <div className="flex gap-1 flex-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
                  {(["camera", "manual"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMode(m); setError(""); setResult(null); setCheckedIn(false); }}
                      className={cn(
                        "flex-1 rounded-lg py-1.5 text-xs font-bold transition",
                        mode === m ? "bg-white shadow text-gray-900" : "text-gray-500"
                      )}
                    >
                      {m === "camera" ? "Camera" : "Manual code"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCheckoutMode((v) => !v)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                    checkoutMode ? "bg-purple-600 border-purple-600 text-white" : "border-gray-200 text-gray-600"
                  )}
                >
                  {checkoutMode ? "Check-out" : "Check-in"}
                </button>
              </div>

              {/* Success result */}
              {checkedIn && result && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="font-black text-emerald-800">
                    {checkoutMode ? "Checked out!" : "Checked in!"}
                  </p>
                  <p className="text-sm font-semibold text-emerald-700 mt-1">
                    {result.attendeeName || result.clientName}
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">{result.service}</p>
                  {result.bookingFor === "CHILD" && (
                    <p className="mt-2 text-xs font-bold text-purple-700 bg-purple-50 rounded-lg px-3 py-1.5">
                      Child booking — {checkoutMode ? "collection confirmed" : "check-in recorded, QR required for checkout"}
                    </p>
                  )}
                  <button onClick={reset} className="mt-3 w-full rounded-xl bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                    Scan another
                  </button>
                </div>
              )}

              {/* Error */}
              {error && !checkedIn && (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-700">{error}</p>
                    <button onClick={reset} className="mt-2 text-xs font-semibold text-red-600 underline">Try again</button>
                  </div>
                </div>
              )}

              {checking && (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}

              {!checkedIn && !checking && (
                <>
                  {mode === "camera" && (
                    <div className="relative overflow-hidden rounded-2xl bg-gray-900 aspect-square">
                      {cameraError ? (
                        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                          <Camera className="h-10 w-10 text-gray-500 mb-3" />
                          <p className="text-sm text-gray-400">{cameraError}</p>
                        </div>
                      ) : (
                        <>
                          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                          <canvas ref={canvasRef} className="hidden" />
                          {scanning && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-48 h-48 border-2 border-white/60 rounded-2xl" />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {(mode === "manual" || cameraError) && (
                    <form onSubmit={handleManualSubmit} className="space-y-3">
                      <input
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        placeholder="Enter booking code"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-mono font-bold uppercase outline-none focus:border-gray-400"
                      />
                      <button
                        type="submit"
                        disabled={!manualCode.trim()}
                        className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                      >
                        {checkoutMode ? "Check out" : "Check in"}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
