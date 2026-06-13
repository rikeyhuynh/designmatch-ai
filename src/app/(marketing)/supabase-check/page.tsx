import {
  CheckCircle2,
  Database,
  KeyRound,
  Link2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { AppContainer } from "@/components/common/app-container";
import { SectionHeading } from "@/components/common/section-heading";
import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { SiteShell } from "@/components/layout/site-shell";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

export default function SupabaseCheckPage() {
  const status = getSupabaseConfigStatus();

  return (
    <SiteShell>
      <main className="business-blue-bg min-h-screen border-t border-blue-100">
        <AppContainer className="py-12 md:py-16">
          <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
            <SurfaceCard className="p-6 md:p-8">
              <div className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Database className="size-5" aria-hidden="true" />
              </div>

              <StatusPill
                tone={status.isConfigured ? "success" : "warning"}
                className="mt-5"
              >
                {status.isConfigured ? "Supabase ready" : "Need config"}
              </StatusPill>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.06] tracking-[-0.055em] text-[#061a3a] md:text-5xl">
                Kiểm tra nền kết nối Supabase.
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600">
                Trang này kiểm tra biến môi trường Supabase trước khi tạo bảng,
                auth, storage và policy. Nếu phần này xanh, ta có thể chuyển
                sang tạo schema database thật.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <StatusPill tone="success">SDK installed</StatusPill>
                <StatusPill tone="info">SSR client ready</StatusPill>
                <StatusPill tone="warning">SQL next</StatusPill>
              </div>
            </SurfaceCard>

            <SurfaceCard
              variant={status.isConfigured ? "default" : "blue"}
              className="p-6 md:p-8"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`grid size-12 shrink-0 place-items-center rounded-2xl ring-1 ${
                    status.isConfigured
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                      : "bg-amber-50 text-amber-700 ring-amber-100"
                  }`}
                >
                  {status.isConfigured ? (
                    <CheckCircle2 className="size-5" aria-hidden="true" />
                  ) : (
                    <XCircle className="size-5" aria-hidden="true" />
                  )}
                </div>

                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                    Environment Status
                  </p>

                  <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                    {status.message}
                  </h2>

                  <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                    Không hiển thị full key trên UI. Chỉ kiểm tra sự tồn tại và
                    định dạng cơ bản của URL/public key.
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-3">
                <ConfigRow
                  icon={Link2}
                  label="Project URL"
                  value={status.urlPreview}
                  ok={status.hasUrl}
                />

                <ConfigRow
                  icon={KeyRound}
                  label="Public key"
                  value={
                    status.hasPublicKey
                      ? `Đã cấu hình bằng ${status.keySource}`
                      : "Chưa cấu hình"
                  }
                  ok={status.hasPublicKey}
                />

                <ConfigRow
                  icon={ShieldCheck}
                  label="Security note"
                  value="Secret/service role key chỉ dùng server-side."
                  ok
                />
              </div>
            </SurfaceCard>
          </section>

          <section className="mt-8">
            <SectionHeading
              eyebrow="Next step"
              title="Sau bước này ta sẽ tạo SQL schema."
              description="Khi Supabase URL và public key đã sẵn sàng, phần tiếp theo sẽ tạo enum, bảng, foreign key, index và RLS baseline."
            />
          </section>
        </AppContainer>
      </main>
    </SiteShell>
  );
}

function ConfigRow({
  icon: Icon,
  label,
  value,
  ok,
}: {
  icon: typeof Link2;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-blue-100 bg-white p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <Icon className="size-4" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-extrabold text-[#061a3a]">
            {value}
          </p>
        </div>
      </div>

      <StatusPill tone={ok ? "success" : "warning"}>
        {ok ? "OK" : "Missing"}
      </StatusPill>
    </div>
  );
}