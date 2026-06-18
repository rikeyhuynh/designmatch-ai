import { NextResponse } from "next/server";

import { getOpenAIClient } from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getErrorPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: "UnknownError",
    message: "Không thể lấy danh sách OpenAI models.",
  };
}

function pickFirstAvailable(availableIds: string[], candidates: string[]) {
  return candidates.find((candidate) => availableIds.includes(candidate)) ?? null;
}

export async function GET() {
  try {
    const client = getOpenAIClient();
    const models = await client.models.list();

    const modelIds = models.data
      .map((model) => model.id)
      .filter(Boolean)
      .sort();

    const recommendedTextModel = pickFirstAvailable(modelIds, [
      "gpt-5.5",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.3",
      "gpt-5.3-mini",
      "gpt-5.2",
      "gpt-5.1",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4o",
      "gpt-4o-mini",
    ]);

    const recommendedVisionModel = recommendedTextModel;

    const recommendedEmbeddingModel = pickFirstAvailable(modelIds, [
      "text-embedding-3-small",
      "text-embedding-3-large",
      "text-embedding-ada-002",
    ]);

    const recommendedImageModel = pickFirstAvailable(modelIds, [
      "gpt-image-1",
      "dall-e-3",
    ]);

    return NextResponse.json({
      status: "success",
      message:
        "Đã lấy được danh sách model từ OpenAI. Dùng các recommendedModels để điền vào .env.local.",
      recommendedModels: {
        OPENAI_TEXT_MODEL: recommendedTextModel,
        OPENAI_VISION_MODEL: recommendedVisionModel,
        OPENAI_EMBEDDING_MODEL: recommendedEmbeddingModel,
        OPENAI_IMAGE_MODEL: recommendedImageModel,
      },
      modelCount: modelIds.length,
      models: modelIds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "failed",
        message:
          "Không lấy được danh sách model. Kiểm tra OPENAI_API_KEY, billing hoặc kết nối API.",
        error: getErrorPayload(error),
      },
      {
        status: 500,
      },
    );
  }
}