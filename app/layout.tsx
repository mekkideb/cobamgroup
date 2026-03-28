import type { Metadata } from "next";
import "@fontsource/sora/300.css";
import "@fontsource/sora/400.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "@fontsource/source-serif-4/700.css";
import "./globals.css";
import Footer from "@/layout/Footer";
import NavBar from "@/layout/NavBar";
import TopBar from "@/layout/TopBar";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "COBAM GROUP | Carrelage, Sanitaire, Robinetterie",
  description:
    "Depuis 1994, COBAM GROUP est votre partenaire de confiance pour les matériaux de construction, carrelage, sanitaires et robinetterie en Tunisie.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body
        className="antialiased bg-white text-cobam-dark-blue"
        style={{ fontFamily: "var(--font-montserrat), sans-serif" }}
      >
        {children}
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
