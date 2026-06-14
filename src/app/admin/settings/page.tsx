import { adminPage } from "@/lib/page";
import { prisma } from "@/lib/db";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  await adminPage();
  const settings =
    (await prisma.settings.findFirst()) ??
    (await prisma.settings.create({ data: { id: 1 } }));

  return (
    <SettingsForm
      initial={{
        bonusPerActivity: settings.bonusPerActivity,
        companyName: settings.companyName,
      }}
    />
  );
}
