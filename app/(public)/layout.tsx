import { ReactNode } from "react";
import Footer from "@/layout/Footer";
import NavBar from "@/layout/NavBar";
import TopBar from "@/layout/TopBar";
import { listPublicMegaMenuProductCategories } from "@/features/product-categories/public";

export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const productCategories = await listPublicMegaMenuProductCategories();

  return (
    <>
      <TopBar />
      <NavBar productCategories={productCategories} />
      {children}
      <Footer />
    </>
  );
}
