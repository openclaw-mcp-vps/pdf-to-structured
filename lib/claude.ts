import Anthropic from "@anthropic-ai/sdk";

import type { StructuredPdfResult } from "@/types/pdf-data";

const MODEL_NAME = "claude-3-7-sonnet-latest";

const EXTRACTION_PROMPT = `You convert PDFs into structured JSON for data pipelines.
Return STRICT JSON only, no markdown.

Schema:
{
  "sections": [
    {
      "type": "section",
      "heading": "string",
      "level": number,
      "page": number,
      "children": [
        { "type": "paragraph", "text": "string", "page": number },
        { "type": "list", "ordered": boolean, "items": ["string"], "page": number },
        { "type": "table", "title": "string", "headers": ["string"], "rows": [["string"]], "page": number }
      ]
    }
  ],
  "tables": [
    { "type": "table", "title": "string", "headers": ["string"], "rows": [["string"]], "page": number }
  ]
}

Rules:
- Preserve heading hierarchy.
- Preserve table row/column order.
- Keep paragraph text clean and de-duplicated.
- Use empty arrays instead of null.
- If a field is unknown, omit it.
`;

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return null;
  }
  return new Anthropic({ apiKey: key });
}

function extractJsonString(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error("Claude response did not contain JSON");
}

function normalizeFromClaude(
  parsed: Partial<StructuredPdfResult>
): Pick<StructuredPdfResult, "sections" | "tables"> {
  return {
    sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    tables: Array.isArray(parsed.tables) ? parsed.tables : []
  };
}

export async function extractStructuredWithClaude(params: {
  pdfBase64: string;
  sourceName: string;
  fallbackText: string;
}): Promise<Pick<StructuredPdfResult, "sections" | "tables"> | null> {
  const client = getClient();
  if (!client) {
    return null;
  }

  const userText = `Source: ${params.sourceName}\n\nFallback extracted text:\n${params.fallbackText.slice(0, 60000)}`;

  const response = (await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 6000,
    temperature: 0,
    system: EXTRACTION_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: params.pdfBase64
            }
          },
          {
            type: "text",
            text: userText
          }
        ]
      }
    ]
  } as never)) as {
    content: Array<{ type: string; text?: string }>;
  };

  const textBlock = response.content.find((item) => item.type === "text")?.text;
  if (!textBlock) {
    return null;
  }

  const parsed = JSON.parse(extractJsonString(textBlock)) as Partial<StructuredPdfResult>;
  return normalizeFromClaude(parsed);
}

export const CLAUDE_MODEL_NAME = MODEL_NAME;
