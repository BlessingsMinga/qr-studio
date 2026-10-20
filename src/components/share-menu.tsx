"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Share2,
  Copy,
  Link as LinkIcon,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HistoryItem, classifyContent } from "@/lib/qr/types";
import { buildShareUrl } from "@/lib/qr/share";

interface ShareMenuProps {
  item: HistoryItem;
  children?: React.ReactNode;
  triggerClassName?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  triggerSize?: "default" | "sm" | "icon";
}

export function ShareMenu({
  item,
  children,
  triggerClassName,
  triggerVariant = "outline",
  triggerSize = "sm",
}: ShareMenuProps) {
  const [open, setOpen] = React.useState(false);

  const cat = classifyContent(item.content);
  const isGenerated = item.type === "generated";
  const hasImage = Boolean(item.imageData);

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(item.content);
      toast.success("Content copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }

  async function copyShareLink() {
    // Build a shareable link that encodes the content for others to view
    const url = buildShareUrl({ t: item.type, f: item.format, c: item.content });
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  }

  async function nativeShare() {
    const url = buildShareUrl({ t: item.type, f: item.format, c: item.content });
    const shareData: ShareData = {
      title: isGenerated ? "QR Code" : cat.label,
      text: item.content,
      url,
    };
    if (hasImage && item.imageData) {
      try {
        const blob = await (await fetch(item.imageData)).blob();
        const file = new File([blob], `qr-code-${item.id}.png`, {
          type: "image/png",
        });
        if (
          typeof navigator !== "undefined" &&
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            ...shareData,
            files: [file],
          });
          setOpen(false);
          return;
        }
      } catch {
        /* fall through to text share */
      }
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        setOpen(false);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        toast.error("Sharing failed");
      }
    } else {
      await copyShareLink();
    }
  }

  function downloadImage() {
    if (!item.imageData) return;
    const a = document.createElement("a");
    a.href = item.imageData;
    a.download = `qr-${item.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Image downloaded");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant={triggerVariant} size={triggerSize} className={triggerClassName}>
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-emerald-600" />
            Share this code
          </DialogTitle>
          <DialogDescription>
            Share the scanned content or generated QR code with others.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Preview */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            {hasImage ? (
               
              <img
                src={item.imageData!}
                alt="QR preview"
                className="h-16 w-16 rounded border object-contain"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
                {cat.label}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.content}</p>
              <p className="text-xs text-muted-foreground">{cat.label} • {item.format}</p>
            </div>
          </div>

          {/* Quick native share */}
          {typeof navigator !== "undefined" && navigator.share && (
            <Button
              onClick={nativeShare}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Share2 className="h-4 w-4" />
              Share via device...
            </Button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={copyContent}>
              <Copy className="h-4 w-4" />
              Copy text
            </Button>
            <Button variant="outline" onClick={copyShareLink}>
              <LinkIcon className="h-4 w-4" />
              Copy link
            </Button>
            {hasImage && (
              <Button variant="outline" onClick={downloadImage} className="col-span-2">
                <Download className="h-4 w-4" />
                Download QR image
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            The share link lets anyone open and view the content as a QR code.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
