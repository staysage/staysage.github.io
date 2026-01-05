"use client";

import type React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function InfoCallout({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/70 bg-gradient-to-br from-white/70 via-white/50 to-white/40 p-4 text-sm text-slate-700 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] backdrop-blur",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 text-slate-600" />
        <div className="space-y-1">
          {title ? (
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {title}
            </div>
          ) : null}
          <div className="leading-relaxed text-slate-700">{children}</div>
        </div>
      </div>
    </div>
  );
}
