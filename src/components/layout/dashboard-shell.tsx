"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BriefcaseBusiness,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Palette,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import { AppLogo } from "@/components/common/app-logo";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/logout-button";

export type DashboardRole = "customer" | "designer" | "admin";

type DashboardShellProps = {
  role: DashboardRole;
  title: string;
  description: string;
  userName: string;
  userEmail?: string | null;
  children: ReactNode;
  action?: ReactNode;
};

type SidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

const roleMeta: Record<
  DashboardRole,
  {
    badge: string;
  }
> = {
  customer: {
    badge: "Customer",
  },
  designer: {
    badge: "Designer",
  },
  admin: {
    badge: "Admin",
  },
};

const sidebarItemsByRole: Record<DashboardRole, SidebarItem[]> = {
  customer: [
    {
      label: "Tổng quan",
      href: "/customer/dashboard",
      icon: LayoutDashboard,
      description: "Tình trạng brief và job",
    },
    {
      label: "Tạo brief AI",
      href: "/customer/requests/new",
      icon: Sparkles,
      description: "Bắt đầu yêu cầu thiết kế",
    },
    {
      label: "Request của tôi",
      href: "/customer/requests",
      icon: FileText,
      description: "Danh sách brief đã tạo",
    },
    {
      label: "Designer match",
      href: "/customer/matches",
      icon: UsersRound,
      description: "Gợi ý designer phù hợp",
    },
    {
      label: "Job & Payment",
      href: "/customer/jobs",
      icon: CreditCard,
      description: "Theo dõi dự án",
    },
  ],
  designer: [
    {
      label: "Tổng quan",
      href: "/designer/dashboard",
      icon: LayoutDashboard,
      description: "Hồ sơ và job",
    },
    {
      label: "Hồ sơ designer",
      href: "/designer/profile",
      icon: UserRound,
      description: "Thông tin chuyên môn",
    },
    {
      label: "Portfolio",
      href: "/designer/portfolio",
      icon: Palette,
      description: "Dữ liệu Style DNA",
    },
    {
      label: "Brief phù hợp",
      href: "/designer/matches",
      icon: Sparkles,
      description: "Request được đề xuất",
    },
    {
      label: "Job đang làm",
      href: "/designer/jobs",
      icon: BriefcaseBusiness,
      description: "Tiến độ dự án",
    },
    {
      label: "Reviews",
      href: "/designer/reviews",
      icon: Star,
      description: "Đánh giá từ customer",
    },
  ],
  admin: [
    {
      label: "Tổng quan",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      description: "Vận hành toàn hệ thống",
    },
    {
      label: "Duyệt designer",
      href: "/admin/designers",
      icon: ShieldCheck,
      description: "Kiểm tra hồ sơ",
    },
    {
      label: "Requests",
      href: "/admin/requests",
      icon: FileText,
      description: "Quản lý yêu cầu",
    },
    {
      label: "Jobs",
      href: "/admin/jobs",
      icon: BriefcaseBusiness,
      description: "Theo dõi dự án",
    },
    {
      label: "Payments",
      href: "/admin/payments",
      icon: CreditCard,
      description: "Đối soát thủ công",
    },
    {
      label: "Reviews",
      href: "/admin/reviews",
      icon: Star,
      description: "Chất lượng designer",
    },
  ],
};

export function DashboardShell({
  role,
  title,
  description,
  userName,
  userEmail,
  children,
  action,
}: DashboardShellProps) {
  const pathname = usePathname();
  const meta = roleMeta[role];
  const sidebarItems = sidebarItemsByRole[role];

  const activeHref =
    sidebarItems
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ??
    sidebarItems[0]?.href;

  return (
    <>
      <style>{`
        .dm-dashboard {
          min-height: 100vh;
          background:
            radial-gradient(circle at 20% 0%, rgba(219, 234, 254, 0.9), transparent 32%),
            radial-gradient(circle at 85% 10%, rgba(207, 250, 254, 0.58), transparent 30%),
            #f6f9ff;
          color: #020617;
        }

        .dm-sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: 300px;
          height: 100vh;
          z-index: 40;
          border-right: 1px solid rgba(191, 219, 254, 0.95);
          background: rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(24px);
          box-shadow: 12px 0 40px rgba(15, 23, 42, 0.045);
        }

        .dm-sidebar-inner {
          height: 100%;
          padding: 20px;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 18px;
        }

        .dm-sidebar-logo {
          display: flex;
          align-items: center;
          min-height: 54px;
        }

        .dm-sidebar-nav {
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          justify-content: flex-start;
        }

        .dm-sidebar-link {
          display: block;
          border-radius: 18px;
          border: 1px solid transparent;
          padding: 10px 12px;
          transition: 160ms ease;
          color: #334155;
        }

        .dm-sidebar-link:hover {
          border-color: rgba(191, 219, 254, 0.95);
          background: rgba(239, 246, 255, 0.88);
        }

        .dm-sidebar-link-active {
          border-color: #061a3a;
          background: #061a3a;
          color: white;
          box-shadow: 0 16px 34px rgba(6, 26, 58, 0.2);
        }

        .dm-sidebar-icon {
          width: 38px;
          height: 38px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .dm-user-card {
          border: 1px solid rgba(191, 219, 254, 0.95);
          border-radius: 22px;
          background: white;
          padding: 14px;
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
        }

        .dm-content {
          min-width: 0;
          padding-left: 300px;
        }

        .dm-header {
          position: sticky;
          top: 0;
          z-index: 30;
          border-bottom: 1px solid rgba(191, 219, 254, 0.95);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(24px);
        }

        .dm-header-inner {
          max-width: 1440px;
          min-height: 88px;
          margin: 0 auto;
          padding: 16px 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .dm-main {
          max-width: 1440px;
          margin: 0 auto;
          padding: 26px 30px 48px;
        }

        @media (max-height: 760px) {
          .dm-sidebar-inner {
            padding: 18px;
            gap: 14px;
          }

          .dm-sidebar-link {
            padding: 8px 11px;
          }

          .dm-sidebar-icon {
            width: 34px;
            height: 34px;
            border-radius: 14px;
          }

          .dm-user-card {
            padding: 12px;
          }
        }

        @media (max-width: 1023px) {
          .dm-sidebar {
            display: none;
          }

          .dm-content {
            padding-left: 0;
          }

          .dm-header-inner,
          .dm-main {
            padding-left: 20px;
            padding-right: 20px;
          }
        }
      `}</style>

      <div className="dm-dashboard">
        <aside className="dm-sidebar">
          <div className="dm-sidebar-inner">
            <Link
              href="/"
              aria-label="DesignMatch AI home"
              className="dm-sidebar-logo"
            >
              <AppLogo />
            </Link>

            <nav className="dm-sidebar-nav">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === activeHref;

                return (
                  <Link
                    key={`${role}-${item.label}-${item.href}`}
                    href={item.href}
                    className={`dm-sidebar-link ${
                      isActive ? "dm-sidebar-link-active" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`dm-sidebar-icon ring-1 ${
                          isActive
                            ? "bg-white/12 text-sky-100 ring-white/10"
                            : "bg-white text-blue-700 ring-blue-100"
                        }`}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold tracking-[-0.02em]">
                          {item.label}
                        </p>

                        <p
                          className={`mt-0.5 truncate text-xs font-medium ${
                            isActive ? "text-sky-100/72" : "text-slate-500"
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="dm-user-card">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#061a3a] text-white">
                  <UserRound className="size-5" aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[#061a3a]">
                    {userName}
                  </p>

                  <p className="truncate text-xs font-medium text-slate-500">
                    {userEmail ?? "No email"}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <LogoutButton />
              </div>
            </div>
          </div>
        </aside>

        <div className="dm-content">
          <header className="dm-header">
            <div className="dm-header-inner">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="info">{meta.badge}</StatusPill>
                  <StatusPill tone="success">Session active</StatusPill>
                </div>

                <h1 className="mt-2 truncate text-2xl font-extrabold tracking-[-0.05em] text-[#061a3a] md:text-3xl">
                  {title}
                </h1>

                <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                  {description}
                </p>
              </div>

              <div className="hidden shrink-0 items-center gap-3 xl:flex">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-2xl border-blue-100 bg-white"
                >
                  <Bell className="size-4" aria-hidden="true" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-2xl border-blue-100 bg-white"
                >
                  <MessageSquare className="size-4" aria-hidden="true" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-2xl border-blue-100 bg-white"
                >
                  <Settings className="size-4" aria-hidden="true" />
                </Button>

                {action}
              </div>
            </div>
          </header>

          <main className="dm-main">{children}</main>
        </div>
      </div>
    </>
  );
}