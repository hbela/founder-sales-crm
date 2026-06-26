/** @jsxRuntime automatic */
/** @jsxImportSource react */
import type { ReactElement } from "react";
import LaunchCampaign from "../emails/LaunchCampaign.js";
import SunshineOffer1 from "../emails/SunshineOffer1.js";

/**
 * Registry of sendable campaigns, keyed by a stable slug. The same components
 * power the `email dev` preview and the send script, so what you see is what
 * ships. Add new campaigns here as you build them.
 */
export const campaigns: Record<string, () => ReactElement> = {
  launch: () => <LaunchCampaign />,
  "sunshine-offer1": () => <SunshineOffer1 />,
};

export type CampaignKey = keyof typeof campaigns;
