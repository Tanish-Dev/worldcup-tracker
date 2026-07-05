export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="site-dark flex min-h-screen flex-col text-ink-primary">
      {/* pt-20 clears the floating pill nav rendered by the root layout */}
      <main className="flex-1 pt-20">{children}</main>
    </div>
  );
}
