"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createTranslator, getStoredLanguage } from "@/lib/i18n";

export default function AboutPage() {
  const language = getStoredLanguage();
  const t = createTranslator(language);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <Card className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
        <CardHeader>
          <CardTitle className="text-base">{t("about.title")}</CardTitle>
          <div className="text-sm text-muted-foreground mt-1">{t("about.subtitle")}</div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-slate-700 leading-relaxed">{t("about.mission")}</p>

          <div className="rounded-2xl border border-white/70 bg-white/65 p-4">
            <div className="text-sm font-medium">{t("about.support")}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("about.supportDesc")}
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div>• {t("about.donate.github")}</div>
              <div>• {t("about.donate.coffee")}</div>
              <div>• {t("about.donate.crypto")}</div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button asChild className="rounded-2xl">
              <Link href="/">{t("footer.backHome")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
