"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthFormState } from "@/lib/auth-actions";
import { loginFormSchema, type LoginFormValues } from "@/lib/validation";
import { EmailField, PasswordField, ReqMark } from "@/components/fields";
import { Spinner } from "@/components/spinner";

type LoginAction = (prev: AuthFormState, form: FormData) => Promise<AuthFormState>;

export function LoginForm({ action, forgotHref }: { action: LoginAction; forgotHref: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const {
    control,
    handleSubmit,
    clearErrors,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const busy = pending || isSubmitting;

  function onValid(data: LoginFormValues) {
    const fd = new FormData();
    fd.set("email", data.email);
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
      <Controller
        name="password"
        control={control}
        render={({ field, fieldState }) => (
          <PasswordField
            {...field}
            label={<>Password<ReqMark /></>}
            autoComplete="current-password"
            error={fieldState.error?.message}
            onClearError={() => clearErrors("password")}
          />
        )}
      />
      <button type="submit" disabled={busy} className="w-full">
        {busy ? <span className="inline-flex items-center justify-center gap-2"><Spinner />Please wait…</span> : "Login"}
      </button>
      <p className="m-0 text-center text-slate-500">
        <Link href={forgotHref} className="text-inherit hover:underline">Forgot password?</Link>
      </p>
    </form>
  );
}
