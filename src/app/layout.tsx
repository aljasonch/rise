import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Hydrate from "@/components/Hydrate";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RISE Psikotes",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geist.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <Hydrate>{children}</Hydrate>
      </body>
    </html>
  );
}
