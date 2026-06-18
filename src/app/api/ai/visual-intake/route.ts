import { NextResponse } from "next/server";

import { analyzeProductVisual } from "@/lib/ai/tasks/visual-intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getErrorPayload(error: unknown) {
  if (error instanceof Error) {
    const possibleError = error as any;

    return {
      name: error.name,
      message: error.message,
      code:
        "code" in error && typeof possibleError.code === "string"
          ? possibleError.code
          : "AI_VISUAL_INTAKE_FAILED",
      causeDetail: possibleError.causeDetail ?? null,
    };
  }

  return {
    name: "UnknownError",
    message: "AI Visual Intake thất bại vì lỗi không xác định.",
    code: "AI_VISUAL_INTAKE_FAILED",
    causeDetail: null,
  };
}

function isProductionBlocked(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const token = process.env.AI_HEALTH_CHECK_TOKEN;

  if (!token) {
    return true;
  }

  const requestUrl = new URL(request.url);
  const requestToken = requestUrl.searchParams.get("token");

  return requestToken !== token;
}

export async function POST(request: Request) {
  if (isProductionBlocked(request)) {
    return NextResponse.json(
      {
        status: "blocked",
        message:
          "AI Visual Intake test API bị khóa ở production. Thêm AI_HEALTH_CHECK_TOKEN nếu muốn test trên server thật.",
      },
      {
        status: 403,
      },
    );
  }

  try {
    const body = await request.json();

    const imageUrl =
      typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";

    if (!imageUrl) {
      return NextResponse.json(
        {
          status: "failed",
          message: "Thiếu imageUrl. Hãy gửi URL ảnh public hoặc signed URL.",
        },
        {
          status: 400,
        },
      );
    }

    const result = await analyzeProductVisual({
      imageUrl,
      designRequestId:
        typeof body?.designRequestId === "string"
          ? body.designRequestId
          : null,
      customerProfileId:
        typeof body?.customerProfileId === "string"
          ? body.customerProfileId
          : null,
      sourceImageStoragePath:
        typeof body?.sourceImageStoragePath === "string"
          ? body.sourceImageStoragePath
          : null,
      extraContext: {
        productDescription:
          typeof body?.productDescription === "string"
            ? body.productDescription
            : null,
        designType:
          typeof body?.designType === "string" ? body.designType : null,
        targetAudience:
          typeof body?.targetAudience === "string" ? body.targetAudience : null,
        preferredStyle:
          typeof body?.preferredStyle === "string" ? body.preferredStyle : null,
        preferredColors:
          typeof body?.preferredColors === "string"
            ? body.preferredColors
            : null,
        budget: typeof body?.budget === "string" ? body.budget : null,
        deadline: typeof body?.deadline === "string" ? body.deadline : null,
        channel: typeof body?.channel === "string" ? body.channel : null,
      },
    });

    return NextResponse.json({
      status: "success",
      message: result.fallback
        ? "AI Visual Intake đang dùng fallback vì AI chưa xử lý được ảnh. Flow vẫn tiếp tục được."
        : "AI Visual Intake đã phân tích ảnh thật. Nếu có designRequestId, kết quả cũng được lưu vào ai_visual_intakes.",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "failed",
        message: "AI Visual Intake thất bại.",
        error: getErrorPayload(error),
      },
      {
        status: 500,
      },
    );
  }
}