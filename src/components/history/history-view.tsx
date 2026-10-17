"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Trash2,
  Star,
  Search,
  QrCode,
  ScanLine,
  Copy,
  ExternalLink,
  Inbox,
  Filter,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ShareMenu } from "@/components/share-menu";
import {
  HistoryItem,
  HistoryType,
  classifyContent,
} from "@/lib/qr/types";
import { cn } from "@/lib/utils";

interface HistoryViewProps {
  refreshKey: number;
  onChange: () => void;
}

type FilterType = HistoryType | "all" | "favorite";

export function HistoryView({ refreshKey, onChange }: HistoryViewProps) {
  const [items, setItems] = React.useState<HistoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<FilterType>("all");
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  // debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const fetchItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "scan" || filter === "generated") {
        params.set("type", filter);
      }
      if (debouncedQuery) params.set("q", debouncedQuery);
      const res = await fetch(`/api/scans?${params.toString()}`);
      const json = await res.json();
      let list: HistoryItem[] = json.items || [];
      if (filter === "favorite") {
        list = list.filter((i) => i.isFavorite);
      }
      setItems(list);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [filter, debouncedQuery, refreshKey]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function deleteItem(id: string) {
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/scans/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Deleted");
      onChange();
    } catch {
      setItems(prev);
      toast.error("Failed to delete");
    }
  }

  async function toggleFavorite(id: string, current: boolean) {
    const prev = items;
    setItems((cur) =>
      cur.map((i) => (i.id === id ? { ...i, isFavorite: !current } : i))
    );
    try {
      const res = await fetch(`/api/scans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !current }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems(prev);
      toast.error("Failed to update");
    }
  }

  async function copyContent(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Failed to copy");
    }
  }

  async function clearAll() {
    try {
      const params = new URLSearchParams();
      if (filter === "scan" || filter === "generated") {
        params.set("type", filter);
      }
      const res = await fetch(`/api/scans?${params.toString()}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("History cleared");
      fetchItems();
      onChange();
    } catch {
      toast.error("Failed to clear history");
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search history..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as FilterType)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-4 sm:w-auto">
            <TabsTrigger value="all">
              <Filter className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">All</span>
            </TabsTrigger>
            <TabsTrigger value="scan">
              <ScanLine className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Scanned</span>
            </TabsTrigger>
            <TabsTrigger value="generated">
              <QrCode className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Created</span>
            </TabsTrigger>
            <TabsTrigger value="favorite">
              <Star className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Starred</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {items.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete{" "}
                  {filter === "all" ? "all history" : `all ${filter} items`}. This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium">No history yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Scan codes with your camera or create your own QR codes. They'll
              appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-[calc(100vh-22rem)] space-y-2 overflow-y-auto scrollbar-emerald pr-1">
          {items.map((item) => {
            const cat = classifyContent(item.content);
            return (
              <Card
                key={item.id}
                className={cn(
                  "group transition-colors hover:bg-accent/40",
                  item.isFavorite && "border-amber-300/60 dark:border-amber-700/50"
                )}
              >
                <CardContent className="flex items-start gap-3 p-3 sm:p-4">
                  {/* Thumbnail / type icon */}
                  <div className="shrink-0">
                    {item.imageData ? (
                       
                      <img
                        src={item.imageData}
                        alt="QR code"
                        className="h-14 w-14 rounded-md border bg-white object-contain sm:h-16 sm:w-16"
                      />
                    ) : (
                      <div
                        className={cn(
                          "flex h-14 w-14 items-center justify-center rounded-md border sm:h-16 sm:w-16",
                          item.type === "scan"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400"
                        )}
                      >
                        {item.type === "scan" ? (
                          <ScanLine className="h-6 w-6" />
                        ) : (
                          <QrCode className="h-6 w-6" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          item.type === "scan"
                            ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                            : "border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-400"
                        )}
                      >
                        {item.type === "scan" ? "Scanned" : "Created"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {cat.label}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {item.format}
                      </Badge>
                    </div>
                    <p className="break-all text-sm font-medium line-clamp-2">
                      {item.content}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleFavorite(item.id, item.isFavorite)}
                        title={item.isFavorite ? "Unstar" : "Star"}
                      >
                        <Star
                          className={cn(
                            "h-4 w-4",
                            item.isFavorite
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground"
                          )}
                        />
                      </Button>
                      <ShareMenu item={item} triggerSize="icon" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteItem(item.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => copyContent(item.content)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </Button>
                      {cat.href && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                          <a
                            href={cat.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
