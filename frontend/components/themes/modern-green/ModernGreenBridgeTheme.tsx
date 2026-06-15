"use client";

import { type ComponentProps } from "react";
import { ModernGreenNativeMenu } from "./ModernGreenNativeMenu";

type ModernGreenBridgeThemeProps = Omit<
  ComponentProps<typeof ModernGreenNativeMenu>,
  "src"
> & {
  src?: string;
};

/**
 * Compatibility export retained for older imports while Modern Green renders natively.
 * The src prop is intentionally ignored so this theme never depends on a standalone route.
 */
export function ModernGreenBridgeTheme({
  src: _src,
  ...props
}: ModernGreenBridgeThemeProps) {
  return <ModernGreenNativeMenu {...props} />;
}
