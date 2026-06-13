import { ReactNode } from "react";

import { requireRole } from "@/lib/auth/guards";

type DesignerLayoutProps = {
  children: ReactNode;
};

export default async function DesignerLayout({ children }: DesignerLayoutProps) {
  await requireRole(["designer"]);

  return children;
}