"use client";

import React from "react";
import { cn } from "@/lib/utils";

type PaymentMethodTileProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  label: string;
  children: React.ReactNode;
};

export const PaymentMethodTile = React.forwardRef<
  HTMLButtonElement,
  PaymentMethodTileProps
>(
  (
    { selected = false, label, children, className, type = "button", ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={selected}
      data-pmd-payment-method-tile="1"
      data-pmd-selected={selected ? "1" : "0"}
      className={cn(
        "pmd-payment-method-tile inline-flex h-14 w-20 items-center justify-center rounded-xl border p-2",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

PaymentMethodTile.displayName = "PaymentMethodTile";
