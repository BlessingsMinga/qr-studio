"use client";

import * as React from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  Download,
  Save,
  Link2,
  Mail,
  Phone,
  MessageSquare,
  Wifi,
  User,
  Type,
  Palette,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  buildContent,
  ContentType,
  DEFAULT_GENERATOR_OPTIONS,
  GeneratorOptions,
} from "@/lib/qr/types";

interface QrGeneratorProps {
  onSaved: () => void;
}

const CONTENT_TYPES: { value: ContentType; label: string; icon: React.ElementType }[] = [
  { value: "text", label: "Text", icon: Type },
  { value: "url", label: "URL", icon: Link2 },
  { value: "email", label: "Email", icon: Mail },
  { value: "phone", label: "Phone", icon: Phone },
  { value: "sms", label: "SMS", icon: MessageSquare },
  { value: "wifi", label: "WiFi", icon: Wifi },
  { value: "vcard", label: "Contact", icon: User },
];

const COLOR_PRESETS = [
  { name: "Slate", dark: "#0f172a", light: "#ffffff" },
  { name: "Emerald", dark: "#059669", light: "#ffffff" },
  { name: "Rose", dark: "#e11d48", light: "#ffffff" },
  { name: "Amber", dark: "#d97706", light: "#ffffff" },
  { name: "Violet", dark: "#7c3aed", light: "#ffffff" },
  { name: "Teal", dark: "#0d9488", light: "#ffffff" },
  { name: "Inverted", dark: "#ffffff", light: "#0f172a" },
];

export function QrGenerator({ onSaved }: QrGeneratorProps) {
  const [activeType, setActiveType] = React.useState<ContentType>("url");
  const [data, setData] = React.useState<Record<string, string>>({
    url: "",
  });
  const [options, setOptions] = React.useState<GeneratorOptions>(
    DEFAULT_GENERATOR_OPTIONS
  );
  const [dataUrl, setDataUrl] = React.useState<string>("");
  const [svgString, setSvgString] = React.useState<string>("");
  const [generating, setGenerating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const previewRef = React.useRef<HTMLCanvasElement>(null);

  const content = React.useMemo(
    () => buildContent(activeType, data),
    [activeType, data]
  );

  // Regenerate QR whenever content or options change
  React.useEffect(() => {
    let cancelled = false;
    async function gen() {
      if (!content) {
        setDataUrl("");
        setSvgString("");
        if (previewRef.current) {
          const ctx = previewRef.current.getContext("2d");
          ctx?.clearRect(
            0,
            0,
            previewRef.current.width,
            previewRef.current.height
          );
        }
        return;
      }
      setGenerating(true);
      try {
        const [d, svg] = await Promise.all([
          QRCode.toDataURL(content, {
            errorCorrectionLevel: options.errorCorrectionLevel,
            margin: options.margin,
            width: options.width,
            color: {
              dark: options.dark,
              light: options.light,
            },
          }),
          QRCode.toString(content, {
            type: "svg",
            errorCorrectionLevel: options.errorCorrectionLevel,
            margin: options.margin,
            width: options.width,
            color: {
              dark: options.dark,
              light: options.light,
            },
          }),
        ]);
        if (cancelled) return;
        setDataUrl(d);
        setSvgString(svg);
        // Draw onto canvas for crisp preview at any size
        if (previewRef.current) {
          const canvas = previewRef.current;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const img = new Image();
            img.onload = () => {
              if (cancelled) return;
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = d;
          }
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to generate QR code");
      } finally {
        if (!cancelled) setGenerating(false);
      }
    }
    gen();
    return () => {
      cancelled = true;
    };
  }, [content, options]);

  function setField(key: string, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function switchType(t: ContentType) {
    setActiveType(t);
    if (!(t in data)) {
      setData((prev) => ({ ...prev, [t]: "" }));
    }
  }

  function applyPreset(p: (typeof COLOR_PRESETS)[number]) {
    setOptions((prev) => ({ ...prev, dark: p.dark, light: p.light }));
  }

  async function downloadPng() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${activeType}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Downloaded PNG");
  }

  function downloadSvg() {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${activeType}-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Downloaded SVG");
  }

  async function copyImage() {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        "write" in navigator.clipboard
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
        toast.success("Image copied to clipboard");
      } else {
        throw new Error("Clipboard image API not supported");
      }
    } catch {
      toast.error("Could not copy image. Try downloading instead.");
    }
  }

  async function saveToHistory() {
    if (!content || !dataUrl) {
      toast.error("Nothing to save yet");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "generated",
          format: "QR_CODE",
          content,
          options: JSON.stringify(options),
          imageData: dataUrl,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      toast.success("Saved to history");
      onSaved();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: form */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div>
            <Label className="mb-2 block text-sm font-medium">Content Type</Label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {CONTENT_TYPES.map((t) => {
                const Icon = t.icon;
                const active = activeType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => switchType(t.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Dynamic form fields per content type */}
          <div className="space-y-3">
            {activeType === "text" && (
              <div className="space-y-2">
                <Label htmlFor="text">Text</Label>
                <Textarea
                  id="text"
                  placeholder="Enter any text..."
                  value={data.text || ""}
                  onChange={(e) => setField("text", e.target.value)}
                  rows={4}
                />
              </div>
            )}

            {activeType === "url" && (
              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={data.url || ""}
                  onChange={(e) => setField("url", e.target.value)}
                />
              </div>
            )}

            {activeType === "email" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={data.email || ""}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject (optional)</Label>
                    <Input
                      id="subject"
                      placeholder="Subject"
                      value={data.subject || ""}
                      onChange={(e) => setField("subject", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body">Body (optional)</Label>
                    <Input
                      id="body"
                      placeholder="Message..."
                      value={data.body || ""}
                      onChange={(e) => setField("body", e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {activeType === "phone" && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 890"
                  value={data.phone || ""}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>
            )}

            {activeType === "sms" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sms-phone">Phone Number</Label>
                  <Input
                    id="sms-phone"
                    type="tel"
                    placeholder="+1 234 567 890"
                    value={data.phone || ""}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sms-msg">Message</Label>
                  <Textarea
                    id="sms-msg"
                    placeholder="Your SMS message..."
                    value={data.message || ""}
                    onChange={(e) => setField("message", e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}

            {activeType === "wifi" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ssid">Network Name (SSID)</Label>
                  <Input
                    id="ssid"
                    placeholder="MyWiFi"
                    value={data.ssid || ""}
                    onChange={(e) => setField("ssid", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="text"
                    placeholder="Password"
                    value={data.password || ""}
                    onChange={(e) => setField("password", e.target.value)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="encryption">Encryption</Label>
                    <Select
                      value={data.encryption || "WPA"}
                      onValueChange={(v) => setField("encryption", v)}
                    >
                      <SelectTrigger id="encryption">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WPA">WPA/WPA2</SelectItem>
                        <SelectItem value="WEP">WEP</SelectItem>
                        <SelectItem value="nopass">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hidden">Hidden Network</Label>
                    <Select
                      value={data.hidden || "false"}
                      onValueChange={(v) => setField("hidden", v)}
                    >
                      <SelectTrigger id="hidden">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {activeType === "vcard" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vc-name">Full Name</Label>
                    <Input
                      id="vc-name"
                      placeholder="John Doe"
                      value={data.name || ""}
                      onChange={(e) => setField("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vc-phone">Phone</Label>
                    <Input
                      id="vc-phone"
                      type="tel"
                      placeholder="+1 234 567 890"
                      value={data.phone || ""}
                      onChange={(e) => setField("phone", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vc-email">Email</Label>
                    <Input
                      id="vc-email"
                      type="email"
                      placeholder="name@example.com"
                      value={data.email || ""}
                      onChange={(e) => setField("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vc-org">Organization</Label>
                    <Input
                      id="vc-org"
                      placeholder="Company Inc."
                      value={data.org || ""}
                      onChange={(e) => setField("org", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vc-url">Website</Label>
                  <Input
                    id="vc-url"
                    placeholder="https://example.com"
                    value={data.url || ""}
                    onChange={(e) => setField("url", e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Styling options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-emerald-600" />
              <h4 className="text-sm font-medium">Appearance</h4>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Color presets</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                    title={p.name}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-sm border"
                      style={{
                        background: `linear-gradient(135deg, ${p.dark} 50%, ${p.light} 50%)`,
                      }}
                    />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dark" className="text-xs">
                  Foreground
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="dark"
                    type="color"
                    value={options.dark}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, dark: e.target.value }))
                    }
                    className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                  />
                  <Input
                    value={options.dark}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, dark: e.target.value }))
                    }
                    className="h-8 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="light" className="text-xs">
                  Background
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="light"
                    type="color"
                    value={options.light}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, light: e.target.value }))
                    }
                    className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                  />
                  <Input
                    value={options.light}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, light: e.target.value }))
                    }
                    className="h-8 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Size</Label>
                <span className="text-xs text-muted-foreground">
                  {options.width}px
                </span>
              </div>
              <Slider
                value={[options.width]}
                min={128}
                max={1024}
                step={32}
                onValueChange={(v) =>
                  setOptions((prev) => ({ ...prev, width: v[0] }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Error Correction</Label>
              <Tabs
                value={options.errorCorrectionLevel}
                onValueChange={(v) =>
                  setOptions(
                    (prev) =>
                      ({ ...prev, errorCorrectionLevel: v }) as GeneratorOptions
                  )
                }
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="L">Low</TabsTrigger>
                  <TabsTrigger value="M">Medium</TabsTrigger>
                  <TabsTrigger value="Q">High</TabsTrigger>
                  <TabsTrigger value="H">Max</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Margin</Label>
                <span className="text-xs text-muted-foreground">
                  {options.margin}
                </span>
              </div>
              <Slider
                value={[options.margin]}
                min={0}
                max={8}
                step={1}
                onValueChange={(v) =>
                  setOptions((prev) => ({ ...prev, margin: v[0] }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right: preview & actions */}
      <Card>
        <CardContent className="flex h-full flex-col items-center justify-start gap-4 p-4 sm:p-6">
          <div className="relative flex aspect-square w-full max-w-xs items-center justify-center rounded-xl border-2 border-dashed border-border bg-white p-4">
            {content ? (
              <>
                {dataUrl && (
                  <img
                    src={dataUrl}
                    alt="Generated QR code"
                    className="h-full w-full object-contain"
                  />
                )}
                {generating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                <Palette className="h-8 w-8" />
                <p className="text-sm">
                  Fill in the form to generate your QR code
                </p>
              </div>
            )}
            <canvas ref={previewRef} className="hidden" width={options.width} height={options.width} />
          </div>

          {content && (
            <div className="w-full max-w-xs">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Encoded content
              </p>
              <p className="break-all rounded-md bg-muted p-2 text-xs line-clamp-4">
                {content}
              </p>
            </div>
          )}

          <div className="flex w-full max-w-xs flex-col gap-2">
            <Button
              onClick={saveToHistory}
              disabled={!content || saving}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save to History"}
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={downloadPng}
                disabled={!content}
              >
                <Download className="h-4 w-4" />
                PNG
              </Button>
              <Button
                variant="outline"
                onClick={downloadSvg}
                disabled={!content}
              >
                <Download className="h-4 w-4" />
                SVG
              </Button>
              <Button
                variant="outline"
                onClick={copyImage}
                disabled={!content}
              >
                <Palette className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
