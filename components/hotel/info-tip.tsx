"use client";

import type React from "react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InfoTip({
  title,
  children,
  ariaLabel,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const clampPos = (x: number, y: number) => {
    if (typeof window === "undefined") return { x, y };
    const maxX = Math.max(16, window.innerWidth - 280);
    const maxY = Math.max(16, window.innerHeight - 160);
    return {
      x: Math.min(x, maxX),
      y: Math.min(y, maxY),
    };
  };

  const updateFromAnchor = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const nextX = rect.right + 10;
    const nextY = isMobile ? rect.bottom + 8 : rect.top - 4;
    setPos(clampPos(nextX, nextY));
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className={`rounded-full text-muted-foreground hover:text-foreground ${className ?? ""}`}
        ref={btnRef}
        onMouseEnter={() => {
          setOpen(true);
          requestAnimationFrame(updateFromAnchor);
        }}
        onMouseLeave={() => setOpen(false)}
        onTouchStart={() => {
          setOpen((v) => !v);
          requestAnimationFrame(updateFromAnchor);
        }}
        onFocus={() => {
          setOpen(true);
          requestAnimationFrame(updateFromAnchor);
        }}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel ?? title ?? "Info"}
      >
        <AlertCircle className="h-4 w-4" />
      </Button>
      {open
        ? createPortal(
            <div
              className="fixed z-[85] max-w-xs rounded-2xl border border-white/70 bg-white/90 p-4 text-sm text-muted-foreground shadow-[0_20px_50px_-30px_rgba(15,23,42,0.5)] backdrop-blur pointer-events-none"
              style={{ left: pos.x, top: pos.y }}
            >
              {title ? (
                <div className="text-xs font-semibold text-foreground/70">{title}</div>
              ) : null}
              <div className="mt-1 leading-relaxed">{children}</div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
