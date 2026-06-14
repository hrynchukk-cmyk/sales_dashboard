import Shell from "@/components/Shell";
import { sellerPage } from "@/lib/page";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await sellerPage();
  return (
    <Shell role="SELLER" name={user.name}>
      {children}
    </Shell>
  );
}
