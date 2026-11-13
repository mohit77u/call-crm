import Image from "next/image";
import { platformLogin } from "../actions";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Admin login" };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-5">
      <div className="w-[400px] rounded-2xl bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        <Image src="/logo.png" className="mx-auto mb-3.5 block h-16 w-16 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.25)]" width={64} height={64} alt="Call CRM" />
        <h1 className="mb-1 text-center text-[22px] font-bold text-slate-900">Admin login</h1>
        <p className="mb-[22px] text-center text-[13px] text-slate-500">Platform administrator access</p>
        <LoginForm action={platformLogin} forgotHref="/admin/forgot-password" />
      </div>
    </div>
  );
}
