export const metadata = {
  title: 'Economist CLI – Pro Onboarding',
  description: 'Sign up and manage your Economist CLI Pro subscription',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, Segoe UI, Roboto, Helvetica, Arial', padding: 24, lineHeight: 1.5 }}>
        <main style={{ maxWidth: 720, margin: '0 auto' }}>{children}</main>
      </body>
    </html>
  );
}
