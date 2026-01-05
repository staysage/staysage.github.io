"use client";

import { Button } from "@/components/ui/button";

export function PageTabs({
  page,
  setPage,
  travelLabel,
  brandsLabel,
}: {
  page: "travel" | "brands";
  setPage: (p: "travel" | "brands") => void;
  travelLabel: string;
  brandsLabel: string;
}) {
  const TabBtn = ({
    id,
    label,
  }: {
    id: "global" | "brands" | "hotels";
    label: string;
  }) => (
    <Button
      variant={page === id ? "default" : "secondary"}
      className="rounded-2xl"
      onClick={() => setPage(id)}
    >
      {label}
    </Button>
  );

  return (
    <div className="flex flex-wrap gap-2">
      <TabBtn id="travel" label={travelLabel} />
      <TabBtn id="brands" label={brandsLabel} />
    </div>
  );
}
