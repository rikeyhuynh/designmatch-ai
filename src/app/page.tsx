import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  GalleryVerticalEnd,
  Palette,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  Users,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

import { SiteShell } from "@/components/layout/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const workflowItems = [
  {
    icon: UploadCloud,
    title: "Gửi sản phẩm",
    description:
      "Khách hàng tải ảnh sản phẩm, logo, mô tả nhu cầu, ngân sách và deadline.",
  },
  {
    icon: WandSparkles,
    title: "AI tạo brief",
    description:
      "AI chuyển mô tả mơ hồ thành brief có mục tiêu, mood, layout, CTA và rủi ro.",
  },
  {
    icon: Palette,
    title: "Chọn concept",
    description:
      "Khách xem các hướng concept trực quan trước khi gửi cho designer.",
  },
  {
    icon: Users,
    title: "Match designer",
    description:
      "Hệ thống gợi ý designer theo style, ngành hàng, taste gap, ngân sách và deadline.",
  },
];

const trustItems = [
  {
    icon: Target,
    title: "Brief rõ trước khi bắt đầu",
    description:
      "Giảm tình trạng khách nói “làm đẹp hơn”, designer phải tự đoán ý.",
  },
  {
    icon: BadgeCheck,
    title: "Match có lý do",
    description:
      "Mỗi designer được đề xuất kèm match score, taste gap và portfolio liên quan.",
  },
  {
    icon: ShieldCheck,
    title: "Có lớp vận hành thật",
    description:
      "Admin có thể duyệt designer, xác nhận thanh toán và theo dõi trạng thái job.",
  },
];

const aiModules = [
  "Visual Intake",
  "Brief Builder",
  "Risk Scanner",
  "Concept Direction",
  "Style DNA",
  "Taste Gap",
  "Match Reason",
  "Feedback Assistant",
];

const designerMatches = [
  {
    name: "Linh Studio",
    focus: "F&B pastel · Korean cafe",
    score: "92%",
    gap: "18%",
    note: "Có 8 portfolio gần concept khách chọn",
  },
  {
    name: "Mộc Design",
    focus: "Local brand · Warm minimal",
    score: "86%",
    gap: "24%",
    note: "Phù hợp brief quán nhỏ và social post",
  },
  {
    name: "Minh Creative",
    focus: "Poster campaign · Bold promo",
    score: "81%",
    gap: "32%",
    note: "Mạnh về layout quảng bá nhiều năng lượng",
  },
];

export default function HomePage() {
  return (
    <SiteShell>
      <main>
        <section className="business-blue-bg relative isolate overflow-hidden border-b border-blue-100">
          <div className="subtle-grid absolute inset-0 -z-10 opacity-70" />

          <div className="mx-auto grid min-h-[calc(100svh-76px)] w-full max-w-7xl gap-10 px-5 py-10 md:px-8 md:py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-14">
            <div className="max-w-3xl">
              <Badge className="rounded-full border border-blue-200 bg-white/90 px-4 py-2 text-sm font-extrabold text-blue-800 shadow-sm hover:bg-white">
                AI Creative Matching cho hộ kinh doanh nhỏ
              </Badge>

              <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-[-0.055em] text-[#061a3a] md:text-5xl xl:text-[4.15rem]">
                Tạo brief rõ ràng. Chọn đúng gu. Gặp đúng designer.
              </h1>

              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-slate-600 md:text-lg">
                DesignMatch AI giúp khách hàng không chuyên thiết kế biến nhu
                cầu mơ hồ thành brief có thể triển khai, xem trước concept trực
                quan và kết nối với designer phù hợp theo phong cách thị giác,
                ngân sách và ngành hàng.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full bg-[#061a3a] px-7 text-base font-extrabold text-white shadow-[0_18px_45px_rgba(6,26,58,0.24)] hover:bg-[#0b2a61]"
                >
                  <Link href="#customer">
                    Tạo brief miễn phí
                    <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-blue-200 bg-white/82 px-7 text-base font-extrabold text-blue-900 shadow-sm hover:bg-blue-50"
                >
                  <Link href="#designer">Tôi là designer</Link>
                </Button>
              </div>

              <TrustStrip />

              <div className="mt-5 grid max-w-2xl grid-cols-3 gap-3">
                <MetricCard value="4" label="role vận hành" />
                <MetricCard value="8+" label="AI module MVP" />
                <MetricCard value="100" label="điểm matching" />
              </div>
            </div>

            <ProductPreview />
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {trustItems.map((item) => (
              <TrustCard key={item.title} {...item} />
            ))}
          </div>
        </section>

        <section
          id="workflow"
          className="scroll-mt-24 mx-auto w-full max-w-7xl px-5 py-14 md:px-8"
        >
          <SectionHeader
            eyebrow="Workflow sản phẩm"
            title="Một quy trình đủ rõ để dùng thật, không phải match ngẫu nhiên."
            description="Mỗi bước đều tạo dữ liệu cho brief, concept, matching, proposal, job management và admin operation."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {workflowItems.map((item, index) => (
              <WorkflowCard
                key={item.title}
                step={`0${index + 1}`}
                {...item}
              />
            ))}
          </div>
        </section>

        <section
          id="customer"
          className="scroll-mt-24 mx-auto w-full max-w-7xl px-5 py-14 md:px-8"
        >
          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div>
              <SectionHeader
                eyebrow="Dành cho khách hàng"
                title="Không cần biết viết brief, vẫn có thể bắt đầu đúng."
                description="Khách hàng nhỏ thường biết mình muốn đẹp hơn, nhưng không biết diễn đạt bằng ngôn ngữ thiết kế. AI giúp chuyển nhu cầu đó thành brief rõ ràng trước khi gửi cho designer."
              />

              <div className="mt-7 flex flex-wrap gap-3">
                {aiModules.slice(0, 4).map((module) => (
                  <FeaturePill key={module}>{module}</FeaturePill>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-blue-100 bg-white p-6 shadow-[0_24px_90px_rgba(15,65,145,0.11)]">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Before / After Brief
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Trước AI
                  </p>
                  <p className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
                    “Làm poster khai trương cho đẹp, trẻ trung, nhìn sang hơn.”
                  </p>
                </div>

                <div className="rounded-[1.35rem] border border-blue-100 bg-blue-50/70 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">
                    Sau AI
                  </p>
                  <p className="mt-4 text-base font-bold leading-7 text-[#061a3a]">
                    Poster khai trương 1:1 cho quán trà sữa, mood Korean cafe,
                    tone nâu kem, headline rõ, CTA ưu đãi khai trương, phù hợp
                    sinh viên và cần designer mạnh F&B pastel.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="designer"
          className="scroll-mt-24 mx-auto w-full max-w-7xl px-5 py-14 md:px-8"
        >
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <SectionHeader
                eyebrow="Dành cho designer"
                title="Designer được chọn vì phong cách, không chỉ vì giá rẻ."
                description="Portfolio được biến thành Style DNA, giúp khách hàng hiểu designer mạnh ở ngành nào, gu nào, loại thiết kế nào và vì sao phù hợp với brief."
              />

              <div className="mt-7 flex flex-wrap gap-3">
                {aiModules.slice(4).map((module) => (
                  <FeaturePill key={module}>{module}</FeaturePill>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-[0_24px_90px_rgba(15,65,145,0.11)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                    Match result
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                    Designer phù hợp với brief này
                  </h3>
                </div>

                <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
                  5 đề xuất
                </div>
              </div>

              <div className="space-y-3">
                {designerMatches.map((designer, index) => (
                  <div
                    key={designer.name}
                    className="rounded-[1.25rem] border border-blue-100 bg-gradient-to-r from-white to-blue-50/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="grid size-11 place-items-center rounded-2xl bg-[#061a3a] text-sm font-black text-white">
                          {index + 1}
                        </div>

                        <div>
                          <p className="font-extrabold tracking-[-0.025em] text-[#061a3a]">
                            {designer.name}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-600">
                            {designer.focus}
                          </p>
                          <p className="mt-2 text-xs font-medium text-slate-500">
                            {designer.note}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-2xl font-black tracking-[-0.05em] text-blue-700">
                          {designer.score}
                        </p>
                        <p className="text-xs font-bold text-slate-500">
                          Taste gap {designer.gap}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="operation"
          className="scroll-mt-24 mx-auto w-full max-w-7xl px-5 py-14 pb-24 md:px-8"
        >
          <div className="grid gap-5 rounded-[1.75rem] border border-blue-900/20 bg-[#061a3a] p-6 shadow-[0_34px_100px_rgba(6,26,58,0.22)] md:grid-cols-3 md:p-8">
            <OperationItem
              icon={BriefcaseBusiness}
              title="Customer flow"
              description="Tạo request, nhận brief AI, chọn concept, gửi brief, thanh toán và hoàn tất job."
            />
            <OperationItem
              icon={GalleryVerticalEnd}
              title="Designer flow"
              description="Upload portfolio, tạo Style DNA, nhận brief, gửi proposal và bàn giao file."
            />
            <OperationItem
              icon={CircleDollarSign}
              title="Admin operation"
              description="Duyệt designer, xác nhận chuyển khoản, theo dõi job, payout và report."
            />
          </div>
        </section>
      </main>
    </SiteShell>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute -inset-5 rounded-[2.5rem] bg-blue-500/12 blur-3xl" />

      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/20 bg-[#061a3a] shadow-[0_34px_90px_rgba(6,26,58,0.38)]">
        <div className="border-b border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-sky-400/12 text-sky-200 ring-1 ring-sky-300/20">
                <Sparkles className="size-5" />
              </div>

              <div>
                <p className="text-lg font-extrabold tracking-[-0.035em] text-white">
                  Creative Job Cockpit
                </p>
                <p className="mt-1 text-xs font-medium text-sky-100/70">
                  Quán trà sữa · Poster khai trương
                </p>
              </div>
            </div>

            <div className="hidden rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-200 sm:block">
              Ready to match
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-[1fr_0.86fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <PreviewTitle
                icon={FileText}
                title="AI Brief Builder"
                description="Brief có thể gửi designer ngay"
              />

              <div className="mt-4 space-y-2.5">
                {[
                  "Poster khai trương cho quán trà sữa",
                  "Mood Korean cafe, nâu kem, trẻ trung",
                  "CTA: ưu đãi ngày khai trương",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl bg-white/[0.055] px-3.5 py-3"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-sky-300" />
                    <p className="text-sm font-semibold leading-6 text-sky-50/88">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-black text-white">
                  Brief Risk Scanner
                </p>
                <span className="rounded-full bg-amber-300/12 px-3 py-1 text-xs font-black text-amber-200 ring-1 ring-amber-300/20">
                  Medium
                </span>
              </div>

              <ProgressLine label="Mục tiêu rõ" value="8/10" width="80%" />
              <div className="mt-3">
                <ProgressLine
                  label="CTA đầy đủ"
                  value="5/10"
                  width="50%"
                  variant="warning"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-white">Selected concept</p>
                <span className="text-xs font-bold text-sky-200/70">01</span>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#f7efe2] via-[#e8d2b8] to-[#b98252] p-3">
                <div className="rounded-xl bg-white/76 p-4 shadow-lg backdrop-blur">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-amber-700">
                    Korean Soft Launch
                  </p>
                  <p className="mt-3 text-xl font-black tracking-[-0.05em] text-[#4c2d19]">
                    Trà sữa nâu kem
                  </p>
                  <p className="mt-2 text-xs font-bold leading-5 text-[#6d4a2f]">
                    Visual nhẹ, sạch, tập trung sản phẩm và ưu đãi.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-black text-white">Top match</p>
                <span className="rounded-full bg-sky-300/12 px-3 py-1 text-xs font-black text-sky-200 ring-1 ring-sky-300/20">
                  92%
                </span>
              </div>

              <div className="space-y-2.5">
                {designerMatches.slice(0, 2).map((designer) => (
                  <div
                    key={designer.name}
                    className="rounded-2xl border border-white/10 bg-white/[0.05] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">
                          {designer.name}
                        </p>
                        <p className="mt-1 text-xs font-medium text-sky-100/62">
                          {designer.focus}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-sky-200">
                          {designer.score}
                        </p>
                        <p className="text-[0.68rem] font-bold text-sky-100/50">
                          gap {designer.gap}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid border-t border-white/10 bg-white/[0.04] md:grid-cols-3">
          {[
            ["Status", "Brief ready"],
            ["Payment", "Manual-first"],
            ["Next", "Send proposal"],
          ].map(([label, value]) => (
            <div key={label} className="border-white/10 p-4 md:border-r">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-sky-200/60">
                {label}
              </p>
              <p className="mt-2 text-sm font-black text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrustStrip() {
  return (
    <div className="mt-6 flex w-full max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-white/82 px-4 py-3 text-sm font-extrabold text-[#061a3a] shadow-[0_14px_38px_rgba(15,65,145,0.08)]">
      <TrustStripItem icon={Bot}>AI tạo brief</TrustStripItem>
      <span className="hidden text-blue-200 sm:inline">·</span>
      <TrustStripItem icon={Palette}>Designer hoàn thiện</TrustStripItem>
      <span className="hidden text-blue-200 sm:inline">·</span>
      <TrustStripItem icon={ShieldCheck}>Admin vận hành</TrustStripItem>
    </div>
  );
}

function TrustStripItem({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-full bg-blue-50 text-blue-700">
        <Icon className="size-3.5" />
      </span>
      {children}
    </span>
  );
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white/86 p-4 shadow-[0_12px_40px_rgba(15,65,145,0.08)]">
      <p className="text-2xl font-black tracking-[-0.055em] text-[#061a3a]">
        {value}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function TrustCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-blue-100 bg-white p-6 shadow-[0_18px_55px_rgba(15,65,145,0.075)]">
      <div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
        <Icon className="size-5" />
      </div>
      <h2 className="mt-5 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
        {title}
      </h2>
      <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <Badge className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 font-extrabold text-blue-800 hover:bg-blue-50">
        {eyebrow}
      </Badge>
      <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.045em] text-[#061a3a] md:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base font-medium leading-8 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function WorkflowCard({
  icon: Icon,
  step,
  title,
  description,
}: {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-[1.5rem] border border-blue-100 bg-white p-6 shadow-[0_20px_70px_rgba(15,65,145,0.075)]">
      <div className="flex items-center justify-between">
        <div className="grid size-12 place-items-center rounded-2xl bg-[#0b4edb] text-white shadow-[0_14px_34px_rgba(11,78,219,0.24)]">
          <Icon className="size-5" />
        </div>
        <span className="text-sm font-black text-blue-200">{step}</span>
      </div>

      <h3 className="mt-7 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
        {title}
      </h3>
      <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function FeaturePill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-extrabold text-blue-800 shadow-sm">
      {children}
    </span>
  );
}

function OperationItem({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-sky-200 ring-1 ring-white/10">
        <Icon className="size-5" />
      </div>
      <div>
        <h2 className="font-extrabold tracking-[-0.035em] text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm font-medium leading-7 text-sky-100/68">
          {description}
        </p>
      </div>
    </div>
  );
}

function PreviewTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-2xl bg-blue-400/15 text-sky-200">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-1 text-xs font-medium text-sky-100/60">
          {description}
        </p>
      </div>
    </div>
  );
}

function ProgressLine({
  label,
  value,
  width,
  variant = "default",
}: {
  label: string;
  value: string;
  width: string;
  variant?: "default" | "warning";
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs font-bold text-sky-100/70">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div
          className={`h-2 rounded-full ${
            variant === "warning" ? "bg-amber-300" : "bg-sky-400"
          }`}
          style={{ width }}
        />
      </div>
    </div>
  );
}