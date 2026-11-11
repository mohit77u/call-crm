import Link from "next/link";
import { requestPasswordReset } from "../actions";

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const { error, sent } = await searchParams;
  return (
    <div className="auth">
      <div className="card">
        <h1>Forgot password</h1>
        {sent ? (
          <>
            <p className="notice">If that email is registered, a reset link has been sent. Check your inbox.</p>
            <p className="muted"><Link href="/login">Back to login</Link></p>
          </>
        ) : (
          <form action={requestPasswordReset} className="form">
            {error && <div className="error">{error}</div>}
            <p className="muted">Enter the email for your company or admin account. We will send a reset link.</p>
            <label>Email<input name="email" type="email" required autoFocus /></label>
            <button type="submit">Send reset link</button>
            <p className="muted"><Link href="/login">Back to login</Link></p>
          </form>
        )}
      </div>
    </div>
  );
}
