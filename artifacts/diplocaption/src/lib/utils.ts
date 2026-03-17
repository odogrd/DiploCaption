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
