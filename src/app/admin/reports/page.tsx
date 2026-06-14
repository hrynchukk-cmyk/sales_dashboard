import { adminPage } from "@/lib/page";
import { prisma } from "@/lib/db";
import ReportsView from "./ReportsView";

export default async function ReportsPage() {
  await adminPage();
  const sellers = await prisma.user.findMany({
    where: { role: "SELLER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return <ReportsView sellers={sellers} />;
}
