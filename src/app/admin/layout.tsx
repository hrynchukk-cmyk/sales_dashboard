import Shell from "@/components/Shell";
import { adminPage } from "@/lib/page";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await adminPage();
  return (
    <Shell role="ADMIN" name={user.name}>
      {children}
    </Shell>
  );
}
