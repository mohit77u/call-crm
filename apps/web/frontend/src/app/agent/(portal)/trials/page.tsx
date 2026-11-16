import type { Metadata } from "next";
import { AgentTrialsBrowser } from "./trials-browser";

export const metadata: Metadata = { title: "Free trial" };

export default function AgentTrialsPage() {
  return <AgentTrialsBrowser />;
}
