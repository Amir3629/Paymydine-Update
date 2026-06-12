"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function TipCouponPanel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-pmd-tip-coupon-panel="1"
      className={cn("pmd-tip-coupon-panel space-y-2", className)}
      {...props}
    />
  );
}
