"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/hotel/drawer";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { NumberField, TextField } from "@/components/hotel/fields";
import { RuleDrawer } from "@/components/hotel/drawers/RuleDrawer";
import { PreferencesDrawer } from "@/components/hotel/drawers/PreferencesDrawer";
import { HotelDetailDrawer } from "@/components/hotel/drawers/HotelDetailDrawer";
import { BrandDrawer } from "@/components/hotel/drawers/BrandDrawer";
import { HotelDrawer } from "@/components/hotel/drawers/HotelDrawer";
import { TravelSection } from "@/components/hotel/sections/TravelSection";
import { BrandsSection } from "@/components/hotel/sections/BrandsSection";
import { HotelsSection } from "@/components/hotel/sections/HotelsSection";
import { PageTabs } from "@/components/hotel/page-tabs";
import { ConfirmDialog } from "@/components/hotel/confirm-dialog";
import { useHotelState } from "@/components/hotel/useHotelState";
import type { Language } from "@/lib/hotel/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Hotel Chooser — per your latest requirements
 *
 * UI
 * - Pages: Travel / Brands
 * - Edit/Add for Brand and Hotel use a right-side sliding Drawer (no extra deps)
 *
 * Modeling
 * - Compare staying at a hotel for N nights (one stay)
 * - Trigger: per_night | per_stay | spend | milestone
 * - Reward: points | multiplier(on base only) | voucher
 * - Voucher value is a brand hyperparameter; reward can directly choose voucher.
 *
 * v1 simplifications
 * - Spend trigger uses pre-tax currency
 * - Tax rate only for pre/post conversion (no non-earning fees modeling)
 */

// -----------------------------
// Main
// -----------------------------

export default function HotelChooserAllPrograms() {
  const {
    t,
    page,
    setPage,
    global,
    setGlobal,
    programs,
    setPrograms,
    hotels,
    setHotels,
    language,
    handleLanguageChange,
    languageOptions,
    preferencesOpen,
    setPreferencesOpen,
    firstVisitFlow,
    startFirstBrandFlow,
    confirmState,
    setConfirmState,
    countries,
    setCountries,
    countryDrawerOpen,
    setCountryDrawerOpen,
    fxRates,
    supportedCurrencies,
    currencyLabel,
    demoLines,
    countryLabel,
    taxInputMode,
    preferencesComplete,
    currencyMissing,
    taxModeMissing,
    preferredCurrency,
    currency,
    programById,
    ranked,
    selectedHotel,
    selectedProgram,
    selectedCalc,
    brandDrawerOpen,
    brandEditingId,
    brandPresetId,
    brandSubBrandFocusKey,
    returnToHotelAfterBrand,
    brandDraftState,
    setBrandDrawerOpen,
    setBrandPresetId,
    setBrandDraftState,
    brandRulesOpen,
    setBrandRulesOpen,
    brandRulePickerKey,
    setBrandRulePickerKey,
    hotelDrawerOpen,
    hotelEditingId,
    hotelDraftState,
    setHotelDrawerOpen,
    setHotelDraftState,
    setHotelRulesOpen,
    hotelRulePickerKey,
    setHotelRulePickerKey,
    hotelDetailOpen,
    setHotelDetailOpen,
    openBrandDrawerNew,
    openBrandDrawerEdit,
    openBrandDrawerSubBrand,
    closeBrandDrawer,
    updateBrandDraft,
    hotelResumeStep,
    setHotelResumeStep,
    copyBrand,
    deleteBrand,
    openHotelDrawerNew,
    openHotelDrawerEdit,
    openHotelDetail,
    deleteHotel,
    saveBrandDraft,
    saveHotelDraft,
    buildPresetBrand,
    autoInputClass,
    convertAmount,
    refreshFxRates,
    handlePreferencesClose,
    openRuleEditor,
    autoRuleName,
    ruleDrawerOpen,
    ruleDraftState,
    setRuleDraftState,
    ruleNameMode,
    setRuleNameMode,
    ruleContext,
    closeRuleDrawer,
    saveRuleDraft,
    ruleVoucherBlocked,
    ruleDraftProgram,
    voucherEnabled,
    handleVoucherRequest,
    removeRuleDraft,
    brandColor,
    brandLogo,
    formatEliteLabel,
    persistPreferencesSet,
    defaultGlobal,
    uid,
    getDefaultCountryName,
    isDefaultCountryName,
  } = useHotelState();

  // Render
  // -----------------------------

  return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.svg"
                  alt="Staysage"
                  className="h-9 w-9 rounded-2xl shadow-[0_10px_25px_-16px_rgba(15,23,42,0.4)]"
                />
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight bg-gradient-to-r from-rose-500 via-orange-400 to-teal-500 text-transparent bg-clip-text">
                  {t("app.title.full")}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("app.tagline")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:inline-flex items-center gap-1 rounded-2xl border border-white/70 bg-white/70 p-1 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.25)]">
                <Select
                    value={language}
                    onValueChange={(v) => handleLanguageChange(v as Language)}
                >
                  <SelectTrigger className="h-8 w-[160px] rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-2xl"
                  onClick={() => setPreferencesOpen(true)}
                  title={t("drawer.preferences.title")}
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <PageTabs
              page={page}
              setPage={setPage}
              travelLabel={t("app.tabs.travel")}
              brandsLabel={t("app.tabs.brands")}
          />
        </div>

        {/* Travel */}
        {page === "travel" ? (
          <TravelSection
            t={t}
            global={global}
            countries={countries}
            countryLabel={countryLabel}
            taxInputMode={taxInputMode}
            onCountryChange={(v) => {
              const country = countries.find((c) => c.id === v);
              setGlobal((g) => ({
                ...g,
                countryId: v,
                taxRate: country ? country.taxRate : g.taxRate,
              }));
            }}
            onNightsChange={(v) =>
              setGlobal((g) => ({
                ...g,
                nights: Math.max(1, Math.round(v)),
              }))
            }
            onTaxRateChange={(v) =>
              setGlobal((g) => ({ ...g, taxRate: Math.max(0, v / 100) }))
            }
          />
        ) : null}

        {/* Brands */}
        {page === "brands" ? (
          <BrandsSection
            t={t}
            programs={programs}
            brandColor={brandColor}
            brandLogo={brandLogo}
            formatEliteLabel={formatEliteLabel}
            onAddBrand={openBrandDrawerNew}
            onEditBrand={openBrandDrawerEdit}
            onCopyBrand={copyBrand}
            onDeleteBrand={deleteBrand}
            onEliteTierChange={(programId, eliteTierId) =>
              setPrograms((prev) =>
                prev.map((x) =>
                  x.id === programId
                    ? {
                        ...x,
                        settings: { ...x.settings, eliteTierId },
                      }
                    : x
                )
              )
            }
            onGoTravel={() => setPage("travel")}
          />
        ) : null}

        {/* Hotels */}
        {page === "travel" ? (
          <HotelsSection
            t={t}
            hotels={hotels}
            ranked={ranked}
            global={global}
            currency={currency}
            language={language}
            programById={programById}
            brandLogo={brandLogo}
            brandColor={brandColor}
            onAddHotel={openHotelDrawerNew}
            onOpenDetails={openHotelDetail}
            onEditHotel={openHotelDrawerEdit}
            onDeleteHotel={deleteHotel}
          />
        ) : null}

        {/* Hotel Detail Drawer */}
        <HotelDetailDrawer
            open={hotelDetailOpen}
            selectedHotel={selectedHotel}
            selectedProgram={selectedProgram}
            selectedCalc={selectedCalc}
            currency={currency}
            language={language}
            global={global}
            t={t}
            onClose={() => setHotelDetailOpen(false)}
            onEdit={(id) => {
              setHotelDetailOpen(false);
              openHotelDrawerEdit(id);
            }}
            brandColor={brandColor}
            brandLogo={brandLogo}
            formatEliteLabel={formatEliteLabel}
        />

        {/* Brand Drawer */}
        <BrandDrawer
            open={brandDrawerOpen}
            brandEditingId={brandEditingId}
            brandPresetId={brandPresetId}
            brandDraftState={brandDraftState}
            onClose={closeBrandDrawer}
            onSave={saveBrandDraft}
            onPresetChange={(v) => {
              setBrandPresetId(v);
              setBrandDraftState(buildPresetBrand(v));
            }}
            setBrandDraftState={setBrandDraftState}
            autoInputClass={autoInputClass}
            convertAmount={convertAmount}
            supportedCurrencies={supportedCurrencies}
            currencyLabel={currencyLabel}
            currency={currency}
            language={language}
            brandLogo={brandLogo}
            formatEliteLabel={formatEliteLabel}
            subBrandFocusKey={brandSubBrandFocusKey}
            onUpdateBrandDraft={updateBrandDraft}
            returnToHotelAfterBrand={returnToHotelAfterBrand}
            brandRulesOpen={brandRulesOpen}
            onToggleRules={() => setBrandRulesOpen((v) => !v)}
            brandRulePickerKey={brandRulePickerKey}
            onBumpRulePickerKey={() => setBrandRulePickerKey((k) => k + 1)}
            onOpenRuleEditor={(triggerType, ruleId) =>
              openRuleEditor("brand", triggerType, ruleId)
            }
            onRequestDeleteRule={(ruleId) =>
              setConfirmState({
                title: t("confirm.delete.rule"),
                message: t("confirm.delete.notice"),
                confirmLabel: t("common.delete"),
                cancelLabel: t("common.cancel"),
                destructive: true,
                onConfirm: () => {
                  setBrandDraftState((s) =>
                    s
                      ? {
                          ...s,
                          settings: {
                            ...s.settings,
                            rules: s.settings.rules.filter((x) => x.id !== ruleId),
                          },
                        }
                      : s
                  );
                  setConfirmState(null);
                },
              })
            }
            t={t}
        />

        {/* Preferences Drawer */}
        <PreferencesDrawer
            open={preferencesOpen}
            language={language}
            global={global}
            preferencesComplete={preferencesComplete}
            onClose={handlePreferencesClose}
            firstVisitMode={firstVisitFlow}
            onFirstBrand={startFirstBrandFlow}
            onLanguageChange={handleLanguageChange}
            onCurrencyChange={(currency) => {
              persistPreferencesSet();
              setGlobal((g) => ({
                ...g,
                preferredCurrency: currency,
              }));
            }}
            onTaxModeChange={(mode) => {
              persistPreferencesSet();
              setGlobal((g) => ({
                ...g,
                taxInputMode: mode,
              }));
            }}
            currencyMissing={currencyMissing}
            taxModeMissing={taxModeMissing}
            languageOptions={languageOptions}
            supportedCurrencies={supportedCurrencies}
            currencyLabel={currencyLabel}
            refreshFxRates={refreshFxRates}
            fxRates={fxRates}
            demoLines={demoLines()}
            onManageCountries={() => setCountryDrawerOpen(true)}
            onResetTravel={() =>
                setConfirmState({
                  title: t("confirm.reset.travel.title"),
                  message: t("confirm.reset.travel.message"),
                  confirmLabel: t("confirm.reset.label"),
                  cancelLabel: t("common.cancel"),
                  destructive: true,
                  onConfirm: () => {
                    setHotels([]);
                    setGlobal((g) => ({
                      ...g,
                      nights: defaultGlobal.nights,
                      countryId: defaultGlobal.countryId,
                      taxRate: defaultGlobal.taxRate,
                    }));
                    setConfirmState(null);
                  },
                })
            }
            onResetBrands={() =>
                setConfirmState({
                  title: t("confirm.reset.brands.title"),
                  message: t("confirm.reset.brands.message"),
                  confirmLabel: t("confirm.reset.label"),
                  cancelLabel: t("common.cancel"),
                  destructive: true,
                  onConfirm: () => {
                    setPrograms([]);
                    setHotels([]);
                    setBrandPresetId("custom");
                    setConfirmState(null);
                  },
                })
            }
        />

        {/* Country Drawer */}
        <Drawer
            open={countryDrawerOpen}
            title={t("drawer.preferences.countries.drawerTitle")}
            onClose={() => setCountryDrawerOpen(false)}
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => setCountryDrawerOpen(false)}
                >
                  {t("dialog.country.done")}
                </Button>
              </div>
            }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-semibold text-muted-foreground">
              <div>{t("country.name")}</div>
              <div>{t("country.taxRate")}</div>
              <div />
            </div>
            {countries.map((c) => (
                <div key={c.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                  <TextField
                      label=""
                      value={
                        getDefaultCountryName(c) && isDefaultCountryName(c)
                          ? getDefaultCountryName(c) ?? c.name
                          : c.name
                      }
                      onChange={(v) =>
                          setCountries((prev) =>
                              prev.map((x) => (x.id === c.id ? { ...x, name: v } : x))
                          )
                      }
                  />
                    <NumberField
                      label=""
                      value={c.taxRate * 100}
                      step={1}
                      inputClassName="w-24 md:w-28"
                      suffix="%"
                      onChange={(v) =>
                        setCountries((prev) =>
                          prev.map((x) =>
                                  x.id === c.id
                                    ? { ...x, taxRate: Math.max(0, v / 100) }
                                    : x
                              )
                          )
                      }
                  />
                  <Button
                      variant="ghost"
                      className="rounded-2xl justify-start"
                      onClick={() =>
                          setCountries((prev) => prev.filter((x) => x.id !== c.id))
                      }
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> {t("common.remove")}
                  </Button>
                </div>
            ))}
            <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() =>
                    setCountries((prev) => [
                      ...prev,
                      { id: uid(), name: t("country.new"), taxRate: 0.1 },
                    ])
                }
            >
              <Plus className="w-4 h-4 mr-2" /> {t("common.add.region")}
            </Button>
          </div>
        </Drawer>

        {/* Hotel Drawer */}
        <HotelDrawer
            open={hotelDrawerOpen}
            hotelEditingId={hotelEditingId}
            hotelDraftState={hotelDraftState}
            programs={programs}
            programById={programById}
            brandLogo={brandLogo}
            brandColor={brandColor}
            formatEliteLabel={formatEliteLabel}
            preferredCurrency={preferredCurrency}
            supportedCurrencies={supportedCurrencies}
            currencyLabel={currencyLabel}
            taxInputMode={taxInputMode}
            hotelRulePickerKey={hotelRulePickerKey}
            onBumpRulePickerKey={() => setHotelRulePickerKey((k) => k + 1)}
            onOpenRuleEditor={(triggerType, ruleId) =>
              openRuleEditor("hotel", triggerType, ruleId)
            }
            onClose={() => setHotelDrawerOpen(false)}
            onSave={saveHotelDraft}
            onUpdateHotelDraft={(patch) =>
              setHotelDraftState((s) => (s ? { ...s, ...patch } : s))
            }
            resumeStep={hotelResumeStep}
            onConsumeResumeStep={() => setHotelResumeStep(null)}
            onRequestAddSubBrand={(programId) => {
              setHotelDrawerOpen(false);
              openBrandDrawerSubBrand(programId);
            }}
            onRequestDeleteRule={(ruleId) =>
              setConfirmState({
                title: t("confirm.delete.rule"),
                message: t("confirm.delete.notice"),
                confirmLabel: t("common.delete"),
                cancelLabel: t("common.cancel"),
                destructive: true,
                onConfirm: () => {
                  setHotelDraftState((s) =>
                    s ? { ...s, rules: s.rules.filter((x) => x.id !== ruleId) } : s
                  );
                  setConfirmState(null);
                },
              })
            }
            t={t}
            currency={currency}
            language={language}
        />

        {/* Rule Drawer */}
        <RuleDrawer
            open={ruleDrawerOpen}
            title={
              <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-2xl"
                    onClick={closeRuleDrawer}
                >
                  {t("dialog.rule.back")}
                </Button>
                <span>
                  {ruleContext?.ruleId ? t("dialog.rule.title.edit") : t("dialog.rule.title.add")}
                </span>
              </div>
            }
            onClose={closeRuleDrawer}
            onCancel={closeRuleDrawer}
            onSave={saveRuleDraft}
            saveDisabled={ruleVoucherBlocked}
            ruleDraftState={ruleDraftState}
            currency={currency}
            language={language}
            nameMode={ruleNameMode}
            autoName={
              ruleDraftState
                ? autoRuleName(t, ruleDraftState, (id) =>
                    ruleDraftProgram?.settings.vouchers.find(
                      (voucher) => voucher.id === id
                    )?.name
                  )
                : undefined
            }
            onNameFocus={() => setRuleNameMode("manual")}
            voucherEnabled={voucherEnabled}k
            vouchers={ruleDraftProgram?.settings.vouchers ?? []}
            onRequestVoucher={handleVoucherRequest}
            onUpdate={(patch) =>
                setRuleDraftState((s) => {
                  if (!s) return s;
                  if (ruleNameMode === "auto" && patch.name !== undefined) {
                    setRuleNameMode("manual");
                  }
                  return { ...s, ...patch };
                })
            }
            onRemove={removeRuleDraft}
        />
        <ConfirmDialog
            open={Boolean(confirmState)}
            title={confirmState?.title ?? ""}
            message={confirmState?.message ?? ""}
            confirmLabel={confirmState?.confirmLabel ?? ""}
            cancelLabel={confirmState?.cancelLabel ?? ""}
            destructive={confirmState?.destructive}
            showCancel={confirmState?.showCancel ?? true}
            dismissible={confirmState?.dismissible ?? true}
            onConfirm={() => confirmState?.onConfirm()}
            onCancel={() => setConfirmState(null)}
        />
      </div>
  );
}
