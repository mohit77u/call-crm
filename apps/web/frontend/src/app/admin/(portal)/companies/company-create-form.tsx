"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { createCompany } from "./actions";
import { createCompanySchema, type CreateCompanyValues } from "@/lib/validation";
import { PlanFields, stateFromPlan, type PlanFormState } from "./plan-fields";
import { TextField, EmailField, PasswordField, ReqMark } from "@/components/fields";
import { Spinner } from "@/components/spinner";
import { notify } from "@/lib/notify";

const MAX_ADMINS = 3;

export function CompanyCreateForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createCompany, {});
  const [, startTransition] = useTransition();
  const [planState, setPlanState] = useState<PlanFormState>(() => stateFromPlan("basic"));
  const {
    control,
    handleSubmit,
    clearErrors,
    formState: { isSubmitting, errors },
  } = useForm<CreateCompanyValues>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { name: "", admins: [{ name: "", email: "", password: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "admins" });

  const busy = pending || isSubmitting;

  useEffect(() => {
    if (state.companyId) {
      notify.success("Company created");
      router.push(`/admin/companies/${state.companyId}`);
    }
  }, [state.companyId, router]);

  function onValid(data: CreateCompanyValues) {
    const fd = new FormData();
    fd.set("name", data.name);
    fd.set("admins", JSON.stringify(data.admins));
    fd.set("plan", planState.plan);
    fd.set("maxAgents", planState.maxAgents);
    for (const [key, value] of Object.entries(planState.features)) {
      if (value) fd.set(`feature_${key}`, "on");
    }
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {state.error && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-[13px] text-red-600">{state.error}</div>
      )}

      <div className="border-b border-slate-200 px-5 py-3">
        <h2 className="mb-0! text-2xl! font-bold! text-slate-900">New Company</h2>
        <p className="mt-1 text-sm text-slate-500">Create a workspace and its admin accounts (max 3) in one go.</p>
      </div>

      <div className="flex flex-col gap-6 p-5">
        <section>
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">Company details</h3>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label={<>Company Name<ReqMark /></>}
                  placeholder="e.g. Acme Sales Pvt Ltd"
                  maxLength={100}
                  autoFocus
                  size="sm"
                  error={fieldState.error?.message}
                  onClearError={() => clearErrors("name")}
                />
              )}
            />
          </div>
        </section>

        <section className="border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">Admin accounts</h3>
              <p className="mt-1 text-xs text-slate-500">These people log in to the CRM. Up to {MAX_ADMINS} admins per company.</p>
            </div>
            <button
              type="button"
              disabled={fields.length >= MAX_ADMINS}
              onClick={() => append({ name: "", email: "", password: "" })}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <Plus size={14} /> Add admin
            </button>
          </div>
          {typeof errors.admins?.message === "string" && (
            <p className="mt-2 text-xs text-red-500">{errors.admins.message}</p>
          )}
          <div className="mt-3 flex flex-col gap-4">
            {fields.map((f, i) => (
              <div key={f.id} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Admin {i + 1}</span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
                      aria-label="Remove admin"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Controller
                    name={`admins.${i}.name`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label={<>Name<ReqMark /></>}
                        placeholder="Full name"
                        maxLength={100}
                        size="sm"
                        error={fieldState.error?.message}
                        onClearError={() => clearErrors(`admins.${i}.name`)}
                      />
                    )}
                  />
                  <Controller
                    name={`admins.${i}.email`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <EmailField
                        {...field}
                        label={<>Email<ReqMark /></>}
                        autoComplete="email"
                        size="sm"
                        error={fieldState.error?.message}
                        onClearError={() => clearErrors(`admins.${i}.email`)}
                      />
                    )}
                  />
                  <Controller
                    name={`admins.${i}.password`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <PasswordField
                        {...field}
                        label={<>Password<ReqMark /></>}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        maxLength={100}
                        size="sm"
                        error={fieldState.error?.message}
                        onClearError={() => clearErrors(`admins.${i}.password`)}
                      />
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-100 pt-5">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">Plan &amp; features</h3>
          <p className="mt-1 text-xs text-slate-500">Pick a plan to auto-fill features and agent limits — you can still tweak them below.</p>
          <div className="mt-2">
            <PlanFields state={planState} setState={setPlanState} />
          </div>
        </section>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
        <Link
          href="/admin/companies"
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700! shadow-sm hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-dark)] disabled:opacity-60"
        >
          {busy ? <span className="inline-flex items-center justify-center gap-2"><Spinner />Creating…</span> : "Create company"}
        </button>
      </div>
    </form>
  );
}
