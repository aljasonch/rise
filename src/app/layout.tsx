import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import Hydrate from "@/components/Hydrate";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RISE | Psikotes",
  description: "Psikotes untuk FIFGROUP",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${archivo.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <Hydrate>{children}</Hydrate>
      </body>
    </html>
  );
}
