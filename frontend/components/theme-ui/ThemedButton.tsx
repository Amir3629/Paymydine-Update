"use client";

import React from "react";
import { cn } from "@/lib/utils";

type ThemedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "icon";
  fullWidth?: boolean;
};

export const ThemedButton = React.forwardRef<
  HTMLButtonElement,
  ThemedButtonProps
>(
  (
    {
      variant = "secondary",
      fullWidth = false,
      className,
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      data-pmd-themed-button={variant}
      className={cn(
        "pmd-themed-button",
        fullWidth && "pmd-themed-button-full",
        className,
      )}
      {...props}
    />
  ),
);

ThemedButton.displayName = "ThemedButton";
