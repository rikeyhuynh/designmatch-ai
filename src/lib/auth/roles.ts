export type AuthRole = "customer" | "designer" | "admin";

export const authRoleOptions: Array<{
  id: AuthRole;
  label: string;
  description: string;
}> = [
  {
    id: "customer",
    label: "Khách hàng",
    description: "Tạo brief, nhận AI hỗ trợ và tìm designer phù hợp.",
  },
  {
    id: "designer",
    label: "Designer",
    description: "Tạo hồ sơ, upload portfolio và nhận brief phù hợp.",
  },
];

export function getDashboardPathByRole(role: unknown) {
  if (role === "designer") {
    return "/designer/dashboard";
  }

  if (role === "admin") {
    return "/admin/dashboard";
  }

  return "/customer/dashboard";
}