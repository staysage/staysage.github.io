"use client";

import type React from "react";
import { Drawer } from "@/components/hotel/drawer";
import { RuleEditor } from "@/components/hotel/rule-editor";
import { Button } from "@/components/ui/button";
import type { Language, Rule, SupportedCurrency, Voucher } from "@/lib/hotel/types";
import { createTranslator } from "@/lib/i18n";

export function RuleDrawer({
  open,
  title,
  onClose,
  onCancel,
  onSave,
  saveDisabled = false,
  ruleDraftState,
  currency,
  language,
  nameMode,
  autoName,
  voucherEnabled,
  vouchers,
  onRequestVoucher,
  onUpdate,
  onRemove,
  onNameFocus,
}: {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  ruleDraftState: Rule | null;
  currency: SupportedCurrency;
  language: Language;
  nameMode: "auto" | "manual";
  autoName?: string;
  voucherEnabled?: boolean;
  vouchers?: Voucher[];
  onRequestVoucher?: () => void;
  onUpdate: (patch: Partial<Rule>) => void;
  onRemove: () => void;
  onNameFocus: () => void;
}) {
  const t = createTranslator(language);

  return (
    <Drawer
      open={open}
      title={title}
      onClose={onClose}
      zIndex={60}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" className="rounded-2xl" onClick={onCancel}>
            {t("dialog.rule.footer.cancel")}
          </Button>
          <Button className="rounded-2xl" onClick={onSave} disabled={saveDisabled}>
            {t("dialog.rule.footer.save")}
          </Button>
        </div>
      }
    >
      {ruleDraftState ? (
        <RuleEditor
          rule={ruleDraftState}
          currency={currency}
          language={language}
          nameMode={nameMode}
          autoName={autoName}
          onNameFocus={onNameFocus}
          voucherEnabled={voucherEnabled}
          vouchers={vouchers ?? []}
          onRequestVoucher={onRequestVoucher}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ) : (
        <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
      )}
    </Drawer>
  );
}
