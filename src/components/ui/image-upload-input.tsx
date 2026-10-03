"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ImageIcon,
  Upload,
  Link as LinkIcon,
  Trash2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface ImageUploadInputProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
  description?: string;
}

export function ImageUploadInput({
  value,
  onChange,
  label = "Question Image (Optional)",
  description = "Upload a graph, diagram, or formula image, or paste an image URL.",
}: ImageUploadInputProps) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getImageUrl = useMutation(api.files.getImageUrl);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g., 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file must be under 10MB");
      return;
    }

    setIsUploading(true);
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const { storageId } = await result.json();
      const directUrl = await getImageUrl({ storageId });

      if (!directUrl) {
        throw new Error("Failed to retrieve image URL");
      }

      onChange(directUrl);
      toast.success("Image uploaded successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload image",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSetUrl() {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput("");
    toast.success("Image URL attached");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(undefined)}
            className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10 gap-1"
          >
            <Trash2 className="size-3" /> Remove Image
          </Button>
        )}
      </div>

      {value ? (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <div className="relative group max-h-52 w-full overflow-hidden rounded-md border bg-black/5 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Question illustration"
              className="max-h-52 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span className="truncate max-w-xs font-mono text-[11px]">
              {value}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:underline text-primary"
              >
                <ExternalLink className="size-3" /> View full image
              </a>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[11px] px-2"
                onClick={() => onChange(undefined)}
              >
                Change
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/10 p-3 space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <Button
              type="button"
              variant={tab === "upload" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setTab("upload")}
            >
              <Upload className="size-3" /> Upload File
            </Button>
            <Button
              type="button"
              variant={tab === "url" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setTab("url")}
            >
              <LinkIcon className="size-3" /> Paste URL
            </Button>
            <span className="text-[11px] text-muted-foreground ml-auto hidden sm:inline">
              {description}
            </span>
          </div>

          {tab === "upload" ? (
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className="border border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors flex flex-col items-center justify-center gap-1.5"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              {isUploading ? (
                <>
                  <Loader2 className="size-6 text-primary animate-spin" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Uploading image to storage…
                  </p>
                </>
              ) : (
                <>
                  <ImageIcon className="size-6 text-muted-foreground/60" />
                  <p className="text-xs font-medium">
                    Click or drag image file here (PNG, JPG, SVG, WebP)
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Max file size 10MB
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/graph.png or Google Drive direct link"
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSetUrl();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs shrink-0"
                onClick={handleSetUrl}
                disabled={!urlInput.trim()}
              >
                Add URL
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
