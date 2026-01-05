"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clampNum } from "@/lib/hotel/format";

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
  inputClassName,
}: {
  label: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  inputClassName?: string;
}) {
  const [display, setDisplay] = useState(
    Number.isFinite(value) ? String(value) : ""
  );
  const editingRef = useRef(false);

  useEffect(() => {
    if (editingRef.current) return;
    setDisplay(Number.isFinite(value) ? String(value) : "");
  }, [value]);

  return (
    <div className="space-y-1">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step={step}
          inputMode="decimal"
          className={inputClassName ?? "w-full max-w-[200px]"}
          value={display}
          onFocus={() => {
            editingRef.current = true;
          }}
          onBlur={() => {
            editingRef.current = false;
            const next =
              display.trim() === "" ? 0 : clampNum(display, 0);
            onChange(next);
            setDisplay(String(next));
          }}
          onChange={(e) => {
            const next = e.target.value;
            setDisplay(next);
            if (next.trim() === "") return;
            onChange(clampNum(next, 0));
          }}
        />
        {suffix ? (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  onFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onFocus?: () => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
      />
    </div>
  );
}

export function MoneyField({
  label,
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  currencyOptions,
}: {
  label: string;
  amount: number;
  currency: string;
  onAmountChange: (v: number) => void;
  onCurrencyChange: (v: string) => void;
  currencyOptions: { value: string; label: string }[];
}) {
  const [display, setDisplay] = useState(
    Number.isFinite(amount) ? String(amount) : ""
  );
  const editingRef = useRef(false);

  useEffect(() => {
    if (editingRef.current) return;
    setDisplay(Number.isFinite(amount) ? String(amount) : "");
  }, [amount]);

  return (
    <div className="space-y-1">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          className="w-24 md:w-28"
          inputMode="decimal"
          value={display}
          onFocus={() => {
            editingRef.current = true;
          }}
          onBlur={() => {
            editingRef.current = false;
            const next =
              display.trim() === "" ? 0 : clampNum(display, 0);
            onAmountChange(next);
            setDisplay(String(next));
          }}
          onChange={(e) => {
            const next = e.target.value;
            setDisplay(next);
            if (next.trim() === "") return;
            onAmountChange(clampNum(next, 0));
          }}
        />
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger className="h-9 w-[90px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencyOptions.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function StatRow({
  title,
  value,
  sub,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-right">
        <div className="text-sm font-medium">{value}</div>
        {sub ? <div className="text-xs text-muted-foreground mt-0.5">{sub}</div> : null}
      </div>
    </div>
  );
}
