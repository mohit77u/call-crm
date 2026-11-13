"use client";

import { useActionState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPassword } from "@/lib/auth-actions";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation";
import { PasswordField, ReqMark } from "@/components/fields";
import { Spinner } from "@/components/spinner";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, {});
  const [, startTransition] = useTransition();
  const {
    control,
    handleSubmit,
    clearErrors,
    formState: { isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "" },
  });

  const busy = pending || isSubmitting;

  function onValid(data: ResetPasswordValues) {
    const fd = new FormData();
    fd.set("token", data.token);
    fd.set("password", data.password);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3.5">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {state.error}
        </div>
      )}
      <Controller
        name="password"
        control={control}
        render={({ field, fieldState }) => (
          <PasswordField
            {...field}
            label={<>New Password<ReqMark /></>}
            placeholder="At least 8 characters"
            autoFocus
            autoComplete="new-password"
            error={fieldState.error?.message}
            onClearError={() => clearErrors("password")}
          />
        )}
      />
      <button type="submit" disabled={busy} className="w-full">
        {busy ? <span className="inline-flex items-center justify-center gap-2"><Spinner />Saving…</span> : "Save password"}
      </button>
    </form>
  );
}
