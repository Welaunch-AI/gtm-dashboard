"use client";

import { CSSProperties } from "react";

// Inject shimmer keyframes once into the document
if (typeof document !== "undefined") {
  const id = "__skeleton_shimmer_style__";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes skeletonShimmer {
        0%   { background-position: -600px 0; }
        100% { background-position: 600px 0; }
      }
      .skeleton-shimmer {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 600px 100%;
        animation: skeletonShimmer 1.4s ease-in-out infinite;
        border-radius: 6px;
      }
    `;
    document.head.appendChild(style);
  }
}

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: CSSProperties;
}

/** A single shimmer-animated placeholder block. */
export function Skeleton({ width = "100%", height = 16, borderRadius = 6, style }: SkeletonProps) {
  return (
    <div
      className="skeleton-shimmer"
      style={{ width, height, borderRadius, flexShrink: 0, ...style }}
    />
  );
}

/** A row of skeleton cells that mimics a table row. */
export function SkeletonRow({ cols = 5, height = 14 }: { cols?: number; height?: number }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 16,
      padding: "14px 20px",
      alignItems: "center",
      borderBottom: "1px solid #f3f4f6",
    }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} height={height} width={i === 0 ? "60%" : i === cols - 1 ? "40%" : "80%"} />
      ))}
    </div>
  );
}

/** Skeleton for a stat/metric card. */
export function SkeletonCard() {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: "18px 20px",
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}>
      <Skeleton width={40} height={40} borderRadius={10} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <Skeleton width="50%" height={11} />
        <Skeleton width="35%" height={22} />
      </div>
    </div>
  );
}

/** A full table skeleton: header placeholder + N rows. */
export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
      {/* Header bar */}
      <div style={{
        padding: "12px 20px",
        borderBottom: "1px solid #f3f4f6",
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 16,
        background: "#f9fafb",
      }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={11} width={i === 0 ? "50%" : "60%"} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
}

/** Skeleton for a list of call/activity items. */
export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 20px",
          borderBottom: i < rows - 1 ? "1px solid #f3f4f6" : "none",
        }}>
          <Skeleton width={36} height={36} borderRadius={10} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton width="45%" height={13} />
            <Skeleton width="65%" height={11} />
          </div>
          <Skeleton width={80} height={26} borderRadius={999} />
          <Skeleton width={90} height={30} borderRadius={8} />
        </div>
      ))}
    </div>
  );
}

/** Full-page centered spinner with pulsing ring. */
export function LoadingSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 80,
      gap: 16,
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "3px solid #e5e7eb",
        borderTopColor: "#111827",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: 14, color: "#9ca3af", fontWeight: 500 }}>{label}</span>
    </div>
  );
}
