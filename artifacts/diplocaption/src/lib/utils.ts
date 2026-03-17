import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // Strip the data:image/...;base64, prefix
        resolve(reader.result.split(",")[1]);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

export type CompressResult = {
  base64: string;
  mediaType: "image/jpeg";
  compressedBytes: number;
  originalBytes: number;
};

const MAX_BYTES = 4.5 * 1024 * 1024;
const MAX_DIMENSION = 2048;

export function compressImage(file: File): Promise<CompressResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }

      // Cap initial dimensions at MAX_DIMENSION
      let width = img.width;
      let height = img.height;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const attempt = (w: number, h: number, quality: number): CompressResult => {
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1];
        return { base64, mediaType: "image/jpeg", compressedBytes: Math.round(base64.length * 0.75), originalBytes: file.size };
      };

      // Try quality steps at current dimensions first
      for (const q of [0.92, 0.85, 0.75, 0.65]) {
        const r = attempt(width, height, q);
        if (r.compressedBytes <= MAX_BYTES) { resolve(r); return; }
      }

      // Then shrink dimensions iteratively
      let scale = 0.85;
      while (scale >= 0.3) {
        const r = attempt(Math.round(width * scale), Math.round(height * scale), 0.85);
        if (r.compressedBytes <= MAX_BYTES) { resolve(r); return; }
        scale -= 0.15;
      }

      // Last resort
      resolve(attempt(Math.round(width * 0.3), Math.round(height * 0.3), 0.75));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createThumbnail(base64: string, mimeType: string, maxWidth = 300): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = `data:${mimeType};base64,${base64}`;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(base64); // Fallback to original if canvas fails
      
      const ratio = maxWidth / img.width;
      const width = maxWidth;
      const height = img.height * ratio;
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      const thumbDataUrl = canvas.toDataURL("image/jpeg", 0.7);
      resolve(thumbDataUrl.split(",")[1]);
    };
    img.onerror = () => resolve(base64); // Fallback to original if load fails
  });
}
