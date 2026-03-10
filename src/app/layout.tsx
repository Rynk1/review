import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grant Application & Peer Review System",
  description: "Multi-tenant grant application and peer review management platform for Higher Education Institutions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
