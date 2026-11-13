"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPassword } from "@/lib/auth-actions";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation";
import { notify } from "@/lib/notify";
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

  useEffect(() => {
    if (state.error) notify.error(state.error);
  }, [state.error]);

  function onValid(data: ResetPasswordValues) {
    const fd = new FormData();
    fd.set("token", data.token);
    fd.set("password", data.password);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3.5">
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
