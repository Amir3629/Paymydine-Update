"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { CheckoutStepCard } from "./CheckoutStepCard";

export function PaymentCardFrame({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <CheckoutStepCard
      variant="default"
      data-pmd-payment-card-frame="1"
      className={cn("pmd-payment-card-frame space-y-3", className)}
      {...props}
    />
  );
}
