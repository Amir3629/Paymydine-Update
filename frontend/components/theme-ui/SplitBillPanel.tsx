"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { CheckoutStepCard } from "./CheckoutStepCard";

export function SplitBillPanel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <CheckoutStepCard
      variant="subtle"
      data-pmd-split-bill-panel="1"
      className={cn("pmd-split-bill-panel space-y-3", className)}
      {...props}
    />
  );
}
