import "server-only";

import { Buffer } from "node:buffer";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getGeminiClient, getGeminiModelConfig } from "@/lib/ai/gemini";
import { resolveDeliverableSpec } from "@/lib/ai/concept-deliverable-spec";

const VISUAL_CONCEPT_PREVIEW_PROMPT_VERSION =
  "visual-concept-preview-deliverable-aware-v4";

const DEFAULT_BUCKET = "concept-previews";
const WATERMARK_TEXT = "DESIGNMATCH AI PREVIEW";

type AnyRecord = Record<string, any>;

type DesignRequestContext = {
  id: string;
  title: string | null;
  business_name: string | null;
  category: string | null;
  package_code: string | null;
  package_name: string | null;
  package_type: string | null;
  description: string | null;
  target_audience: string | null;
  reference_image_url: string | null;
};

export type VisualConceptPreviewInput = {
  designRequestId: string;
  customerProfileId?: string | null;
  conceptDirectionId: string;
  finalBriefJson?: AnyRecord | null;
  conceptDirection: AnyRecord;
  designType?: string | null;
  packageCode?: string | null;
  packageName?: string | null;
  packageType?: string | null;
};

export type VisualConceptPreviewResult = {
  id: string;
  design_request_id: string;
  customer_profile_id: string | null;
  concept_direction_id: string;
  ai_model_run_id: string | null;
  provider: string;
  model: string;
  prompt: string;
  generation_prompt: string;
  negative_prompt: string;
  image_storage_path: string;
  image_public_url: string;
  image_mime_type: string;
  preview_status: string;
  preview_json: AnyRecord;
  created_at: string;
};

function asRecord(value: unknown): AnyRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as AnyRecord;
}

function stringValue(value: unknown, fallback = "") {
  if (typeof value === "string") {
    const cleaned = value.trim();
    return cleaned.length > 0 ? cleaned : fallback;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function stringArray(value: unknown, limit = 12) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function buildColorText(value: unknown) {
  if (!Array.isArray(value)) {
    return "Use a cohesive professional palette inferred from the concept.";
  }

  const colors = value
    .map((item) => {
      const record = asRecord(item);
      const name = stringValue(record.name);
      const hex = stringValue(record.hex_guess);
      const role = stringValue(record.role);

      return [name, hex, role].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .slice(0, 6);

  return colors.length > 0
    ? colors.join(", ")
    : "Use a cohesive professional palette inferred from the concept.";
}

function buildPreviewPrompt({
  input,
  requestContext,
}: {
  input: VisualConceptPreviewInput;
  requestContext: DesignRequestContext | null;
}) {
  const concept = asRecord(input.conceptDirection);
  const brief = asRecord(input.finalBriefJson);

  const designType = stringValue(
    input.designType ?? requestContext?.category ?? brief.design_type,
    "social_post",
  );

  const packageCode = stringValue(
    input.packageCode ?? requestContext?.package_code,
  );

  const packageName = stringValue(
    input.packageName ?? requestContext?.package_name,
  );

  const packageType = stringValue(
    input.packageType ?? requestContext?.package_type,
  );

  const deliverableSpec = resolveDeliverableSpec({
    designType,
    packageCode,
    packageName,
    packageType,
    requestTitle: requestContext?.title ?? brief.project_title,
  });

  const projectTitle = stringValue(
    brief.project_title ??
      requestContext?.title ??
      concept.concept_name ??
      "Design concept preview",
    "Design concept preview",
  );

  const businessName = stringValue(
    requestContext?.business_name ?? brief.business_name,
    "Local Vietnamese brand",
  );

  const businessContext = stringValue(
    brief.business_context ?? requestContext?.description,
    "A small Vietnamese business brand with a need for design.",
  );

  const designObjective = stringValue(
    brief.design_objective,
    "Create a clear, attractive and persuasive design direction.",
  );

  const targetAudience = stringValue(
    brief.target_audience ?? requestContext?.target_audience,
    "Young local target customers",
  );

  const keyMessage = stringValue(
    brief.key_message,
    "Communicate a clear and attractive message.",
  );

  const conceptName = stringValue(concept.concept_name, "Designer concept");
  const conceptSummary = stringValue(concept.concept_summary);
  const strategicRole = stringValue(concept.strategic_role);
  const moodTags = stringArray(concept.mood_tags, 8).join(", ");
  const styleTags = stringArray(concept.style_tags, 8).join(", ");
  const colorPalette = buildColorText(concept.color_palette);
  const typographyDirection = stringValue(concept.typography_direction);
  const layoutDirection = stringValue(concept.layout_direction);
  const imageDirection = stringValue(concept.image_direction);
  const contentDirection = stringValue(concept.content_direction);
  const bestFor = stringArray(concept.best_for, 6).join(", ");
  const previewImagePrompt = stringValue(concept.preview_image_prompt);

  return `
${previewImagePrompt}

Create a premium designer-grade visual concept preview for client presentation.

DELIVERABLE FORMAT - MUST FOLLOW
- Selected product/package: ${packageName || deliverableSpec.label}
- Deliverable type: ${deliverableSpec.label}
- Expected aspect ratio / format logic: ${deliverableSpec.aspectRatio}
- Render mode: ${deliverableSpec.previewMode}
- Layout logic: ${deliverableSpec.layoutFocus}
- Typography logic: ${deliverableSpec.typographyFocus}
- Image/visual logic: ${deliverableSpec.imageFocus}
- Content logic: ${deliverableSpec.contentFocus}

IMPORTANT FORMAT RULES
- Do not turn this into a generic poster unless the selected deliverable is actually Poster.
- If deliverable is Logo, create a logo concept presentation board, not an advertisement.
- If deliverable is Menu or Price List, prioritize readable information hierarchy and item/price sections.
- If deliverable is Voucher/Gift Card/Namecard/Loyalty Card, create a card-based preview, not a social poster.
- If deliverable is Banner or Facebook Cover, create a wide horizontal composition.
- If deliverable is Story, create a vertical mobile-first 9:16 composition.
- If deliverable is Packaging Label, show label design applied on packaging.
- If deliverable is Standee, create a tall vertical print display composition.

PROJECT CONTEXT
- Project title: ${projectTitle}
- Business / brand: ${businessName}
- Database category: ${designType}
- Package code: ${packageCode || "not provided"}
- Package name: ${packageName || "not provided"}
- Package type: ${packageType || "not provided"}
- Business context: ${businessContext}
- Design objective: ${designObjective}
- Target audience: ${targetAudience}
- Key message: ${keyMessage}

SELECTED CONCEPT
- Concept name: ${conceptName}
- Concept summary: ${conceptSummary}
- Strategic role: ${strategicRole}
- Best for: ${bestFor || deliverableSpec.label}
- Mood tags: ${moodTags || "fresh, polished, professional"}
- Style tags: ${styleTags || "professional, art-directed, polished"}
- Color palette: ${colorPalette}
- Typography direction: ${typographyDirection || deliverableSpec.typographyFocus}
- Layout direction: ${layoutDirection || deliverableSpec.layoutFocus}
- Image direction: ${imageDirection || deliverableSpec.imageFocus}
- Content direction: ${contentDirection || deliverableSpec.contentFocus}

ART DIRECTION REQUIREMENTS
- The output should feel like a professional designer's concept preview, not a generic AI template.
- Strong visual hierarchy.
- Clear format-specific composition.
- Intentional spacing, alignment, rhythm, and layout layering.
- Polished color palette.
- Premium presentation-ready quality.
- Suitable for client review.
- Protect with watermark but keep the concept readable.

TEXT RENDERING RULES
- Avoid readable detailed final text.
- Use short believable placeholders only if needed.
- No Lorem Ipsum.
- No large generic words like HEADLINE, TRENDLINE, PROMO TEMPLATE.
- No fake QR code.
- No phone number unless tiny and not important.

WATERMARK REQUIREMENT
- Add a visible repeated diagonal semi-transparent watermark across the image.
- The watermark text must be exactly: "${WATERMARK_TEXT}".
- Watermark should protect the image from being used directly by customers.

REFERENCE IMAGE RULE
- If a reference image is provided, use it only as visual grounding for product/object/brand mood.
- Do not copy exact logo or copyrighted graphics.

STRICT NEGATIVE RULES
- No Canva template look.
- No simplistic amateur layout.
- No wrong deliverable format.
- No generic poster if the selected deliverable is not poster.
- No empty mockup board feeling.
- No low-effort composition.
- No ugly or cluttered typography.
- No final production delivery file look without watermark.

FINAL INSTRUCTION
Create a designer-grade, polished, high-fidelity ${deliverableSpec.label} concept preview with watermark.
This is concept preview only, not final design.
`.trim();
}

function buildNegativePrompt() {
  return [
    "canva template",
    "generic template",
    "wrong format",
    "generic poster when not selected",
    "basic social post template",
    "cheap poster",
    "simple mockup board",
    "wireframe look",
    "lorem ipsum",
    "HEADLINE",
    "TRENDLINE",
    "PROMO TEMPLATE",
    "random rectangles",
    "empty layout",
    "ugly typography",
    "low quality",
    "flat boring composition",
    "poor hierarchy",
    "watermark missing",
    "blurry product",
    "distorted object",
    "amateur design",
  ].join(", ");
}

async function ensureBucket(bucketName: string) {
  const supabase = createSupabaseAdminClient() as any;

  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = Array.isArray(buckets)
    ? buckets.some((bucket) => bucket.name === bucketName)
    : false;

  if (bucketExists) {
    return;
  }

  await supabase.storage.createBucket(bucketName, {
    public: true,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    fileSizeLimit: 10 * 1024 * 1024,
  });
}

function getFileExtension(mimeType: string) {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return "jpg";
  }

  if (mimeType.includes("webp")) {
    return "webp";
  }

  return "png";
}

async function getDesignRequestContext(
  designRequestId: string,
): Promise<DesignRequestContext | null> {
  const supabase = createSupabaseAdminClient() as any;

  const { data, error } = await supabase
    .from("design_requests")
    .select(
      `
      id,
      title,
      business_name,
      category,
      package_code,
      package_name,
      package_type,
      description,
      target_audience,
      reference_image_url
    `,
    )
    .eq("id", designRequestId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: stringValue(data.id),
    title: stringValue(data.title) || null,
    business_name: stringValue(data.business_name) || null,
    category: stringValue(data.category) || null,
    package_code: stringValue(data.package_code) || null,
    package_name: stringValue(data.package_name) || null,
    package_type: stringValue(data.package_type) || null,
    description: stringValue(data.description) || null,
    target_audience: stringValue(data.target_audience) || null,
    reference_image_url: stringValue(data.reference_image_url) || null,
  };
}

async function fetchReferenceImageInlineData(imageUrl: string) {
  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const mimeType =
      response.headers.get("content-type")?.trim() || "image/jpeg";

    return {
      inlineData: {
        mimeType,
        data: Buffer.from(arrayBuffer).toString("base64"),
      },
    };
  } catch {
    return null;
  }
}

async function buildModelContents({
  prompt,
  referenceImageUrl,
}: {
  prompt: string;
  referenceImageUrl: string | null;
}) {
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];

  if (referenceImageUrl) {
    const inlineImagePart = await fetchReferenceImageInlineData(referenceImageUrl);

    if (inlineImagePart) {
      parts.push(inlineImagePart);
    }
  }

  return [
    {
      role: "user",
      parts,
    },
  ];
}

function extractInlineImage(response: any) {
  const candidates = Array.isArray(response?.candidates)
    ? response.candidates
    : [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts)
      ? candidate.content.parts
      : [];

    for (const part of parts) {
      const inlineData = part?.inlineData ?? part?.inline_data;

      if (inlineData?.data) {
        return {
          data: String(inlineData.data),
          mimeType: String(
            inlineData.mimeType ?? inlineData.mime_type ?? "image/png",
          ),
        };
      }
    }
  }

  const parts = Array.isArray(response?.parts) ? response.parts : [];

  for (const part of parts) {
    const inlineData = part?.inlineData ?? part?.inline_data;

    if (inlineData?.data) {
      return {
        data: String(inlineData.data),
        mimeType: String(
          inlineData.mimeType ?? inlineData.mime_type ?? "image/png",
        ),
      };
    }
  }

  return null;
}

export async function generateVisualConceptPreview(
  input: VisualConceptPreviewInput,
): Promise<VisualConceptPreviewResult> {
  const bucketName =
    process.env.SUPABASE_CONCEPT_PREVIEW_BUCKET?.trim() || DEFAULT_BUCKET;

  const adminSupabase = createSupabaseAdminClient() as any;
  const geminiClient = getGeminiClient();
  const modelConfig = getGeminiModelConfig() as any;

  const imageModel =
    process.env.GEMINI_IMAGE_MODEL?.trim() ||
    modelConfig.imageModel ||
    "gemini-2.5-flash-image-preview";

  const requestContext = await getDesignRequestContext(input.designRequestId);

  const generationPrompt = buildPreviewPrompt({
    input,
    requestContext,
  });

  const negativePrompt = buildNegativePrompt();

  const contents = await buildModelContents({
    prompt: `${generationPrompt}\n\nNegative prompt: ${negativePrompt}`,
    referenceImageUrl: requestContext?.reference_image_url ?? null,
  });

  const response = await geminiClient.models.generateContent({
    model: imageModel,
    contents,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      temperature: 0.9,
    },
  } as any);

  const inlineImage = extractInlineImage(response);

  if (!inlineImage) {
    throw new Error(
      "Gemini không trả về ảnh preview. Hãy kiểm tra GEMINI_IMAGE_MODEL, billing hoặc quota.",
    );
  }

  const imageBuffer = Buffer.from(inlineImage.data, "base64");
  const extension = getFileExtension(inlineImage.mimeType);
  const safeCustomerId = input.customerProfileId ?? "unknown-customer";

  const storagePath = `${safeCustomerId}/${input.designRequestId}/${input.conceptDirectionId}-${Date.now()}.${extension}`;

  await ensureBucket(bucketName);

  const { error: uploadError } = await adminSupabase.storage
    .from(bucketName)
    .upload(storagePath, imageBuffer, {
      contentType: inlineImage.mimeType,
      upsert: true,
      cacheControl: "60",
    });

  if (uploadError) {
    throw new Error(`Không thể upload visual preview: ${uploadError.message}`);
  }

  const { data: publicUrlData } = adminSupabase.storage
    .from(bucketName)
    .getPublicUrl(storagePath);

  const publicUrl = publicUrlData?.publicUrl;

  if (!publicUrl) {
    throw new Error("Không lấy được public URL cho visual preview.");
  }

  const previewJson = {
    prompt_version: VISUAL_CONCEPT_PREVIEW_PROMPT_VERSION,
    watermark_text: WATERMARK_TEXT,
    designer_grade: true,
    deliverable_aware: true,
    request_context: requestContext,
    concept_direction: input.conceptDirection,
    final_brief_json: input.finalBriefJson ?? null,
  };

  const insertPayload = {
    design_request_id: input.designRequestId,
    customer_profile_id: input.customerProfileId ?? null,
    concept_direction_id: input.conceptDirectionId,
    ai_model_run_id: null,

    provider: "gemini",
    model: imageModel,

    prompt: generationPrompt,
    generation_prompt: generationPrompt,
    negative_prompt: negativePrompt,

    image_storage_path: storagePath,
    image_public_url: publicUrl,
    image_mime_type: inlineImage.mimeType,

    preview_status: "generated",
    preview_json: previewJson,
  };

  const { data, error } = await adminSupabase
    .from("ai_concept_previews")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Không thể lưu concept preview vào database: ${error.message}`,
    );
  }

  const row = data as AnyRecord;

  return {
    id: stringValue(row.id),
    design_request_id: stringValue(row.design_request_id, input.designRequestId),
    customer_profile_id:
      stringValue(row.customer_profile_id) || input.customerProfileId || null,
    concept_direction_id: stringValue(
      row.concept_direction_id,
      input.conceptDirectionId,
    ),
    ai_model_run_id: stringValue(row.ai_model_run_id) || null,
    provider: stringValue(row.provider, "gemini"),
    model: stringValue(row.model, imageModel),
    prompt: stringValue(row.prompt, generationPrompt),
    generation_prompt: stringValue(row.generation_prompt, generationPrompt),
    negative_prompt: stringValue(row.negative_prompt, negativePrompt),
    image_storage_path: stringValue(row.image_storage_path, storagePath),
    image_public_url: stringValue(row.image_public_url, publicUrl),
    image_mime_type: stringValue(row.image_mime_type, inlineImage.mimeType),
    preview_status: stringValue(row.preview_status, "generated"),
    preview_json: asRecord(row.preview_json),
    created_at: stringValue(row.created_at, new Date().toISOString()),
  };
}