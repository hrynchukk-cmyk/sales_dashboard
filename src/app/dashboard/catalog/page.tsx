import { sellerPageLocked } from "@/lib/page";
import Catalog from "@/components/Catalog";

export default async function SellerCatalogPage() {
  await sellerPageLocked();
  // Sellers can add products but not delete (per SoW 2.5).
  return <Catalog canDelete={false} />;
}
