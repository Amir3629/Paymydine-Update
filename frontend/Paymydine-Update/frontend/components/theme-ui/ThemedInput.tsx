"use client";

import React from "react";
import { cn } from "@/lib/utils";

type ThemedInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  fieldSize?: "sm" | "md";
};

export const ThemedInput = React.forwardRef<HTMLInputElement, ThemedInputProps>(
  ({ fieldSize = "md", className, ...props }, ref) => (
    <input
      ref={ref}
      data-pmd-themed-input={fieldSize}
      className={cn(
        "pmd-themed-input h-12 w-full rounded-xl border bg-transparent px-4 outline-none",
        className,
      )}
      {...props}
    />
  ),
);

ThemedInput.displayName = "ThemedInput";
