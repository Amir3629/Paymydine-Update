// PMD_MENU_ROUTE_REDIRECTS_HOME_V28
// /menu is no longer a separate public page. Keep old links safe,
// but force one canonical customer URL: /

import { redirect } from "next/navigation"

export default function MenuRedirectPage() {
  redirect("/")
}
