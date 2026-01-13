"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
  zIndex = 40,
  disableClose = false,
}: {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  zIndex?: number;
  disableClose?: boolean;
}) {
  const handleClose = () => {
    if (disableClose) return;
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 h-[100dvh] w-[100dvw] bg-black/30 transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
        style={{ zIndex }}
      />
      <div
        className={`fixed top-0 right-0 h-[100dvh] w-full sm:w-[520px] bg-background border-l shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ zIndex: zIndex + 1 }}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b flex items-center justify-between gap-3">
            <div className="font-semibold">{title}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={disableClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-4 overflow-auto flex-1">{children}</div>
          {footer ? <div className="p-4 border-t">{footer}</div> : null}
        </div>
      </div>
    </>
  );
}
