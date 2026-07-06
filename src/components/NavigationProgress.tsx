"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const raf = useRef<number | null>(null);
  const prev = useRef(pathname + searchParams.toString());

  useEffect(() => {
    const current = pathname + searchParams.toString();
    if (current === prev.current) return;
    prev.current = current;

    // Navigation completed — race to 100 and fade out
    setVisible(true);
    setProgress(p => Math.max(p, 70));

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setProgress(100);
      timer.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }, 120);
  }, [pathname, searchParams]);

  // Simulate incremental progress while waiting
  useEffect(() => {
    if (!visible || progress >= 90) return;
    raf.current = setTimeout(() => {
      setProgress(p => Math.min(p + (90 - p) * 0.12, 90));
    }, 80) as unknown as number;
    return () => { if (raf.current) clearTimeout(raf.current); };
  }, [visible, progress]);

  if (!visible && progress === 0) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      zIndex: 9999,
      pointerEvents: "none",
    }}>
      <div style={{
        height: "100%",
        width: `${progress}%`,
        background: "linear-gradient(90deg, #111827, #6366f1)",
        borderRadius: "0 2px 2px 0",
        transition: progress === 100
          ? "width 0.2s ease, opacity 0.3s ease"
          : "width 0.4s cubic-bezier(0.4,0,0.2,1)",
        opacity: progress === 100 ? 0 : 1,
        boxShadow: "0 0 8px rgba(99,102,241,0.6)",
      }} />
    </div>
  );
}
