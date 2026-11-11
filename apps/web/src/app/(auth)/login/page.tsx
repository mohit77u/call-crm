import Link from "next/link";
import { login } from "../actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <div className="auth">
      <div className="card">
        <h1>Call CRM login</h1>
        <form action={login} className="form">
          {error && <div className="error">{error}</div>}
          <label>Email<input name="email" type="email" required autoFocus /></label>
          <label>Password<input name="password" type="password" required /></label>
          <button type="submit">Login</button>
          <p className="muted">New company? <Link href="/signup">Create an account</Link></p>
        </form>
      </div>
    </div>
  );
}
