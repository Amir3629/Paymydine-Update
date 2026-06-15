"use client";

import { useCustomerMenuController } from "@/features/customer-menu/controller/useCustomerMenuController";
import { getThemeRenderer } from "@/theme/ThemeEngine";

export default function CustomerMenuPage() {
  const { state, actions } = useCustomerMenuController();

  const Renderer = getThemeRenderer(state.theme);

  return (
    <>
      <Renderer state={state} actions={actions} />
    </>
  );
}