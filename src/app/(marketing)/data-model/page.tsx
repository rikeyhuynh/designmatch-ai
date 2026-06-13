import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Database,
  FileText,
  Palette,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
} from "lucide-react";

import { AppContainer } from "@/components/common/app-container";
import { SectionHeading } from "@/components/common/section-heading";
import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { SiteShell } from "@/components/layout/site-shell";
import {
  getCategoryLabel,
  getIndustryLabel,
  getJobStatusMeta,
  getPaymentStatusMeta,
  getRequestStatusMeta,
  getStyleLabel,
} from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi, formatPercent } from "@/lib/format";
import {
  getMockAiBriefByRequestId,
  getMockDataSummary,
  getMockDesignerMatchesByRequestId,
  getMockDesignRequests,
  getMockJobById,
  getMockPaymentByJobId,
  getMockPortfolioItems,
} from "@/lib/mock/repository";

const modelFlow = [
  {
    label: "Request",
    description: "Nhu cầu thiết kế",
  },
  {
    label: "AI Brief",
    description: "Brief chuẩn hóa",
  },
  {
    label: "Match",
    description: "Gợi ý designer",
  },
  {
    label: "Job",
    description: "Bắt đầu dự án",
  },
  {
    label: "Payment",
    description: "Đối soát thủ công",
  },
];

const riskLevelLabelMap = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
};

export default function DataModelPreviewPage() {
  const request = getMockDesignRequests()[0];
  const brief = getMockAiBriefByRequestId(request.id);
  const matches = getMockDesignerMatchesByRequestId(request.id);
  const portfolioItems = getMockPortfolioItems();
  const job = getMockJobById("job_milktea_01");
  const payment = job ? getMockPaymentByJobId(job.id) : null;
  const summary = getMockDataSummary();

  const requestStatus = getRequestStatusMeta(request.status);
  const jobStatus = job ? getJobStatusMeta(job.status) : null;
  const paymentStatus = payment ? getPaymentStatusMeta(payment.status) : null;

  if (!brief || !job || !payment || !jobStatus || !paymentStatus) {
    return null;
  }

  return (
    <SiteShell>
      <main className="business-blue-bg min-h-screen border-t border-blue-100">
        <AppContainer className="py-10 md:py-14">
          <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
            <SurfaceCard className="p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  <Database className="size-5" aria-hidden="true" />
                </div>

                <div>
                  <StatusPill tone="info">Data Model</StatusPill>

                  <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-[-0.055em] text-[#061a3a] md:text-5xl">
                    Nền dữ liệu cho brief, matching, job và payment.
                  </h1>

                  <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600">
                    Mock data được dùng như bản mô phỏng cấu trúc Supabase sau
                    này: customer tạo request, AI chuẩn hóa brief, hệ thống
                    match designer, sau đó chuyển thành job và payment.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <StatusPill tone="success">Types ready</StatusPill>
                    <StatusPill tone="info">Repository ready</StatusPill>
                    <StatusPill tone="warning">Supabase next</StatusPill>
                  </div>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard className="p-6 md:p-8">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Mock Repository Summary
              </p>

              <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
                Lớp dữ liệu tạm để UI không phụ thuộc trực tiếp vào array mock.
                Khi nối Supabase, chỉ cần thay repository.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <SummaryBox label="Designers" value={summary.designers} />
                <SummaryBox label="Portfolio" value={summary.portfolioItems} />
                <SummaryBox label="Requests" value={summary.requests} />
                <SummaryBox label="Matches" value={summary.matches} />
              </div>
            </SurfaceCard>
          </section>

          <section className="mt-5">
            <SurfaceCard className="p-4">
              <div className="grid gap-2 md:grid-cols-5">
                {modelFlow.map((item, index) => (
                  <div key={item.label} className="relative">
                    <div className="h-full rounded-2xl border border-blue-100 bg-blue-50/55 p-4">
                      <p className="text-sm font-black tracking-[-0.03em] text-[#061a3a]">
                        {item.label}
                      </p>

                      <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                        {item.description}
                      </p>
                    </div>

                    {index < modelFlow.length - 1 ? (
                      <ArrowRight
                        className="absolute -right-3 top-1/2 z-10 hidden size-4 -translate-y-1/2 text-blue-400 md:block"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[0.98fr_1.02fr] lg:items-stretch">
            <SurfaceCard className="p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                    Design Request
                  </p>

                  <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                    {request.title}
                  </h2>
                </div>

                <StatusPill tone={requestStatus.tone}>
                  {requestStatus.label}
                </StatusPill>
              </div>

              <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                {request.description}
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <InfoBox
                  icon={BriefcaseBusiness}
                  label="Business"
                  value={request.businessName}
                />

                <InfoBox
                  icon={Palette}
                  label="Category"
                  value={getCategoryLabel(request.category)}
                />

                <InfoBox
                  icon={CircleDollarSign}
                  label="Budget"
                  value={`${formatCurrencyVnd(
                    request.budgetMinVnd,
                  )} - ${formatCurrencyVnd(request.budgetMaxVnd)}`}
                />

                <InfoBox
                  icon={CalendarDays}
                  label="Deadline"
                  value={formatDateVi(request.deadline)}
                />
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
                <InfoBox
                  icon={Database}
                  label="Industry"
                  value={getIndustryLabel(request.industry)}
                />

                <InfoBox
                  icon={Target}
                  label="Audience"
                  value={request.targetAudience}
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {request.preferredStyles.map((style) => (
                  <StatusPill key={style} tone="neutral">
                    {getStyleLabel(style)}
                  </StatusPill>
                ))}
              </div>
            </SurfaceCard>

            <SurfaceCard variant="dark" className="p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="grid size-12 place-items-center rounded-2xl bg-white/10 text-sky-200 ring-1 ring-white/10">
                  <Sparkles className="size-5" aria-hidden="true" />
                </div>

                <StatusPill
                  tone="info"
                  className="border-sky-300/20 bg-sky-300/10 text-sky-100"
                >
                  AI output
                </StatusPill>
              </div>

              <h2 className="mt-6 text-2xl font-extrabold tracking-[-0.045em] text-white">
                Brief đã được AI chuẩn hóa
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-sky-100/72">
                {brief.objective}
              </p>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-200/70">
                    Visual direction
                  </p>

                  <p className="mt-3 text-sm font-semibold leading-7 text-sky-50">
                    {brief.visualDirection}
                  </p>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-200/60">
                      Key message
                    </p>

                    <p className="mt-2 text-sm font-semibold leading-7 text-white">
                      {brief.keyMessage}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <DarkMiniBox
                    label="Completeness"
                    value={formatPercent(brief.briefCompletenessScore)}
                  />

                  <DarkMiniBox
                    label="Risk"
                    value={riskLevelLabelMap[brief.riskLevel]}
                  />

                  <DarkMiniBox
                    label="Deliverables"
                    value={`${brief.deliverables.length} đầu ra`}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-100/75">
                  Risk notes
                </p>

                <ul className="mt-3 grid gap-2 md:grid-cols-2">
                  {brief.riskNotes.slice(0, 2).map((note) => (
                    <li
                      key={note}
                      className="flex gap-2 text-sm font-medium leading-6 text-amber-50/88"
                    >
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-200" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </SurfaceCard>
          </section>

          <section className="mt-14">
            <SectionHeading
              eyebrow="Designer Matching"
              title="Matching board dùng để test logic chọn designer."
              description="Mỗi match đã được join với designer và portfolio thông qua mock repository. Sau này repository này sẽ được thay bằng Supabase query."
            />

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {matches.map((match, index) => {
                if (!match.designer) {
                  return null;
                }

                return (
                  <SurfaceCard
                    key={match.id}
                    className="flex h-full flex-col p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid size-12 place-items-center rounded-2xl bg-[#061a3a] text-sm font-black text-white">
                        {index + 1}
                      </div>

                      <StatusPill tone={index === 0 ? "success" : "info"}>
                        {formatPercent(match.matchScore)}
                      </StatusPill>
                    </div>

                    <h3 className="mt-6 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
                      {match.designer.displayName}
                    </h3>

                    <p className="mt-2 text-sm font-bold text-blue-700">
                      {match.designer.headline}
                    </p>

                    <p className="mt-4 flex-1 text-sm font-medium leading-7 text-slate-600">
                      {match.reason}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <InfoBox
                        icon={Star}
                        label="Rating"
                        value={match.designer.rating.toString()}
                      />

                      <InfoBox
                        icon={ShieldAlert}
                        label="Taste gap"
                        value={formatPercent(match.tasteGap)}
                      />
                    </div>
                  </SurfaceCard>
                );
              })}
            </div>
          </section>

          <section className="mt-14 grid gap-5 lg:grid-cols-[1fr_0.82fr]">
            <SurfaceCard className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                    Portfolio Dataset
                  </p>

                  <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                    Dữ liệu dùng để tạo Style DNA.
                  </h2>
                </div>

                <StatusPill tone="success">
                  {`${portfolioItems.length} items`}
                </StatusPill>
              </div>

              <div className="mt-6 grid gap-3">
                {portfolioItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.25rem] border border-blue-100 bg-blue-50/55 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
                        <Palette className="size-5" aria-hidden="true" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <h3 className="font-extrabold tracking-[-0.03em] text-[#061a3a]">
                            {item.title}
                          </h3>

                          <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                            {item.year}
                          </span>
                        </div>

                        <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                          {item.description}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.styles.map((style) => (
                            <StatusPill
                              key={`${item.id}-${style}`}
                              tone="neutral"
                            >
                              {getStyleLabel(style)}
                            </StatusPill>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            <div className="grid gap-5">
              <SurfaceCard className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                      Job
                    </p>

                    <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                      {job.title}
                    </h2>
                  </div>

                  <StatusPill tone={jobStatus.tone}>
                    {jobStatus.label}
                  </StatusPill>
                </div>

                <div className="mt-5 grid gap-3">
                  <InfoBox icon={FileText} label="Status" value={jobStatus.label} />

                  <InfoBox
                    icon={CircleDollarSign}
                    label="Agreed price"
                    value={formatCurrencyVnd(job.agreedPriceVnd)}
                  />

                  <InfoBox
                    icon={CalendarDays}
                    label="Due date"
                    value={formatDateVi(job.dueAt)}
                  />
                </div>
              </SurfaceCard>

              <SurfaceCard variant="dark" className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/70">
                      Payment
                    </p>

                    <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-white">
                      Manual-first transaction
                    </h2>
                  </div>

                  <BadgeCheck className="size-6 text-sky-200" />
                </div>

                <div className="mt-5 grid gap-3">
                  <DarkInfoRow
                    label="Amount"
                    value={formatCurrencyVnd(payment.amountVnd)}
                  />

                  <DarkInfoRow label="Status" value={paymentStatus.label} />

                  <DarkInfoRow
                    label="Transfer note"
                    value={payment.transferNote}
                  />
                </div>
              </SurfaceCard>
            </div>
          </section>
        </AppContainer>
      </main>
    </SiteShell>
  );
}

function SummaryBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/55 p-4">
      <p className="text-3xl font-black tracking-[-0.055em] text-[#061a3a]">
        {value}
      </p>

      <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {label}
      </p>
    </div>
  );
}

function InfoBox({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </div>

      <p className="mt-3 text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
      </p>
    </div>
  );
}

function DarkMiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-200/60">
        {label}
      </p>

      <p className="mt-2 text-lg font-black tracking-[-0.04em] text-white">
        {value}
      </p>
    </div>
  );
}

function DarkInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-200/60">
        {label}
      </p>

      <p className="mt-2 text-sm font-extrabold leading-6 text-white">
        {value}
      </p>
    </div>
  );
}