"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthFormState } from "@/lib/auth-actions";
import { agentLoginSchema, type AgentLoginValues } from "@/lib/validation";
import { notify } from "@/lib/notify";
import { TextField, PasswordField, ReqMark } from "@/components/fields";
import { Spinner } from "@/components/spinner";

type LoginAction = (prev: AuthFormState, form: FormData) => Promise<AuthFormState>;

export function AgentLoginForm({ action }: { action: LoginAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const {
    control,
    handleSubmit,
    clearErrors,
    formState: { isSubmitting },
  } = useForm<AgentLoginValues>({
    resolver: zodResolver(agentLoginSchema),
    defaultValues: { clientCode: "", username: "", password: "" },
  });

  const busy = pending || isSubmitting;

  useEffect(() => {
    if (state.error) notify.error(state.error);
  }, [state.error]);

  function onValid(data: AgentLoginValues) {
    const fd = new FormData();
    fd.set("clientCode", data.clientCode);
    fd.set("username", data.username);
    fd.set("password", data.password);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3.5">
      <Controller
        name="clientCode"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label={<>Client Code<ReqMark /></>}
            placeholder="e.g. CRM-AB12"
            autoFocus
            autoComplete="off"
            error={fieldState.error?.message}
            onClearError={() => clearErrors("clientCode")}
          />
        )}
      />
      <Controller
        name="username"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label={<>Username<ReqMark /></>}
            placeholder="Your username"
            autoComplete="username"
            error={fieldState.error?.message}
            onClearError={() => clearErrors("username")}
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
    </form>
  );
}
