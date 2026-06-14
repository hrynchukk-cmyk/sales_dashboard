"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type NavItem = { href: string; label: string; icon: string };

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Дашборд", icon: "ti-chart-bar" },
  { href: "/admin/sellers", label: "Продавці", icon: "ti-users" },
  { href: "/admin/course", label: "Курс", icon: "ti-school" },
  { href: "/admin/catalog", label: "Каталог", icon: "ti-package" },
  { href: "/admin/reports", label: "Звіти", icon: "ti-file-text" },
  { href: "/admin/settings", label: "Налаштування", icon: "ti-settings" },
];

const SELLER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Дашборд", icon: "ti-chart-bar" },
  { href: "/dashboard/sales", label: "Запис продажів", icon: "ti-plus" },
  { href: "/dashboard/bonus", label: "Бонуси", icon: "ti-star" },
  { href: "/dashboard/catalog", label: "Каталог", icon: "ti-package" },
  { href: "/dashboard/course", label: "Курс", icon: "ti-school" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Shell({
  role,
  name,
  children,
}: {
  role: "ADMIN" | "SELLER";
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nav = role === "ADMIN" ? ADMIN_NAV : SELLER_NAV;

  function isActive(href: string) {
    if (href === "/admin" || href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Topbar */}
      <div className="h-12 bg-white border-b border-line flex items-center px-4 gap-3 sticky top-0 z-20 shadow-card">
        <button
          className="md:hidden text-[#555] text-xl"
          onClick={() => setOpen((v) => !v)}
          aria-label="Меню"
        >
          <i className="ti ti-menu-2" />
        </button>
        <div className="text-[13px] font-semibold text-[#111]">Sales Platform</div>
        <div className="flex-1" />
        <span className="text-[11px] text-[#888] hidden sm:block">
          {role === "ADMIN" ? "Адмін" : name}
        </span>
        <div className="w-7 h-7 rounded-full bg-[#E8E8E8] border border-[#D0D0D0] flex items-center justify-center text-[10px] font-semibold text-[#555]">
          {initials(name)}
        </div>
        <button onClick={logout} className="text-[#999] hover:text-[#C62828]" title="Вийти">
          <i className="ti ti-logout text-[18px]" />
        </button>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`${
            open ? "block" : "hidden"
          } md:block w-[200px] bg-white border-r border-line py-3 flex-shrink-0 fixed md:static top-12 bottom-0 z-10`}
        >
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`px-4 py-2 text-[12px] flex items-center gap-2.5 ${
                  active
                    ? "bg-[#F5F5F5] text-[#111] font-medium border-l-2 border-[#333]"
                    : "text-[#777] hover:text-[#111] hover:bg-[#FAFAFA]"
                }`}
              >
                <i className={`ti ${item.icon} text-[15px] opacity-70`} />
                {item.label}
              </Link>
            );
          })}
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="p-4 flex flex-col gap-3 max-w-[1100px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
