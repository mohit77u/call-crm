"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateCompanyCode } from "./actions";
import { notify } from "@/lib/notify";

export function RegenerateCodeButton({ companyId }: { companyId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await regenerateCompanyCode(companyId);
          if (res.error) notify.error(res.error);
          else {
            notify.success(res.notice ?? "Done");
            router.refresh();
          }
        })
      }
    >
      {pending ? "Working…" : "Generate new code"}
    </button>
  );
}
