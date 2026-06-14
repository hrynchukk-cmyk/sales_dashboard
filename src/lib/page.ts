import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";

/** Server-component guard: returns the user or redirects. */
export async function pageUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function adminPage() {
  const user = await pageUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export async function sellerPage() {
  const user = await pageUser();
  if (user.role === "ADMIN") redirect("/admin");
  return user;
}

/** Locks the seller out of everything but the course until onboarding is done. */
export async function sellerPageLocked() {
  const user = await sellerPage();
  if (!user.onboardingDone) redirect("/dashboard/course");
  return user;
}
