import Image from "next/image";
import Link from "next/link";
import { resetPassword } from "../actions";

export const metadata = { title: "Reset password" };


export default async function ResetPasswordPage({ searchParams }: PageProps<"/company/reset-password">) {
  const { error, token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  return (
    <div className="auth">
      <div className="card">
        <Image src="/logo.png" className="auth-logo" width={64} height={64} alt="Call CRM" />
        <h1>Reset password</h1>
        <p className="subtitle">Choose a new password for your account</p>
        {value ? (
          <form action={resetPassword} className="form">
            {error && <div className="error">{error}</div>}
            <input type="hidden" name="token" value={value} />
            <label>New password (min 8 characters)<input name="password" type="password" minLength={8} required autoFocus /></label>
            <button type="submit">Save password</button>
          </form>
        ) : (
          <>
            <div className="error">{error || "This reset link is invalid."}</div>
            <p className="muted"><Link href="/company/forgot-password">Request a new link</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
