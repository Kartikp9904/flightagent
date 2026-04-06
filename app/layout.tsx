import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flight Agent | Intelligent Search",
  description: "Advanced AI-powered flight search and automated notifications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
