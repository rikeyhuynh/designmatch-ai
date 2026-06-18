import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    requestId: string;
  }>;
};

type JsonRecord = Record<string, any>;

function getEnvValue(key: string) {
  const value = process.env[key];

  if (!value || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function createSupabaseAIPageClient() {
  const supabaseUrl = getEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey =
    getEnvValue("SUPABASE_SERVICE_ROLE_KEY") ??
    getEnvValue("SUPABASE_SECRET_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Thiếu Supabase admin env. Cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as any;
}

function asArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function getToneByRiskLevel(riskLevel?: string | null) {
  if (riskLevel === "low") {
    return {
      label: "Rủi ro thấp",
      badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      panelClass: "border-emerald-200 bg-emerald-50/60",
    };
  }

  if (riskLevel === "high") {
    return {
      label: "Rủi ro cao",
      badgeClass: "bg-red-50 text-red-700 ring-red-200",
      panelClass: "border-red-200 bg-red-50/60",
    };
  }

  return {
    label: "Rủi ro trung bình",
    badgeClass: "bg-amber-50 text-amber-700 ring-amber-200",
    panelClass: "border-amber-200 bg-amber-50/60",
  };
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-800">
        {value && value.trim().length > 0 ? value : "Chưa có dữ liệu."}
      </p>
    </div>
  );
}

function TagList({
  items,
  emptyText = "Chưa có dữ liệu.",
}: {
  items: string[];
  emptyText?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function BulletList({
  items,
  emptyText = "Chưa có dữ liệu.",
}: {
  items: string[];
  emptyText?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function AIRequestBriefPage({ params }: PageProps) {
  const { requestId } = await params;
  const supabase = createSupabaseAIPageClient();

  const { data: request } = await supabase
    .from("design_requests")
    .select("id, title, description, status, created_at")
    .eq("id", requestId)
    .maybeSingle();

  const { data: brief } = await supabase
    .from("ai_briefs")
    .select("*")
    .or(`request_id.eq.${requestId},design_request_id.eq.${requestId}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: riskReport } = await supabase
    .from("ai_brief_risk_reports")
    .select("*")
    .eq("design_request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const briefJson = asRecord(brief?.brief_json);
  const visualDirection = asRecord(
    briefJson.visual_direction ?? brief?.visual_direction,
  );

  const matchingHints = asRecord(riskReport?.matching_hints);
  const riskTone = getToneByRiskLevel(riskReport?.risk_level);

  const projectTitle =
    brief?.project_title ??
    briefJson.project_title ??
    request?.title ??
    "AI Brief";

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-8 text-slate-950 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-stone-800 px-6 py-8 text-white md:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-amber-200">
                  DesignMatch AI
                </p>
                <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
                  {projectTitle}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
                  Trang này hiển thị brief thiết kế, risk report và matching
                  hints do AI tạo ra từ request thật. Đây là bước chuyển AI từ
                  API test sang giao diện sản phẩm.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                  Request ID
                </p>
                <p className="mt-2 max-w-[280px] break-all font-mono text-xs text-white">
                  {requestId}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-slate-200 bg-white p-6 md:grid-cols-4">
            <InfoBlock label="Request" value={request?.title ?? projectTitle} />
            <InfoBlock label="Trạng thái" value={request?.status ?? "N/A"} />
            <InfoBlock
              label="AI Model Run"
              value={brief?.ai_model_run_id ?? riskReport?.ai_model_run_id}
            />
            <InfoBlock
              label="Prompt version"
              value={brief?.prompt_version ?? riskReport?.prompt_version}
            />
          </div>
        </div>

        {!brief ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-lg font-semibold">Chưa có AI Brief</h2>
            <p className="mt-2 text-sm leading-6">
              Request này chưa có dữ liệu trong bảng ai_briefs. Hãy chạy API
              /api/ai/brief-builder với designRequestId tương ứng trước.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
            <div className="space-y-6">
              <Section
                title="Brief thiết kế"
                description="Tóm tắt rõ ràng để customer và designer hiểu cùng một hướng."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <InfoBlock
                    label="Bối cảnh kinh doanh"
                    value={brief?.business_context ?? briefJson.business_context}
                  />
                  <InfoBlock
                    label="Mục tiêu thiết kế"
                    value={
                      brief?.design_objective ?? briefJson.design_objective
                    }
                  />
                  <InfoBlock
                    label="Đối tượng mục tiêu"
                    value={brief?.target_audience ?? briefJson.target_audience}
                  />
                  <InfoBlock
                    label="Thông điệp chính"
                    value={brief?.key_message ?? briefJson.key_message}
                  />
                </div>
              </Section>

              <Section
                title="Định hướng thị giác"
                description="Mood, style, màu sắc, typography và bố cục mà AI đề xuất."
              >
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-800">
                      Mood
                    </p>
                    <TagList items={asArray(visualDirection.mood)} />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-800">
                      Style tags
                    </p>
                    <TagList items={asArray(visualDirection.style_tags)} />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-800">
                      Màu sắc
                    </p>
                    <TagList
                      items={asArray(visualDirection.color_direction)}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <InfoBlock
                      label="Typography"
                      value={visualDirection.typography_direction}
                    />
                    <InfoBlock
                      label="Bố cục"
                      value={visualDirection.layout_direction}
                    />
                    <InfoBlock
                      label="Hình ảnh"
                      value={visualDirection.image_direction}
                    />
                  </div>
                </div>
              </Section>

              <Section title="Yêu cầu triển khai">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="mb-3 text-sm font-semibold text-slate-800">
                      Deliverables
                    </p>
                    <BulletList
                      items={asArray(
                        briefJson.deliverables ?? brief?.deliverables,
                      )}
                    />
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-slate-800">
                      Yêu cầu nội dung
                    </p>
                    <BulletList
                      items={asArray(
                        briefJson.content_requirements ??
                          brief?.content_requirements,
                      )}
                    />
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-slate-800">
                      Yêu cầu kỹ thuật
                    </p>
                    <BulletList
                      items={asArray(
                        briefJson.technical_requirements ??
                          brief?.technical_requirements,
                      )}
                    />
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-slate-800">
                      Tài liệu cần thu thập
                    </p>
                    <BulletList
                      items={asArray(
                        briefJson.references_to_collect ??
                          brief?.references_to_collect,
                      )}
                    />
                  </div>
                </div>
              </Section>

              <Section title="Ghi chú cho designer">
                <p className="text-sm leading-7 text-slate-700">
                  {brief?.designer_notes ??
                    briefJson.designer_notes ??
                    "Chưa có ghi chú cho designer."}
                </p>
              </Section>
            </div>

            <aside className="space-y-6">
              <section
                className={`rounded-3xl border p-6 shadow-sm ${riskTone.panelClass}`}
              >
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                  Brief Risk Scanner
                </p>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-4xl font-semibold tracking-tight text-slate-950">
                      {riskReport?.risk_score ?? "N/A"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Risk score / 100
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${riskTone.badgeClass}`}
                  >
                    {riskTone.label}
                  </span>
                </div>

                <p className="mt-5 text-sm leading-7 text-slate-700">
                  {riskReport?.risk_summary ??
                    "Chưa có risk summary cho request này."}
                </p>
              </section>

              <Section title="Thông tin còn thiếu">
                <BulletList items={asArray(riskReport?.missing_information)} />
              </Section>

              <Section title="Điểm chưa rõ">
                <BulletList items={asArray(riskReport?.unclear_points)} />
              </Section>

              <Section title="Nguy cơ phát sinh scope">
                <BulletList items={asArray(riskReport?.scope_creep_risks)} />
              </Section>

              <Section title="Câu hỏi nên hỏi khách hàng">
                <BulletList
                  items={asArray(riskReport?.recommended_questions)}
                />
              </Section>

              <Section title="Matching hints">
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-800">
                      Designer styles nên ưu tiên
                    </p>
                    <TagList
                      items={asArray(
                        matchingHints.preferred_designer_styles,
                      )}
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-800">
                      Kinh nghiệm designer cần có
                    </p>
                    <BulletList
                      items={asArray(
                        matchingHints.designer_experience_needed,
                      )}
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-800">
                      Matching keywords
                    </p>
                    <TagList items={asArray(matchingHints.matching_keywords)} />
                  </div>
                </div>
              </Section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}