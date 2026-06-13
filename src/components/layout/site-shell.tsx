import Link from "next/link";
import { ReactNode } from "react";

import { AppLogo } from "@/components/common/app-logo";
import { Button } from "@/components/ui/button";

type SiteShellProps = {
  children: ReactNode;
};

const navItems = [
  {
    label: "Cách hoạt động",
    href: "/#workflow",
  },
  {
    label: "Khách hàng",
    href: "/#customer",
  },
  {
    label: "Designer",
    href: "/#designer",
  },
  {
    label: "Vận hành",
    href: "/#operation",
  },
];

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="min-h-screen bg-[#f8fbff] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-blue-100/80 bg-white/88 backdrop-blur-2xl">
        <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-5 md:px-8">
          <Link href="/" aria-label="DesignMatch AI home">
            <AppLogo />
          </Link>

          <nav className="hidden items-center gap-8 text-[0.92rem] font-bold text-slate-600 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition hover:text-blue-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              className="hidden rounded-full border-blue-200 bg-white px-5 font-extrabold text-slate-800 shadow-sm hover:bg-blue-50 hover:text-blue-800 md:inline-flex"
            >
              <Link href="/register">Đăng ký designer</Link>
            </Button>

            <Button
              asChild
              className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white shadow-[0_14px_34px_rgba(6,26,58,0.25)] hover:bg-[#0b2a61]"
            >
              <Link href="/register">Tạo brief miễn phí</Link>
            </Button>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}