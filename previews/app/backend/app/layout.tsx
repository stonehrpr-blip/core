import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CORE',
  description: 'The habit app you can\'t lie to.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
