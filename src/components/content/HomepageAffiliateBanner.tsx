import { getHomepageAfterRolesAdvertising } from "@/lib/cms-advertising";

import { HomepageAffiliateBannerClient } from "./HomepageAffiliateBannerClient";

export async function HomepageAffiliateBanner() {
  const config = await getHomepageAfterRolesAdvertising();
  if (!config?.active) return null;
  return <HomepageAffiliateBannerClient config={config} />;
}
