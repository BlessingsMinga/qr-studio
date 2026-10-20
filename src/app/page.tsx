"use client";

import * as React from "react";
import { toast, Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";
import {
  QrCode as QrCodeIcon,
  ScanLine,
  History,
  Github,
  Sun,
  Moon,
  ShieldCheck,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrScanner } from "@/components/scanner/qr-scanner";
import { QrGenerator } from "@/components/generator/qr-generator";
import { HistoryView } from "@/components/history/history-view";
import { decodeSharePayload } from "@/lib/qr/share";

export default function Home() {
  const [activeTab, setActiveTab] = React.useState<
    "scanner" | "generator" | "history"
  >("scanner");
  const [historyRefresh, setHistoryRefresh] = React.useState(0);
  const [scannerCount, setScannerCount] = React.useState(0);
  const [sharePreview, setSharePreview] = React.useState<{
    content: string;
    format: string;
  } | null>(null);

  const refreshHistory = React.useCallback(() => {
    setHistoryRefresh((n) => n + 1);
  }, []);

  // Handle shared link payload (?share=...)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const share = params.get("share");
    if (share) {
      const payload = decodeSharePayload(share);
      if (payload) {
        setSharePreview({
          content: payload.c,
          format: payload.f,
        });
      }
      // Clean the URL
      const url = new URL(window.location.href);
      url.searchParams.delete("share");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  async function handleScan(result: { text: string; format: string }) {
    setScannerCount((c) => c + 1);
    toast.success("Code scanned!", {
      description: result.text.length > 60
        ? result.text.slice(0, 60) + "..."
        : result.text,
    });
    // Persist to history
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "scan",
          format: result.format,
          content: result.text,
        }),
      });
      if (res.ok) {
        refreshHistory();
      }
    } catch {
      /* non-fatal */
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/10">
      <ToasterWrapper />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <QrCodeIcon className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold tracking-tight sm:text-base">
                QR Studio
              </h1>
              <p className="hidden text-[10px] text-muted-foreground sm:block">
                Scan • Create • Share
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="hidden bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 sm:inline-flex"
            >
              <ShieldCheck className="mr-1 h-3 w-3" />
              Runs locally
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {/* Hero */}
        <div className="mb-6 text-center sm:mb-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Your all-in-one{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              QR & Barcode
            </span>{" "}
            toolkit
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            Scan QR codes and barcodes with your camera, create custom QR codes
            with branding, and share them instantly. Everything is saved to your
            history.
          </p>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            setActiveTab(v as "scanner" | "generator" | "history")
          }
          className="w-full"
        >
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="scanner" className="gap-1.5">
                <ScanLine className="h-4 w-4" />
                Scanner
                {scannerCount > 0 && (
                  <span className="ml-1 rounded-full bg-emerald-100 px-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    {scannerCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="generator" className="gap-1.5">
                <QrCodeIcon className="h-4 w-4" />
                Create
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="scanner" className="mt-6">
            <div className="mx-auto max-w-2xl">
              <QrScanner onScan={handleScan} />
            </div>
          </TabsContent>

          <TabsContent value="generator" className="mt-6">
            <QrGenerator onSaved={refreshHistory} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <HistoryView
              refreshKey={historyRefresh}
              onChange={refreshHistory}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Scans are processed on your device. History stored locally.
          </p>
          <p>
            Built with Next.js • Powered by{" "}
            <span className="font-medium text-foreground">ZXing</span> &{" "}
            <span className="font-medium text-foreground">qrcode</span>
          </p>
        </div>
      </footer>

      {/* Shared link preview modal */}
      {sharePreview && (
        <SharedPreviewModal
          content={sharePreview.content}
          format={sharePreview.format}
          onClose={() => setSharePreview(null)}
        />
      )}
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-9 w-9"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}

function ToasterWrapper() {
  return <SonnerToaster position="top-center" richColors closeButton />;
}

function SharedPreviewModal({
  content,
  format,
  onClose,
}: {
  content: string;
  format: string;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = React.useState<string>("");
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const d = await QRCode.toDataURL(content, {
          width: 320,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        if (!cancelled) setDataUrl(d);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [content]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 text-center">
          <h3 className="text-lg font-semibold">Shared QR Code</h3>
          <p className="text-xs text-muted-foreground">
            Format: {format}
          </p>
        </div>
        {dataUrl && (
           
          <img
            src={dataUrl}
            alt="Shared QR code"
            className="mx-auto mb-4 h-56 w-56 rounded-lg border"
          />
        )}
        <p className="mb-4 break-all rounded-md bg-muted p-2 text-xs">
          {content}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(content);
                toast.success("Copied");
              } catch {
                toast.error("Failed to copy");
              }
            }}
          >
            Copy text
          </Button>
          <Button
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
