import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MedScan AI — Medical Analysis & Prescription Cross-Checker',
  description: 'AI-powered medical document analysis, prescription cross-checking, and skin wound triage.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet' />
      </head>
      <body>{children}</body>
    </html>
  );
}
