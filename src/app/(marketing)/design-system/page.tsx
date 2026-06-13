import {
  BadgeCheck,
  BriefcaseBusiness,
  FileQuestion,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
} from "lucide-react";

import { AppContainer } from "@/components/common/app-container";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { SectionHeading } from "@/components/common/section-heading";
import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";

const previewCards = [
  {
    icon: BriefcaseBusiness,
    title: "Customer request",
    description:
      "Khách hàng tạo yêu cầu thiết kế, upload hình ảnh và nhận brief AI.",
    status: "Ready",
  },
  {
    icon: Palette,
    title: "Concept direction",
    description:
      "AI đề xuất hướng thị giác để khách chọn trước khi gửi designer.",
    status: "Next",
  },
  {
    icon: Users,
    title: "Designer matching",
    description:
      "Hệ thống gợi ý designer dựa trên style, portfolio và taste gap.",
    status: "Soon",
  },
];

export default function DesignSystemPreviewPage() {
  return (
    <SiteShell>
      <main className="business-blue-bg min-h-screen border-t border-blue-100">
        <AppContainer className="py-14 md:py-20">
          <SectionHeading
            eyebrow="Design System"
            title="Bộ component nền cho DesignMatch AI."
            description="Các component này sẽ được dùng lại ở landing page, dashboard, form, job workflow và admin operation."
          >
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="success">Production-ready</StatusPill>
              <StatusPill tone="info">Blue premium</StatusPill>
              <StatusPill tone="warning">MVP foundation</StatusPill>
            </div>
          </SectionHeading>

          <section className="mt-10 grid gap-4 md:grid-cols-3">
            {previewCards.map((card) => (
              <SurfaceCard key={card.title} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <card.icon className="size-5" aria-hidden="true" />
                  </div>

                  <StatusPill
                    tone={
                      card.status === "Ready"
                        ? "success"
                        : card.status === "Next"
                          ? "info"
                          : "neutral"
                    }
                  >
                    {card.status}
                  </StatusPill>
                </div>

                <h2 className="mt-7 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
                  {card.title}
                </h2>

                <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                  {card.description}
                </p>
              </SurfaceCard>
            ))}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <SurfaceCard variant="dark" className="p-6 md:p-8">
              <div className="grid size-12 place-items-center rounded-2xl bg-white/10 text-sky-200 ring-1 ring-white/10">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>

              <h2 className="mt-7 text-2xl font-extrabold tracking-[-0.04em] text-white">
                Dark surface dùng cho product preview.
              </h2>

              <p className="mt-4 text-sm font-medium leading-7 text-sky-100/70">
                Dùng cho các vùng như AI cockpit, job status, payment summary
                hoặc admin operation block.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                <StatusPill
                  tone="info"
                  className="border-sky-300/20 bg-sky-300/10 text-sky-100"
                >
                  AI Brief Builder
                </StatusPill>

                <StatusPill
                  tone="success"
                  className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                >
                  Match ready
                </StatusPill>
              </div>
            </SurfaceCard>

            <SurfaceCard className="p-6 md:p-8">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50/70 p-5">
                  <BadgeCheck className="size-5 text-blue-700" />
                  <h3 className="mt-4 font-extrabold tracking-[-0.03em] text-[#061a3a]">
                    Trust component
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
                    Dùng để giải thích vì sao người dùng nên tin quy trình.
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-blue-100 bg-white p-5">
                  <ShieldCheck className="size-5 text-blue-700" />
                  <h3 className="mt-4 font-extrabold tracking-[-0.03em] text-[#061a3a]">
                    Safe operation
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
                    Dùng cho các trạng thái vận hành, thanh toán, duyệt hồ sơ.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]">
                  Primary action
                </Button>

                <Button
                  variant="outline"
                  className="rounded-full border-blue-200 bg-white px-5 font-extrabold text-blue-900 hover:bg-blue-50"
                >
                  Secondary action
                </Button>
              </div>
            </SurfaceCard>
          </section>

          <section className="mt-12">
            <SectionHeading
              eyebrow="UI States"
              title="Trạng thái giao diện dùng cho dữ liệu thật."
              description="Khi app có database, AI route và dashboard, các trạng thái empty/loading/error sẽ giúp trải nghiệm không bị thô hoặc gãy."
            />

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              <EmptyState
                icon={FileQuestion}
                title="Chưa có brief nào"
                description="Khi customer chưa tạo yêu cầu thiết kế, dùng trạng thái này để hướng dẫn họ bắt đầu."
                action={
                  <Button className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]">
                    Tạo brief đầu tiên
                  </Button>
                }
              />

              <LoadingState
                variant="ai"
                title="AI đang phân tích brief"
                description="Dùng khi hệ thống đang tạo brief, concept direction, style DNA hoặc match designer."
                rows={4}
              />

              <ErrorState
                title="Không thể tải kết quả matching"
                description="Dùng khi API lỗi, mất kết nối hoặc dữ liệu không hợp lệ."
                action={
                  <Button
                    variant="outline"
                    className="rounded-full border-red-200 bg-white px-5 font-extrabold text-red-700 hover:bg-red-50"
                  >
                    <RefreshCw className="mr-2 size-4" aria-hidden="true" />
                    Thử lại
                  </Button>
                }
              />
            </div>
          </section>

          <section className="mt-12">
            <SectionHeading
              eyebrow="Plain variants"
              title="Biến thể gọn cho dashboard."
              description="Các biến thể plain dùng trong card, dialog, sheet hoặc vùng nội dung nhỏ hơn."
            />

            <SurfaceCard className="mt-8 grid gap-4 p-5 md:grid-cols-3">
              <EmptyState
                variant="plain"
                title="Chưa có portfolio"
                description="Designer chưa upload dự án nào."
              />

              <LoadingState
                variant="plain"
                title="Đang tải job"
                description="Đang lấy dữ liệu từ server."
                rows={2}
              />

              <ErrorState
                variant="plain"
                title="Lỗi tải dữ liệu"
                description="Không thể tải nội dung này."
              />
            </SurfaceCard>
          </section>
        </AppContainer>
      </main>
    </SiteShell>
  );
}