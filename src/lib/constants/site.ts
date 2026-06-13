export type AppRole = "guest" | "customer" | "designer" | "admin";

export const siteConfig = {
  name: "DesignMatch AI",
  tagline: "Đúng brief. Đúng gu. Đúng designer.",
  description:
    "Nền tảng AI Creative Matching giúp hộ kinh doanh nhỏ tạo brief thiết kế, xem concept trực quan và kết nối đúng designer theo phong cách thị giác.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  creator: "DesignMatch AI Team",
} as const;

export const appRoles: Array<{
  id: AppRole;
  label: string;
  description: string;
}> = [
  {
    id: "guest",
    label: "Guest",
    description: "Xem landing page, pricing, FAQ và đăng ký tài khoản.",
  },
  {
    id: "customer",
    label: "Customer",
    description: "Tạo brief, chạy AI, tìm designer, quản lý job.",
  },
  {
    id: "designer",
    label: "Designer",
    description: "Tạo hồ sơ, upload portfolio, nhận brief và gửi proposal.",
  },
  {
    id: "admin",
    label: "Admin",
    description: "Duyệt designer, quản lý request, job, payment và report.",
  },
];

export const foundationModules = [
  "Next.js App Router",
  "TypeScript",
  "Tailwind CSS",
  "ShadCN UI",
  "Role-based architecture",
  "Supabase-ready structure",
  "AI-ready service layer",
  "Payment-ready module",
] as const;