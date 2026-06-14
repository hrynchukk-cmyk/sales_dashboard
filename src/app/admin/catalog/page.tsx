import { adminPage } from "@/lib/page";
import Catalog from "@/components/Catalog";

export default async function AdminCatalogPage() {
  await adminPage();
  return <Catalog canDelete={true} />;
}
