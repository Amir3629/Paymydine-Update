"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ThemedCard } from "./ThemedCard";

type OrderStatusCardProps = React.HTMLAttributes<HTMLDivElement>;

export function OrderStatusCard({ className, ...props }: OrderStatusCardProps) {
  return (
    <ThemedCard
      as="div"
      variant="status"
      data-pmd-order-status-card-shell="1"
      className={cn("pmd-order-status-card rounded-2xl p-3", className)}
      {...props}
    />
  );
}
