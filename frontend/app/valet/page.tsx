// PMD_VALET_REDIRECTS_TO_HOME_MENU_V28
// /valet is no longer a separate customer page. Keep old links safe,
// but send customers to the homepage menu where valet is inside the Kazen header.

import { redirect } from "next/navigation"

export default function ValetRedirectPage() {
  redirect("/")
}
