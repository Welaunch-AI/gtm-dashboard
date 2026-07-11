"use client";

import { useRef, useState } from "react";
import AvatarImage from "@/components/ui/AvatarImage";
import { validateImageFile } from "@/lib/storage-images";

type Props = {
  imageUrl: string | null;
  label: string;
  size?: number;
  radius?: number | string;
  background?: string;
  uploading?: boolean;
  disabled?: boolean;
  helperText?: string;
  uploadLabel?: string;
  removeLabel?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
};

export default function ImageUploadField({
  imageUrl,
  label,
  size = 64,
  radius = "50%",
  background = "#111827",
  uploading = false,
  disabled = false,
  helperText,
  uploadLabel = "Upload photo",
  removeLabel = "Remove",
  onUpload,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function handleFile(file: File | null) {
    if (!file || disabled || uploading) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    try {
      await onUpload(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <AvatarImage
          src={imageUrl}
          label={label}
          size={size}
          radius={radius}
          background={background}
        />
        {!disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            title={uploadLabel}
            style={{
              position: "absolute",
              right: -4,
              bottom: -4,
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "2px solid #fff",
              background: "#111827",
              color: "#fff",
              cursor: uploading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: uploading ? 0.6 : 1,
            }}
          >
            <CameraIcon />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: "none" }}
          onChange={(e) => {
            void handleFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        {helperText && (
          <p style={{ fontSize: 12.5, color: "#6b7280", margin: "0 0 8px", lineHeight: 1.45 }}>
            {helperText}
          </p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!disabled && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={btnSecondary}
            >
              {uploading ? "Uploading…" : uploadLabel}
            </button>
          )}
          {imageUrl && onRemove && !disabled && (
            <button
              type="button"
              onClick={() => void onRemove()}
              disabled={uploading}
              style={btnDanger}
            >
              {removeLabel}
            </button>
          )}
        </div>
        {error && <p style={{ fontSize: 12, color: "#dc2626", margin: "8px 0 0" }}>{error}</p>}
      </div>
    </div>
  );
}

const btnSecondary: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#374151",
  fontSize: 12.5,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 8,
  border: "1px solid #fecaca",
  background: "#fff5f5",
  color: "#dc2626",
  fontSize: 12.5,
  cursor: "pointer",
};

function CameraIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
