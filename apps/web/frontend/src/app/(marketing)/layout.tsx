import Image from "next/image";
import Link from "next/link";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="site">
      <header className="site-nav">
        <div className="site-nav-inner">
          <Link href="/" className="site-brand">
            <Image src="/logo.png" width={34} height={34} alt="Call CRM" />
            <span>Call CRM</span>
          </Link>
          <nav className="site-links">
            <Link href="/">Home</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <div className="site-actions">
            <Link href="/company/login" className="btn secondary">Login</Link>
            <Link href="/pricing" className="btn">Get started</Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="site-nav-inner footer-grid">
          <div>
            <div className="site-brand" style={{ color: "#fff" }}>
              <Image src="/logo.png" width={26} height={26} alt="" />
              <span>Call CRM</span>
            </div>
            <p className="muted" style={{ marginTop: 10, maxWidth: 280 }}>
              Simple, honest call tracking for sales and support teams.
            </p>
          </div>
          <div className="footer-col">
            <b>Product</b>
            <Link href="/pricing">Pricing</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact us</Link>
          </div>
          <div className="footer-col">
            <b>Legal</b>
            <Link href="/terms">Terms &amp; Conditions</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
          <div className="footer-col">
            <b>Account</b>
            <Link href="/company/login">Company login</Link>
          </div>
        </div>
        <div className="site-nav-inner footer-bottom muted">
          © {new Date().getFullYear()} Call CRM. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
