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
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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

const LOGO_SRC = "/brand/designmatch-logo.png";

const roleMeta: Record<
  DashboardRole,
  {
    badge: string;
    eyebrow: string;
  }
> = {
  customer: {
    badge: "Customer",
    eyebrow: "Design request workspace",
  },
  designer: {
    badge: "Designer",
    eyebrow: "Creative delivery workspace",
  },
  admin: {
    badge: "Admin",
    eyebrow: "Operating workspace",
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
      description: "Đối soát thanh toán",
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
      .filter(
        (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ??
    sidebarItems[0]?.href;

  return (
    <>
      <style>{`
        .dm-dashboard {
          min-height: 100vh;
          background:
            radial-gradient(circle at 16% -8%, rgba(219, 234, 254, 0.95), transparent 34%),
            radial-gradient(circle at 90% 0%, rgba(207, 250, 254, 0.6), transparent 30%),
            linear-gradient(180deg, #f8fbff 0%, #f4f8ff 46%, #f7fbff 100%);
          color: #020617;
        }

        .dm-sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: 292px;
          height: 100vh;
          z-index: 40;
          border-right: 1px solid rgba(191, 219, 254, 0.82);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(28px);
          box-shadow: 14px 0 44px rgba(15, 23, 42, 0.055);
        }

        .dm-sidebar-inner {
          height: 100%;
          padding: 18px;
          display: grid;
          grid-template-rows: auto auto 1fr auto;
          gap: 14px;
        }

        .dm-brand-card {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 78px;
          border-radius: 24px;
          border: 1px solid rgba(191, 219, 254, 0.9);
          background:
            radial-gradient(circle at 12% 0%, rgba(59, 130, 246, 0.08), transparent 38%),
            #ffffff;
          padding: 12px 16px;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.055);
          overflow: hidden;
        }

        .dm-brand-image {
          width: 214px;
          height: auto;
          max-height: 54px;
          object-fit: contain;
          object-position: center;
          display: block;
        }

        .dm-sidebar-context {
          border-radius: 20px;
          border: 1px solid rgba(191, 219, 254, 0.88);
          background:
            linear-gradient(135deg, rgba(6, 26, 58, 0.98), rgba(15, 52, 118, 0.98));
          padding: 12px 14px;
          color: white;
          box-shadow: 0 16px 36px rgba(6, 26, 58, 0.18);
        }

        .dm-sidebar-nav {
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          justify-content: flex-start;
          overflow-y: auto;
          padding-right: 2px;
          padding-top: 2px;
        }

        .dm-sidebar-nav::-webkit-scrollbar {
          width: 5px;
        }

        .dm-sidebar-nav::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.35);
        }

        .dm-sidebar-link {
          display: block;
          border-radius: 18px;
          border: 1px solid transparent;
          padding: 10px 11px;
          color: #334155;
          text-decoration: none;
          transition:
            background-color 160ms ease,
            border-color 160ms ease,
            color 160ms ease,
            transform 160ms ease,
            box-shadow 160ms ease;
        }

        .dm-sidebar-link:not(.dm-sidebar-link-active):hover {
          border-color: rgba(147, 197, 253, 0.75);
          background: rgba(239, 246, 255, 0.95);
          color: #061a3a;
          transform: translateX(2px);
        }

        .dm-sidebar-link-active {
          border-color: rgba(6, 26, 58, 0.95);
          background:
            radial-gradient(circle at 14% 12%, rgba(56, 189, 248, 0.18), transparent 32%),
            #061a3a;
          color: white;
          box-shadow: 0 16px 34px rgba(6, 26, 58, 0.22);
        }

        .dm-sidebar-icon {
          width: 38px;
          height: 38px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .dm-sidebar-link-active .dm-sidebar-item-title {
          color: #ffffff;
        }

        .dm-sidebar-link-active .dm-sidebar-item-desc {
          color: rgba(224, 242, 254, 0.74);
        }

        .dm-user-card {
          border: 1px solid rgba(191, 219, 254, 0.9);
          border-radius: 24px;
          background: white;
          padding: 14px;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.075);
        }

        .dm-user-avatar {
          position: relative;
          display: grid;
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          place-items: center;
          border-radius: 18px;
          background:
            radial-gradient(circle at 30% 10%, rgba(56, 189, 248, 0.35), transparent 35%),
            #061a3a;
          color: white;
        }

        .dm-user-avatar::after {
          content: "";
          position: absolute;
          right: -1px;
          bottom: -1px;
          width: 11px;
          height: 11px;
          border: 2px solid white;
          border-radius: 999px;
          background: #10b981;
        }

        .dm-content {
          min-width: 0;
          padding-left: 292px;
        }

        .dm-header {
          position: sticky;
          top: 0;
          z-index: 30;
          border-bottom: 1px solid rgba(191, 219, 254, 0.82);
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(28px);
        }

        .dm-header-inner {
          max-width: 1480px;
          min-height: 96px;
          margin: 0 auto;
          padding: 18px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .dm-header-title {
          max-width: 760px;
        }

        .dm-header-actions {
          display: none;
          flex-shrink: 0;
          align-items: center;
          gap: 10px;
        }

        .dm-icon-button {
          border-radius: 18px;
          border-color: rgba(191, 219, 254, 0.95);
          background: rgba(255, 255, 255, 0.85);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.045);
        }

        .dm-main {
          max-width: 1480px;
          margin: 0 auto;
          padding: 26px 32px 52px;
        }

        .dm-mobile-brand {
          display: none;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(191, 219, 254, 0.82);
          background: rgba(255, 255, 255, 0.92);
          padding: 14px 20px;
          backdrop-filter: blur(24px);
        }

        .dm-mobile-logo {
          width: 170px;
          height: auto;
          max-height: 44px;
          object-fit: contain;
          object-position: left center;
        }

        @media (min-width: 1280px) {
          .dm-header-actions {
            display: flex;
          }
        }

        @media (max-height: 760px) {
          .dm-sidebar-inner {
            padding: 14px;
            gap: 10px;
          }

          .dm-brand-card {
            min-height: 66px;
            padding: 10px 14px;
          }

          .dm-brand-image {
            width: 190px;
            max-height: 48px;
          }

          .dm-sidebar-context {
            padding: 10px 12px;
          }

          .dm-sidebar-link {
            padding: 8px 10px;
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

          .dm-mobile-brand {
            display: flex;
          }

          .dm-header-inner,
          .dm-main {
            padding-left: 20px;
            padding-right: 20px;
          }

          .dm-header-inner {
            min-height: 86px;
          }
        }
      `}</style>

      <div className="dm-dashboard">
        <aside className="dm-sidebar">
          <div className="dm-sidebar-inner">
            <Link
              href="/"
              aria-label="DesignMatch AI home"
              className="dm-brand-card"
            >
              <Image
                src={LOGO_SRC}
                alt="DesignMatch AI"
                width={428}
                height={108}
                priority
                className="dm-brand-image"
              />
            </Link>

            <div className="dm-sidebar-context">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-sky-200/75">
                {meta.eyebrow}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill tone="info">{meta.badge}</StatusPill>
                <StatusPill tone="success">Active</StatusPill>
              </div>
            </div>

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
                        <p className="dm-sidebar-item-title truncate text-sm font-extrabold tracking-[-0.02em]">
                          {item.label}
                        </p>

                        <p
                          className={`dm-sidebar-item-desc mt-0.5 truncate text-xs font-medium ${
                            isActive ? "" : "text-slate-500"
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
                <div className="dm-user-avatar">
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
          <div className="dm-mobile-brand">
            <Link href="/" aria-label="DesignMatch AI home">
              <Image
                src={LOGO_SRC}
                alt="DesignMatch AI"
                width={340}
                height={88}
                priority
                className="dm-mobile-logo"
              />
            </Link>

            <StatusPill tone="info">{meta.badge}</StatusPill>
          </div>

          <header className="dm-header">
            <div className="dm-header-inner">
              <div className="dm-header-title min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="info">{meta.badge}</StatusPill>
                  <StatusPill tone="success">Session active</StatusPill>
                </div>

                <h1 className="mt-2 truncate text-2xl font-black tracking-[-0.055em] text-[#061a3a] md:text-3xl">
                  {title}
                </h1>

                <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-600">
                  {description}
                </p>
              </div>

              <div className="dm-header-actions">
                <Button
                  variant="outline"
                  size="icon"
                  className="dm-icon-button"
                  aria-label="Notifications"
                >
                  <Bell className="size-4" aria-hidden="true" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="dm-icon-button"
                  aria-label="Messages"
                >
                  <MessageSquare className="size-4" aria-hidden="true" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="dm-icon-button"
                  aria-label="Settings"
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