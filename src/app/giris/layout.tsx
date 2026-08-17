import "@/features/auth/auth-brand-purple.css";

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="login-brand-scope">{children}</div>;
}
