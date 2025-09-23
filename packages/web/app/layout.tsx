import './globals.css';

export const metadata = {
  title: 'Economist CLI',
  description: 'Economist CLI website and onboarding',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
