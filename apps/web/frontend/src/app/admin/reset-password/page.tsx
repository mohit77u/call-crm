import Image from "next/image";
import Link from "next/link";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata = { title: "Reset password" };

export default async function AdminResetPasswordPage({ searchParams }: PageProps<"/admin/reset-password">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-5">
      <div className="w-[400px] rounded-2xl bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        <Image src="/logo.png" className="mx-auto mb-3.5 block h-16 w-16 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.25)]" width={64} height={64} alt="Call CRM" />
        <h1 className="mb-1 text-center text-[22px] font-bold text-slate-900">Reset password</h1>
        <p className="mb-[22px] text-center text-[13px] text-slate-500">Choose a new password for your account</p>
        {value ? (
          <ResetForm token={value} />
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
              This reset link is invalid.
            </div>
            <p className="m-0 text-center text-slate-500">
              <Link href="/admin/forgot-password" className="text-inherit hover:underline">Request a new link</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
