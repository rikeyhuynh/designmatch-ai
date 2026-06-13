import {
  CheckCircle2,
  Database,
  KeyRound,
  ShieldCheck,
  Table2,
  XCircle,
} from "lucide-react";

import { AppContainer } from "@/components/common/app-container";
import { SectionHeading } from "@/components/common/section-heading";
import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { SiteShell } from "@/components/layout/site-shell";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { getDatabaseHealth } from "@/lib/supabase/database-health";

export default async function DatabaseHealthPage() {
  const configStatus = getSupabaseConfigStatus();
  const health = await getDatabaseHealth();

  return (
    <SiteShell>
      <main className="business-blue-bg min-h-screen border-t border-blue-100">
        <AppContainer className="py-12 md:py-16">
          <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
            <SurfaceCard className="p-6 md:p-8">
              <div className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Database className="size-5" aria-hidden="true" />
              </div>

              <StatusPill
                tone={health.ok ? "success" : "warning"}
                className="mt-5"
              >
                {health.ok ? "Database connected" : "Need attention"}
              </StatusPill>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.06] tracking-[-0.055em] text-[#061a3a] md:text-5xl">
                Kiểm tra schema thật trên Supabase.
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600">
                Trang này dùng server-side admin client để kiểm tra Next.js có
                đọc được các bảng thật trong Supabase hay chưa. Nếu tất cả bảng
                đều OK, ta có thể chuyển sang seed data.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <StatusPill tone={configStatus.hasUrl ? "success" : "warning"}>
                  URL {configStatus.hasUrl ? "OK" : "Missing"}
                </StatusPill>

                <StatusPill
                  tone={configStatus.hasPublicKey ? "success" : "warning"}
                >
                  Public key {configStatus.hasPublicKey ? "OK" : "Missing"}
                </StatusPill>

                <StatusPill
                  tone={configStatus.hasSecretKey ? "success" : "warning"}
                >
                  Admin key {configStatus.hasSecretKey ? "OK" : "Missing"}
                </StatusPill>
              </div>
            </SurfaceCard>

            <SurfaceCard variant="dark" className="p-6 md:p-8">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/70">
                Health Summary
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <SummaryCard
                  label="Tables checked"
                  value={health.checks.length}
                />
                <SummaryCard
                  label="Tables OK"
                  value={health.checks.filter((check) => check.ok).length}
                />
                <SummaryCard
                  label="Admin key"
                  value={health.hasAdminKey ? "OK" : "Missing"}
                />
                <SummaryCard
                  label="Status"
                  value={health.ok ? "Ready" : "Issue"}
                />
              </div>

              {health.error ? (
                <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/10 p-5">
                  <div className="flex gap-3">
                    <XCircle className="mt-1 size-5 shrink-0 text-red-200" />
                    <p className="text-sm font-medium leading-7 text-red-50/90">
                      {health.error}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-1 size-5 shrink-0 text-sky-200" />
                    <p className="text-sm font-medium leading-7 text-sky-100/76">
                      Health check chỉ dùng ở server-side. Không đưa secret key
                      ra browser hoặc client component.
                    </p>
                  </div>
                </div>
              )}
            </SurfaceCard>
          </section>

          <section className="mt-12">
            <SectionHeading
              eyebrow="Table checks"
              title="Kết quả kiểm tra từng bảng."
              description="Count hiện tại có thể bằng 0 vì ta chưa seed dữ liệu. Điều quan trọng ở bước này là mỗi bảng trả về trạng thái OK."
            />

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {health.checks.map((check) => (
                <SurfaceCard key={check.tableName} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                      <Table2 className="size-5" aria-hidden="true" />
                    </div>

                    <StatusPill tone={check.ok ? "success" : "danger"}>
                      {check.ok ? "OK" : "Error"}
                    </StatusPill>
                  </div>

                  <h2 className="mt-5 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
                    {check.tableName}
                  </h2>

                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/55 p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                      <KeyRound className="size-4" aria-hidden="true" />
                      Row count
                    </div>

                    <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-[#061a3a]">
                      {check.count ?? "--"}
                    </p>
                  </div>

                  {check.error ? (
                    <p className="mt-4 text-sm font-semibold leading-7 text-red-600">
                      {check.error}
                    </p>
                  ) : (
                    <p className="mt-4 flex items-start gap-2 text-sm font-medium leading-7 text-slate-600">
                      <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
                      Bảng tồn tại và có thể truy vấn từ server.
                    </p>
                  )}
                </SurfaceCard>
              ))}
            </div>
          </section>
        </AppContainer>
      </main>
    </SiteShell>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-3xl font-black tracking-[-0.055em] text-white">
        {value}
      </p>

      <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
        {label}
      </p>
    </div>
  );
}