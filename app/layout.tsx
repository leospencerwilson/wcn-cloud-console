import type { Metadata } from "next";
import { Archivo, Raleway, Space_Grotesk } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WCN Cloud Console",
  description: "Manage your WCN Cloud customer environment.",
  icons: {
    icon: "/brand/favicon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${raleway.variable} ${spaceGrotesk.variable}`}
    >
      <body className="min-h-screen bg-neutral-50 text-brand-charcoal font-raleway antialiased">
        {children}
      </body>
    </html>
  );
}
