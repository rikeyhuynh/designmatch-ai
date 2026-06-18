import { NextResponse } from "next/server";

import {
  buildAIDesignBrief,
  type AIBriefBuilderPricingPackage,
} from "@/lib/ai/tasks/brief-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = Record<string, unknown>;

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Body không phải JSON hợp lệ.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await buildAIDesignBrief({
      designRequestId: stringOrNull(body.designRequestId),
      customerProfileId: stringOrNull(body.customerProfileId),

      title: stringOrNull(body.title),
      productDescription: stringOrNull(body.productDescription),
      designType: stringOrNull(body.designType),
      targetAudience: stringOrNull(body.targetAudience),
      preferredStyle: stringOrNull(body.preferredStyle),
      preferredColors: stringOrNull(body.preferredColors),
      budget: stringOrNull(body.budget),
      deadline: stringOrNull(body.deadline),
      channel: stringOrNull(body.channel),
      businessName: stringOrNull(body.businessName),
      businessLocation: stringOrNull(body.businessLocation),

      visualIntakeResult: recordOrNull(body.visualIntakeResult),

      /**
       * Rất quan trọng:
       * Field này giúp AI Brief Builder biết người dùng đã chọn gói nào,
       * giá bao nhiêu, phạm vi ra sao, để brief sinh ra đúng loại ấn phẩm.
       */
      pricingPackage: normalizePricingPackage(body.pricingPackage),
    });

    return NextResponse.json({
      status: "success",
      provider: result.provider,
      model: result.model,
      task: result.task,
      usage: result.usage,
      aiModelRunId: result.aiModelRunId,
      savedBriefId: result.savedBriefId,
      savedRiskReportId: result.savedRiskReportId,
      result: result.result,
    });
  } catch (error) {
    console.error("[DesignMatch AI] Brief Builder route failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "AI Brief Builder chưa tạo được brief.",
        error,
      },
      { status: 500 },
    );
  }
}

function stringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function recordOrNull(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizePricingPackage(
  value: unknown,
): AIBriefBuilderPricingPackage | null {
  const record = recordOrNull(value);

  if (!record) {
    return null;
  }

  return {
    pricingTier: stringOrNull(record.pricingTier),
    packageCode: stringOrNull(record.packageCode),
    packageName: stringOrNull(record.packageName),
    packageType: stringOrNull(record.packageType),
    packageScopeNote: stringOrNull(record.packageScopeNote),

    packagePriceMinVnd: numberOrNull(record.packagePriceMinVnd),
    packagePriceMaxVnd: numberOrNull(record.packagePriceMaxVnd),
    selectedPriceVnd: numberOrNull(record.selectedPriceVnd),

    priceDetailLevel: stringOrNull(record.priceDetailLevel),
    priceDetailDescription: stringOrNull(record.priceDetailDescription),

    revisionLimit: numberOrNull(record.revisionLimit),
    deliverableLimit: numberOrNull(record.deliverableLimit),
  };
}