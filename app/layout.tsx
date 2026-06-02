import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ImpersonateBannerServer from "@/components/impersonate-banner-server";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
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
      lang="en-GB"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          // Set the theme before first paint to avoid a flash of the wrong palette.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("wcn-theme");if(t!=="light"&&t!=="dark"){t="dark";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`,
          }}
        />
      </head>
      <body>
        <ImpersonateBannerServer />
        {children}
      </body>
    </html>
  );
}
