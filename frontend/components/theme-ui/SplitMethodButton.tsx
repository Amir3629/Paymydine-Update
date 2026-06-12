"use client";

import React from "react";
import { cn } from "@/lib/utils";

type SplitMethodButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export const SplitMethodButton = React.forwardRef<
  HTMLButtonElement,
  SplitMethodButtonProps
>(({ selected = false, className, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    data-pmd-split-method-button="1"
    data-pmd-selected={selected ? "1" : "0"}
    className={cn(
      "pmd-split-method-button inline-flex items-center justify-center border px-3 py-1.5 text-xs font-semibold",
      className,
    )}
    {...props}
  />
));

SplitMethodButton.displayName = "SplitMethodButton";
