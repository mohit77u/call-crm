"use client";

import { useRouter } from "next/navigation";
import { setNavState } from "@/lib/nav-state";

export function AgentCallsLink({ agentId, name, from, to }: { agentId: number; name: string; from: string; to: string }) {
  const router = useRouter();
  return (
    <a
      href="/company/calls"
      onClick={(e) => {
        e.preventDefault();
        setNavState("crm:company:calls:filters", { agent: String(agentId), from, to });
        router.push("/company/calls");
      }}
    >
      {name}
    </a>
  );
}
