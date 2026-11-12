import Image from "next/image";
import Link from "next/link";
import { platformLogin } from "../actions";

export const metadata = { title: "Admin login" };


export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { error, reset } = await searchParams;
  return (
    <div className="auth">
      <div className="card">
        <Image src="/logo.png" className="auth-logo" width={64} height={64} alt="Call CRM" />
        <h1>Admin login</h1>
        <p className="subtitle">Platform administrator access</p>
        <form action={platformLogin} className="form">
          {error && <div className="error">{error}</div>}
          {reset && <div className="notice">Password updated. You can log in now.</div>}
          <label>Email<input name="email" type="email" required autoFocus /></label>
          <label>Password<input name="password" type="password" required /></label>
          <button type="submit">Login</button>
          <p className="muted"><Link href="/forgot-password">Forgot password?</Link></p>
        </form>
      </div>
    </div>
  );
}
