import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  GalleryVerticalEnd,
  Palette,
  Sparkles,
  UploadCloud,
  Users,
} from "lucide-react";

import { AppContainer } from "@/components/common/app-container";
import { SectionHeading } from "@/components/common/section-heading";
import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { ChoiceCard } from "@/components/forms/choice-card";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { FormShell } from "@/components/forms/form-shell";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function FormSystemPreviewPage() {
  return (
    <SiteShell>
      <main className="business-blue-bg min-h-screen border-t border-blue-100">
        <AppContainer className="py-14 md:py-20">
          <SectionHeading
            eyebrow="Form System"
            title="Bộ form nền cho toàn bộ DesignMatch AI."
            description="Form system này sẽ dùng cho customer request, designer onboarding, admin operation, auth form và các bước tạo brief bằng AI."
          >
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="success">Reusable</StatusPill>
              <StatusPill tone="info">Form-ready</StatusPill>
              <StatusPill tone="warning">Validation-ready</StatusPill>
            </div>
          </SectionHeading>

          <section className="mt-10 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <FormShell
              eyebrow="Customer form"
              title="Tạo design request"
              description="Form này sẽ là nền cho luồng khách hàng gửi sản phẩm, nhu cầu, ngân sách và deadline."
              icon={BriefcaseBusiness}
              status={{
                label: "Draft",
                tone: "info",
              }}
              footer={
                <p className="text-sm font-medium leading-7 text-slate-600">
                  Sau này form này sẽ kết nối với Supabase, upload assets và AI
                  Visual Intake.
                </p>
              }
            >
              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  label="Tên dự án"
                  htmlFor="projectName"
                  required
                  helperText="Ví dụ: Poster khai trương quán trà sữa."
                >
                  <Input
                    id="projectName"
                    placeholder="Nhập tên dự án"
                    className="h-11 rounded-2xl border-blue-100 bg-white font-medium"
                  />
                </FormField>

                <FormField label="Ngành hàng" required>
                  <Select>
                    <SelectTrigger className="h-11 rounded-2xl border-blue-100 bg-white font-medium">
                      <SelectValue placeholder="Chọn ngành hàng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fnb">F&B / Quán ăn / Cafe</SelectItem>
                      <SelectItem value="fashion">Thời trang</SelectItem>
                      <SelectItem value="beauty">Beauty / Spa</SelectItem>
                      <SelectItem value="education">Giáo dục</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField
                  label="Ngân sách dự kiến"
                  htmlFor="budget"
                  helperText="Giúp hệ thống match designer phù hợp hơn."
                >
                  <Input
                    id="budget"
                    placeholder="Ví dụ: 300.000 - 800.000đ"
                    className="h-11 rounded-2xl border-blue-100 bg-white font-medium"
                  />
                </FormField>

                <FormField label="Deadline">
                  <Select>
                    <SelectTrigger className="h-11 rounded-2xl border-blue-100 bg-white font-medium">
                      <SelectValue placeholder="Chọn deadline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Trong 24 giờ</SelectItem>
                      <SelectItem value="3days">2 - 3 ngày</SelectItem>
                      <SelectItem value="1week">Trong 1 tuần</SelectItem>
                      <SelectItem value="flexible">Linh hoạt</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField
                  label="Mô tả nhu cầu"
                  htmlFor="description"
                  required
                  helperText="Cứ viết bằng ngôn ngữ tự nhiên, AI sẽ hỗ trợ biến thành brief rõ hơn."
                  className="md:col-span-2"
                >
                  <Textarea
                    id="description"
                    placeholder="Ví dụ: Tôi cần làm poster khai trương cho quán trà sữa, phong cách trẻ trung, sạch, nhìn hơi Hàn Quốc..."
                    className="min-h-32 rounded-2xl border-blue-100 bg-white font-medium leading-7"
                  />
                </FormField>
              </div>

              <FormActions>
                <Button
                  variant="outline"
                  className="rounded-full border-blue-200 bg-white px-5 font-extrabold text-blue-900 hover:bg-blue-50"
                >
                  Lưu nháp
                </Button>

                <Button className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]">
                  Tạo brief bằng AI
                </Button>
              </FormActions>
            </FormShell>

            <FormShell
              eyebrow="Designer form"
              title="Thiết lập hồ sơ designer"
              description="Form nền cho designer onboarding, upload portfolio và khai báo phong cách mạnh."
              icon={GalleryVerticalEnd}
              status={{
                label: "Need setup",
                tone: "warning",
              }}
            >
              <div className="space-y-5">
                <FormField
                  label="Tên hiển thị"
                  htmlFor="displayName"
                  required
                  successMessage="Tên hợp lệ"
                >
                  <Input
                    id="displayName"
                    defaultValue="Linh Studio"
                    className="h-11 rounded-2xl border-blue-100 bg-white font-medium"
                  />
                </FormField>

                <FormField
                  label="Chuyên môn chính"
                  required
                  helperText="Chọn nhóm dịch vụ mà designer muốn nhận brief nhiều nhất."
                >
                  <div className="grid gap-3">
                    <ChoiceCard
                      selected
                      icon={Palette}
                      title="Social post / Poster"
                      description="Thiết kế bài đăng, poster, banner, campaign visual."
                      meta="Recommended"
                    />

                    <ChoiceCard
                      icon={Building2}
                      title="Brand identity"
                      description="Logo, nhận diện thương hiệu, guideline cơ bản."
                    />

                    <ChoiceCard
                      icon={UploadCloud}
                      title="Portfolio upload"
                      description="Upload dự án để AI tạo Style DNA."
                    />
                  </div>
                </FormField>

                <FormActions align="between">
                  <Button
                    variant="outline"
                    className="rounded-full border-blue-200 bg-white px-5 font-extrabold text-blue-900 hover:bg-blue-50"
                  >
                    Xem trước hồ sơ
                  </Button>

                  <Button className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]">
                    Lưu hồ sơ
                  </Button>
                </FormActions>
              </div>
            </FormShell>
          </section>

          <section className="mt-12">
            <SectionHeading
              eyebrow="Admin operation form"
              title="Form cho thao tác vận hành."
              description="Admin cần form ngắn, rõ, ít rủi ro để xác nhận payment, duyệt designer hoặc ghi chú issue."
            />

            <div className="mt-8 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <SurfaceCard variant="dark" className="p-6 md:p-8">
                <div className="grid size-12 place-items-center rounded-2xl bg-white/10 text-sky-200 ring-1 ring-white/10">
                  <Sparkles className="size-5" aria-hidden="true" />
                </div>

                <h2 className="mt-7 text-2xl font-extrabold tracking-[-0.04em] text-white">
                  Form system giúp app không bị mỗi chỗ một kiểu.
                </h2>

                <p className="mt-4 text-sm font-medium leading-7 text-sky-100/70">
                  Từ bước này trở đi, khi tạo form mới, ta sẽ dùng FormShell,
                  FormField, FormActions và ChoiceCard để giữ trải nghiệm đồng
                  nhất.
                </p>

                <div className="mt-7 flex flex-wrap gap-2">
                  <StatusPill
                    tone="info"
                    className="border-sky-300/20 bg-sky-300/10 text-sky-100"
                  >
                    React Hook Form-ready
                  </StatusPill>

                  <StatusPill
                    tone="success"
                    className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                  >
                    Zod-ready
                  </StatusPill>
                </div>
              </SurfaceCard>

              <FormShell
                eyebrow="Payment verification"
                title="Xác nhận chuyển khoản thủ công"
                description="Bản MVP ưu tiên manual bank transfer, admin xác nhận giao dịch trước khi job bắt đầu."
                icon={CircleDollarSign}
                status={{
                  label: "Manual-first",
                  tone: "info",
                }}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField label="Mã giao dịch" htmlFor="transactionCode" required>
                    <Input
                      id="transactionCode"
                      placeholder="Ví dụ: DMAI-000124"
                      className="h-11 rounded-2xl border-blue-100 bg-white font-medium"
                    />
                  </FormField>

                  <FormField label="Trạng thái xác nhận" required>
                    <Select>
                      <SelectTrigger className="h-11 rounded-2xl border-blue-100 bg-white font-medium">
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verified">Đã nhận tiền</SelectItem>
                        <SelectItem value="pending">Chờ kiểm tra</SelectItem>
                        <SelectItem value="rejected">Không hợp lệ</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField
                    label="Ghi chú admin"
                    htmlFor="adminNote"
                    className="md:col-span-2"
                    helperText="Ghi lại căn cứ xác nhận để dễ đối soát sau này."
                  >
                    <Textarea
                      id="adminNote"
                      placeholder="Ví dụ: Đã đối chiếu sao kê lúc 14:30, số tiền khớp với request."
                      className="min-h-28 rounded-2xl border-blue-100 bg-white font-medium leading-7"
                    />
                  </FormField>
                </div>

                <FormActions>
                  <Button
                    variant="outline"
                    className="rounded-full border-blue-200 bg-white px-5 font-extrabold text-blue-900 hover:bg-blue-50"
                  >
                    Hủy
                  </Button>

                  <Button className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]">
                    Xác nhận payment
                  </Button>
                </FormActions>
              </FormShell>
            </div>
          </section>

          <section className="mt-12">
            <SectionHeading
              eyebrow="Form states"
              title="Ví dụ trường hợp lỗi và hợp lệ."
              description="Các trạng thái này sẽ được nối với React Hook Form và Zod ở phần sau."
            />

            <SurfaceCard className="mt-8 grid gap-5 p-6 md:grid-cols-3">
              <FormField
                label="Tên thương hiệu"
                htmlFor="brandName"
                required
                error="Tên thương hiệu không được để trống."
              >
                <Input
                  id="brandName"
                  placeholder="Nhập tên thương hiệu"
                  className="h-11 rounded-2xl border-red-200 bg-red-50/40 font-medium"
                />
              </FormField>

              <FormField
                label="Email liên hệ"
                htmlFor="email"
                required
                successMessage="Email có định dạng hợp lệ."
              >
                <Input
                  id="email"
                  defaultValue="hello@designmatch.ai"
                  className="h-11 rounded-2xl border-emerald-200 bg-emerald-50/35 font-medium"
                />
              </FormField>

              <FormField
                label="Loại tài khoản"
                helperText="Dữ liệu này dùng để điều hướng onboarding."
              >
                <Select>
                  <SelectTrigger className="h-11 rounded-2xl border-blue-100 bg-white font-medium">
                    <SelectValue placeholder="Chọn loại tài khoản" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </SurfaceCard>
          </section>
        </AppContainer>
      </main>
    </SiteShell>
  );
}