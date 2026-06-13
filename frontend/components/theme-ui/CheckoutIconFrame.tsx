"use client";

import React from "react";
import { cn } from "@/lib/utils";

type CheckoutIconFrameProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: "default" | "subtle";
};

export function CheckoutIconFrame({
  tone = "default",
  className,
  ...props
}: CheckoutIconFrameProps) {
  return (
    <div
      data-pmd-checkout-icon-frame={tone}
      className={cn(
        "pmd-checkout-theme-icon inline-flex h-10 w-10 shrink-0 items-center justify-center",
        className,
      )}
      {...props}
    />
  );
}
