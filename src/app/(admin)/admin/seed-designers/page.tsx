import { redirect } from "next/navigation";
import { Database, Palette, ShieldCheck, UsersRound } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SeedDesignersButton } from "@/features/admin/seed/components/seed-designers-button";
import { requireRole } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function SeedDesignersPage() {
  const authState = await requireRole(["admin"]);
  const profile = authState.profile;

  if (!profile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient();

  const { count: designerCount } = await adminSupabase
    .from("designer_profiles")
    .select("id", {
      count: "exact",
      head: true,
    });

  const { count: portfolioCount } = await adminSupabase
    .from("portfolio_items")
    .select("id", {
      count: "exact",
      head: true,
    });

  const { count: approvedDesignerCount } = await adminSupabase
    .from("designer_profiles")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("verification_status", "approved");

  return (
    <DashboardShell
      role="admin"
      title="Seed designer data"
      description="Tạo designer và portfolio mẫu trong Supabase để chuẩn bị cho luồng matching thật."
      userName={profile.full_name}
      userEmail={authState.userEmail}
      action={<SeedDesignersButton />}
    >
      <section className="grid gap-5 md:grid-cols-3">
        <DashboardStatCard
          icon={UsersRound}
          label="Designers"
          value={designerCount ?? 0}
          description="Tổng số designer profile hiện có trong Supabase."
        />

        <DashboardStatCard
          icon={ShieldCheck}
          label="Approved"
          value={approvedDesignerCount ?? 0}
          description="Designer đã được duyệt và có thể dùng cho matching."
        />

        <DashboardStatCard
          icon={Palette}
          label="Portfolio"
          value={portfolioCount ?? 0}
          description="Portfolio item dùng để tạo Style DNA và matching."
        />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Seed operation
              </p>

              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Tạo dữ liệu designer mẫu
              </h2>
            </div>

            <StatusPill tone="warning">Admin only</StatusPill>
          </div>

          <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
            Nút này sẽ tạo designer mẫu, tự tạo auth users, profile, designer
            profile và portfolio trong Supabase. Có thể bấm lại nhiều lần; hệ
            thống sẽ cập nhật dữ liệu thay vì tạo trùng designer.
          </p>

          <div className="mt-6">
            <SeedDesignersButton />
          </div>
        </SurfaceCard>

        <SurfaceCard variant="dark" className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/70">
            Why this matters
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-white">
            Matching cần dữ liệu designer thật.
          </h2>

          <p className="mt-4 text-sm font-medium leading-7 text-sky-100/72">
            Trước bước này, request và AI brief đã được lưu thật, nhưng designer
            vẫn còn là mock trong code. Sau khi seed designer vào Supabase, hệ
            thống có thể match designer từ database thật.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <div className="flex items-start gap-3">
              <Database className="mt-1 size-5 shrink-0 text-sky-200" />

              <p className="text-sm font-medium leading-7 text-sky-100/80">
                Sau khi seed xong, kiểm tra bảng designer_profiles và
                portfolio_items trong Supabase Table Editor.
              </p>
            </div>
          </div>
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}