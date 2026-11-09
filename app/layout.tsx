import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brie’s Lab — Systems Engineering Portfolio",
  description: "Brielle’s systems engineering portfolio. Practicing with hypothetical challenges to sharpen real-world problem-solving and troubleshooting skills.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
