import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UNO Online - Play with Friends',
  description: 'Play UNO with friends online in real-time. No account needed.',
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