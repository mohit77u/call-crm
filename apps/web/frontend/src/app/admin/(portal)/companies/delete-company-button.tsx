"use client";

import { useTransition } from "react";

export function DeleteCompanyButton({ action, companyName }: { action: () => Promise<void>; companyName: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="danger"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete ${companyName}? All admins, agents, phones and call history will be permanently removed.`)) {
          startTransition(action);
        }
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
