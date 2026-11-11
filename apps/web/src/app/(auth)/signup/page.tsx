import Link from "next/link";
import { signup } from "../actions";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { error } = await searchParams;
  return (
    <div className="auth">
      <div className="card">
        <h1>Create company account</h1>
        <form action={signup} className="form">
          {error && <div className="error">{error}</div>}
          <label>Company name<input name="company" required autoFocus /></label>
          <label>Your name<input name="name" required /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>Password (min 8 characters)<input name="password" type="password" minLength={8} required /></label>
          <button type="submit">Sign up</button>
          <p className="muted">Already have an account? <Link href="/login">Login</Link></p>
        </form>
      </div>
    </div>
  );
}
