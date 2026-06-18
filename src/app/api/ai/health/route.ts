import { NextResponse } from "next/server";

import { buildJsonOnlyInstruction } from "@/lib/ai/json";
import { getActiveAIProvider, runAIJson } from "@/lib/ai/provider";
import { buildCreativeIntelligenceInstructions } from "@/lib/ai/prompts/creative-intelligence";
import type { JsonValue } from "@/lib/ai/types";

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
          : "AI_HEALTH_CHECK_FAILED",
      causeDetail: possibleError.causeDetail ?? null,
    };
  }

  return {
    name: "UnknownError",
    message: "AI health check thất bại vì lỗi không xác định.",
    code: "AI_HEALTH_CHECK_FAILED",
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

export async function GET(request: Request) {
  if (isProductionBlocked(request)) {
    return NextResponse.json(
      {
        status: "blocked",
        message:
          "AI health check bị khóa ở production. Thêm AI_HEALTH_CHECK_TOKEN nếu muốn test trên server thật.",
      },
      {
        status: 403,
      },
    );
  }

  try {
    const schemaDescription = `
{
  "status": "ok",
  "project": "DesignMatch AI",
  "test_name": "AI Health Check",
  "ai_role": "Creative Intelligence Engine",
  "active_provider": "string",
  "capabilities_checked": [
    "json_generation",
    "brief_reasoning",
    "creative_matching_context"
  ],
  "one_sentence_summary": "string",
  "next_recommended_module": "string"
}
`;

    const activeProvider = getActiveAIProvider();

    const instructions = buildCreativeIntelligenceInstructions(`
Nhiệm vụ:
Bạn đang chạy health check cho AI Provider Layer của DesignMatch AI.

Hãy xác nhận rằng AI có thể:
- hiểu ngữ cảnh DesignMatch AI,
- trả về JSON hợp lệ,
- mô tả đúng vai trò Creative Intelligence Engine,
- đề xuất module tiếp theo nên triển khai.

Provider đang dùng: ${activeProvider}

${buildJsonOnlyInstruction(schemaDescription)}
`);

    const result = await runAIJson<Record<string, JsonValue>>({
      task: "ai_health_check",
      instructions,
      input:
        "Chạy kiểm tra AI Provider Layer cho DesignMatch AI. Đây chỉ là health check kỹ thuật, không dùng dữ liệu khách hàng thật.",
      maxOutputTokens: 700,
      jsonLabel: "DesignMatch AI Health Check JSON",
      runContext: {
        purpose: "text",
        promptVersion: "ai-health-check-v2-multi-provider",
        userInput: {
          source: "/api/ai/health",
          scenario: "local_ai_provider_health_check",
          activeProvider,
        },
      },
    });

    return NextResponse.json({
      status: "success",
      message:
        "AI Provider Layer hoạt động. Nếu aiModelRunId có giá trị, bảng ai_model_runs cũng đã ghi log thành công.",
      activeProvider,
      aiModelRunId: result.aiModelRunId ?? null,
      provider: result.provider,
      model: result.model,
      task: result.task,
      usage: result.usage,
      aiOutput: result.json,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "failed",
        activeProvider: getActiveAIProvider(),
        message:
          "AI Health Check thất bại. Lỗi chi tiết nằm trong error.causeDetail.",
        error: getErrorPayload(error),
      },
      {
        status: 500,
      },
    );
  }
}