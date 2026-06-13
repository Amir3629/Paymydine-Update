"use client";

import React from "react";
import { cn } from "@/lib/utils";

type ThemedCardProps = React.HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article";
  variant?: "default" | "subtle" | "flat" | "status";
};

export function ThemedCard({
  as: Component = "section",
  variant = "default",
  className,
  ...props
}: ThemedCardProps) {
  return (
    <Component
      data-pmd-themed-card={variant}
      className={cn("pmd-themed-card", className)}
      {...props}
    />
  );
}
