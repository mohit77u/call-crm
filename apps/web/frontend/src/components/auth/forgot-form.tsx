"use client";

import { useActionState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestPasswordReset } from "@/lib/auth-actions";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validation";
import { notify } from "@/lib/notify";
import { EmailField, ReqMark } from "@/components/fields";
import { Spinner } from "@/components/spinner";

export function ForgotForm({ loginHref }: { loginHref: string }) {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {});
  const [, startTransition] = useTransition();
  const {
    control,
    handleSubmit,
    clearErrors,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (state.sent) notify.success("Reset link sent — check your inbox");
    if (state.error) notify.error(state.error);
  }, [state.sent, state.error]);

  const busy = pending || isSubmitting;

  function onValid(data: ForgotPasswordValues) {
    const fd = new FormData();
    fd.set("email", data.email);
    startTransition(() => formAction(fd));
  }

  if (state.sent) {
    return (
      <div className="flex flex-col gap-3.5">
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-600">
          If that email is registered, a reset link has been sent. Check your inbox.
        </p>
        <p className="m-0 text-center text-slate-500">
          <Link href={loginHref} className="text-inherit hover:underline">Back to login</Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3.5">
      <p className="m-0 text-slate-500">Enter your account email. We will send a reset link.</p>
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <EmailField
            {...field}
            label={<>Email<ReqMark /></>}
            autoFocus
            autoComplete="email"
            error={fieldState.error?.message}
            onClearError={() => clearErrors("email")}
          />
        )}
      />
      <button type="submit" disabled={busy} className="w-full">
        {busy ? <span className="inline-flex items-center justify-center gap-2"><Spinner />Sending…</span> : "Send reset link"}
      </button>
      <p className="m-0 text-center text-slate-500">
        <Link href={loginHref} className="text-inherit hover:underline">Back to login</Link>
      </p>
    </form>
  );
}
