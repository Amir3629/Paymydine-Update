"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ThemedCard } from "./ThemedCard";

type CheckoutSummaryCardProps = React.HTMLAttributes<HTMLDivElement>;

export function CheckoutSummaryCard({
  className,
  ...props
}: CheckoutSummaryCardProps) {
  return (
    <ThemedCard
      as="div"
      variant="subtle"
      data-pmd-checkout-summary-card="1"
      className={cn("pmd-checkout-summary-card rounded-2xl p-3", className)}
      {...props}
    />
  );
}
