import { ReactNode } from "react";

import { requireRole } from "@/lib/auth/guards";

type CustomerLayoutProps = {
  children: ReactNode;
};

export default async function CustomerLayout({ children }: CustomerLayoutProps) {
  await requireRole(["customer"]);

  return children;
}