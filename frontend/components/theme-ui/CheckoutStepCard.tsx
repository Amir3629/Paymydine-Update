"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ThemedCard } from "./ThemedCard";

type CheckoutStepCardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "subtle" | "flat" | "status";
};

export function CheckoutStepCard({
  variant = "default",
  className,
  ...props
}: CheckoutStepCardProps) {
  return (
    <ThemedCard
      as="div"
      variant={variant}
      data-pmd-checkout-step-card="1"
      className={cn("pmd-checkout-step-card rounded-2xl p-3", className)}
      {...props}
    />
  );
}
