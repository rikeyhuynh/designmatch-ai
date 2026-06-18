import { AIProviderError, type JsonValue } from "./types";

function removeMarkdownJsonFence(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function findBalancedJsonObject(text: string) {
  const cleaned = removeMarkdownJsonFence(text);

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  let start = -1;
  let opening = "";
  let closing = "";

  if (firstBrace === -1 && firstBracket === -1) {
    return cleaned;
  }

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    opening = "{";
    closing = "}";
  } else {
    start = firstBracket;
    opening = "[";
    closing = "]";
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < cleaned.length; index += 1) {
    const character = cleaned[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === opening) {
      depth += 1;
    }

    if (character === closing) {
      depth -= 1;

      if (depth === 0) {
        return cleaned.slice(start, index + 1);
      }
    }
  }

  return cleaned;
}

export function parseAIJson<T extends JsonValue>(text: string, label = "AI JSON") {
  const jsonCandidate = findBalancedJsonObject(text);

  try {
    return JSON.parse(jsonCandidate) as T;
  } catch (error) {
    throw new AIProviderError(
      `${label} không phải JSON hợp lệ. Hãy kiểm tra prompt hoặc output AI.`,
      "AI_JSON_PARSE_ERROR",
      {
        text,
        jsonCandidate,
        error,
      },
    );
  }
}

export function stringifyForAI(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function buildJsonOnlyInstruction(schemaDescription: string) {
  return [
    "Bạn bắt buộc chỉ trả về JSON hợp lệ.",
    "Không dùng Markdown.",
    "Không thêm giải thích ngoài JSON.",
    "Không bọc trong ```json.",
    "Không thêm comment.",
    "JSON phải parse được bằng JSON.parse.",
    "",
    "Cấu trúc JSON cần tuân theo:",
    schemaDescription.trim(),
  ].join("\n");
}