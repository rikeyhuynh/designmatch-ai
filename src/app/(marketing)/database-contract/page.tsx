import {
  ArrowRight,
  Database,
  GitBranch,
  KeyRound,
  ShieldCheck,
  Table2,
} from "lucide-react";

import { AppContainer } from "@/components/common/app-container";
import { SectionHeading } from "@/components/common/section-heading";
import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { SiteShell } from "@/components/layout/site-shell";
import {
  databaseGroups,
  databaseRelationships,
  databaseTables,
} from "@/lib/domain/database-contract";

export default function DatabaseContractPage() {
  return (
    <SiteShell>
      <main className="business-blue-bg min-h-screen border-t border-blue-100">
        <AppContainer className="py-12 md:py-16">
          <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
            <SurfaceCard className="p-6 md:p-8">
              <div className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Database className="size-5" aria-hidden="true" />
              </div>

              <StatusPill tone="info" className="mt-5">
                Supabase Contract
              </StatusPill>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.06] tracking-[-0.055em] text-[#061a3a] md:text-5xl">
                Cấu trúc bảng chuẩn bị cho database thật.
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600">
                Đây là bản hợp đồng dữ liệu giữa UI, mock repository, Supabase,
                AI route và dashboard. Khi tạo database thật, ta sẽ bám theo cấu
                trúc này để tránh làm lại từ đầu.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <StatusPill tone="success">Tables mapped</StatusPill>
                <StatusPill tone="info">Relationships ready</StatusPill>
                <StatusPill tone="warning">RLS next</StatusPill>
              </div>
            </SurfaceCard>

            <SurfaceCard variant="dark" className="p-6 md:p-8">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/70">
                Database Scope
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <SummaryCard label="Tables" value={databaseTables.length} />
                <SummaryCard
                  label="Relations"
                  value={databaseRelationships.length}
                />
                <SummaryCard label="Core groups" value={databaseGroups.length} />
                <SummaryCard label="MVP payment" value="Manual" />
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-1 size-5 shrink-0 text-sky-200" />

                  <p className="text-sm font-medium leading-7 text-sky-100/76">
                    Supabase thật sẽ cần bật RLS cho từng bảng. Phần này chưa
                    viết policy, chỉ chốt schema logic trước.
                  </p>
                </div>
              </div>
            </SurfaceCard>
          </section>

          <section className="mt-12">
            <SectionHeading
              eyebrow="Table Groups"
              title="Các nhóm bảng chính của hệ thống."
              description="Mỗi nhóm tương ứng với một phần sản phẩm: tài khoản, designer, request, matching, job và payment."
            />

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {databaseGroups.map((group) => {
                const count = databaseTables.filter(
                  (table) => table.group === group.id,
                ).length;

                return (
                  <SurfaceCard key={group.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                        <Table2 className="size-5" aria-hidden="true" />
                      </div>

                      <StatusPill tone="neutral">{`${count} bảng`}</StatusPill>
                    </div>

                    <h2 className="mt-5 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
                      {group.label}
                    </h2>

                    <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
                      {group.description}
                    </p>
                  </SurfaceCard>
                );
              })}
            </div>
          </section>

          <section className="mt-12">
            <SectionHeading
              eyebrow="Tables"
              title="Chi tiết bảng và cột dữ liệu."
              description="Các bảng này sẽ được chuyển thành SQL migration ở phần Supabase setup."
            />

            <div className="mt-8 grid gap-5">
              {databaseTables.map((table) => (
                <SurfaceCard key={table.name} className="overflow-hidden">
                  <div className="border-b border-blue-100 bg-gradient-to-r from-white to-blue-50/65 p-5">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
                            {table.name}
                          </h2>

                          <StatusPill tone="info">{table.group}</StatusPill>
                        </div>

                        <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                          {table.purpose}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {table.usedBy.map((role) => (
                          <StatusPill
                            key={`${table.name}-${role}`}
                            tone="neutral"
                          >
                            {role}
                          </StatusPill>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-blue-100">
                    {table.columns.map((column) => (
                      <div
                        key={`${table.name}-${column.name}`}
                        className="grid gap-3 p-5 md:grid-cols-[0.8fr_0.8fr_1.4fr]"
                      >
                        <div className="flex items-center gap-2">
                          <KeyRound className="size-4 text-blue-600" />

                          <p className="font-extrabold tracking-[-0.02em] text-[#061a3a]">
                            {column.name}
                          </p>

                          {column.required ? (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[0.68rem] font-black text-red-600 ring-1 ring-red-100">
                              required
                            </span>
                          ) : null}
                        </div>

                        <code className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800">
                          {column.type}
                        </code>

                        <p className="text-sm font-medium leading-7 text-slate-600">
                          {column.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <SectionHeading
              eyebrow="Relationships"
              title="Quan hệ giữa các bảng."
              description="Phần này giúp tránh sai dữ liệu khi chuyển sang Supabase foreign key."
            />

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {databaseRelationships.map((relationship) => (
                <SurfaceCard
                  key={`${relationship.from}-${relationship.to}`}
                  className="p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                      <GitBranch className="size-5" aria-hidden="true" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800">
                          {relationship.from}
                        </code>

                        <ArrowRight className="size-4 text-blue-500" />

                        <code className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800">
                          {relationship.to}
                        </code>
                      </div>

                      <div className="mt-3">
                        <StatusPill tone="info">{relationship.type}</StatusPill>
                      </div>

                      <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                        {relationship.description}
                      </p>
                    </div>
                  </div>
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