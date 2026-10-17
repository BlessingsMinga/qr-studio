"use client";

import * as React from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import {
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
} from "@zxing/library";
import { toast } from "sonner";
import {
  Camera,
  CameraOff,
  Upload,
  Zap,
  ZapOff,
  SwitchCamera,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { classifyContent } from "@/lib/qr/types";

interface QrScannerProps {
  onScan: (result: {
    text: string;
    format: string;
  }) => void;
}

interface DeviceOption {
  deviceId: string;
  label: string;
}

export function QrScanner({ onScan }: QrScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsRef = React.useRef<IScannerControls | null>(null);
  const readerRef = React.useRef<BrowserMultiFormatReader | null>(null);
  const lastResultRef = React.useRef<{ text: string; ts: number } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isScanning, setIsScanning] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);
  const [devices, setDevices] = React.useState<DeviceOption[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = React.useState<
    string | undefined
  >(undefined);
  const [hasTorch, setHasTorch] = React.useState(false);
  const [torchOn, setTorchOn] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastScan, setLastScan] = React.useState<{
    text: string;
    format: string;
    ts: number;
  } | null>(null);

  // Build the reader once
  React.useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.AZTEC,
      BarcodeFormat.PDF_417,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.CODABAR,
      BarcodeFormat.ITF,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.RSS_14,
      BarcodeFormat.RSS_EXPANDED,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    readerRef.current = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 200,
      delayBetweenScanSuccess: 800,
    });

    // Enumerate devices
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devs) => {
        const opts = devs.map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
        setDevices(opts);
        if (opts.length > 0) {
          // Prefer back camera by label heuristic
          const back =
            opts.find((o) =>
              /back|rear|environment|后置|背面/i.test(o.label)
            ) ?? opts[0];
          setCurrentDeviceId(back.deviceId);
        }
      })
      .catch(() => {
        // Will retry after permission granted
      });

    return () => {
      stopScanning();
    };
     
  }, []);

  async function refreshDevices() {
    try {
      const devs = await BrowserMultiFormatReader.listVideoInputDevices();
      const opts = devs.map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${i + 1}`,
      }));
      setDevices(opts);
    } catch {
      /* ignore */
    }
  }

  async function startScanning(deviceId?: string) {
    if (!readerRef.current || !videoRef.current) return;
    setError(null);
    setIsStarting(true);
    try {
      // Ensure we have device list (may require permission first)
      if (devices.length === 0) {
        await refreshDevices();
      }

      const id = deviceId ?? currentDeviceId ?? undefined;

      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        id,
        videoRef.current,
        (result, err, controls) => {
          if (result) {
            const text = result.getText();
            const now = Date.now();
            // Debounce duplicate results within 2.5s
            if (
              lastResultRef.current &&
              lastResultRef.current.text === text &&
              now - lastResultRef.current.ts < 2500
            ) {
              return;
            }
            lastResultRef.current = { text, ts: now };
            const format = result.getBarcodeFormat().toString();
            setLastScan({ text, format, ts: now });
            onScan({ text, format });
            // Brief haptic feedback
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(60);
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            // Non-critical; ignore
          }
          // Detect torch capability
          const track =
            controls?.stream?.getVideoTracks?.()?.[0] as
              | MediaStreamTrack
              | undefined;
          if (track) {
            const caps = (
              track.getCapabilities as (() => MediaTrackCapabilities) | undefined
            )?.call(track);
            const torchCapable = Boolean(
              caps && "torch" in caps && (caps as { torch?: boolean }).torch
            );
            setHasTorch(torchCapable);
          }
        }
      );
      setIsScanning(true);
    } catch (e) {
      console.error(e);
      const msg =
        e instanceof Error ? e.message : "Failed to start camera";
      setError(
        /permission|denied|notallowed/i.test(msg)
          ? "Camera permission denied. Please allow camera access and try again."
          : msg
      );
      toast.error("Could not start camera");
    } finally {
      setIsStarting(false);
    }
  }

  function stopScanning() {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  }

  async function toggleTorch() {
    if (!controlsRef.current) return;
    const track = controlsRef.current.stream?.getVideoTracks?.()?.[0];
    if (!track) return;
    const cap = track.getCapabilities?.();
    if (!cap || !("torch" in cap)) return;
    try {
      const next = !torchOn;
      // @ts-expect-error torch is a capability-based constraint
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      toast.error("Torch not available");
    }
  }

  async function switchCamera() {
    if (devices.length < 2) {
      toast.info("Only one camera detected");
      return;
    }
    const idx = devices.findIndex(
      (d) => d.deviceId === currentDeviceId
    );
    const next = devices[(idx + 1) % devices.length];
    stopScanning();
    setCurrentDeviceId(next.deviceId);
    await startScanning(next.deviceId);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const url = URL.createObjectURL(file);
      const reader = readerRef.current ?? new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(url);
      const text = result.getText();
      const format = result.getBarcodeFormat().toString();
      setLastScan({ text, format, ts: Date.now() });
      onScan({ text, format });
      toast.success("Code detected from image");
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No QR/barcode found in that image");
    } finally {
      // reset input so the same file can be re-selected
      e.target.value = "";
    }
  }

  const lastCategory = lastScan ? classifyContent(lastScan.text) : null;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-2 border-dashed border-emerald-200 dark:border-emerald-900/50 bg-slate-950/40">
        <CardContent className="p-0">
          <div className="relative aspect-[4/3] w-full bg-black sm:aspect-video">
            <video
              ref={videoRef}
              className={cn(
                "h-full w-full object-cover",
                !isScanning && "opacity-0"
              )}
              autoPlay
              playsInline
              muted
            />
            {/* Scanning overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-3/5 w-4/5 max-w-md">
                <div className="absolute left-0 top-0 h-10 w-10 border-l-4 border-t-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute right-0 top-0 h-10 w-10 border-r-4 border-t-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                {/* Animated scan line */}
                {isScanning && (
                  <div className="absolute inset-x-4 top-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_2px_rgba(16,185,129,0.7)] animate-[scan_2s_ease-in-out_infinite]" />
                )}
              </div>
            </div>

            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
                <Camera className="h-12 w-12 text-emerald-400/70" />
                <p className="text-sm">
                  {isStarting
                    ? "Starting camera..."
                    : "Camera is off. Press Start to scan."}
                </p>
              </div>
            )}

            {/* Top-right controls */}
            {isScanning && (
              <div className="absolute right-3 top-3 flex gap-2">
                {hasTorch && (
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={toggleTorch}
                    className="h-9 w-9 bg-black/50 text-white hover:bg-black/70"
                    aria-label={torchOn ? "Turn off torch" : "Turn on torch"}
                  >
                    {torchOn ? (
                      <ZapOff className="h-4 w-4" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {devices.length > 1 && (
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={switchCamera}
                    className="h-9 w-9 bg-black/50 text-white hover:bg-black/70"
                    aria-label="Switch camera"
                  >
                    <SwitchCamera className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={stopScanning}
                  className="h-9 w-9 bg-black/50 text-white hover:bg-black/70"
                  aria-label="Stop scanning"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Status badge */}
            {isScanning && (
              <div className="absolute left-3 top-3">
                <Badge
                  variant="secondary"
                  className="gap-1.5 bg-black/50 text-white"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Scanning...
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {!isScanning ? (
          <Button
            onClick={() => startScanning()}
            disabled={isStarting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isStarting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {isStarting ? "Starting..." : "Start Camera"}
          </Button>
        ) : (
          <Button
            onClick={stopScanning}
            variant="destructive"
            className="flex-1"
          >
            <CameraOff className="h-4 w-4" />
            Stop Camera
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1"
        >
          <Upload className="h-4 w-4" />
          Upload Image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Last scan result preview */}
      {lastScan && lastCategory && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                >
                  {lastScan.format}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                >
                  {lastCategory.label}
                </Badge>
              </div>
              <p className="break-all text-sm font-medium text-foreground line-clamp-3">
                {lastScan.text}
              </p>
              {lastCategory.href && (
                <a
                  href={lastCategory.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  Open {lastCategory.label} →
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
