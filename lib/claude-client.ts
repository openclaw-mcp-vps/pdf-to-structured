import Anthropic from "@anthropic-ai/sdk";

export interface VisionSection {
  title: string;
  level: number;
  paragraphs: string[];
  listItems: string[];
}

export interface VisionTable {
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface VisionPageResult {
  page: number;
  sections: VisionSection[];
  tables: VisionTable[];
  notes: string[];
}

const defaultModel = process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-20241022";

function extractJsonFromText(raw: string) {
  const fenceMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  const objectMatch = raw.match(/\{[\s\S]*\}$/);
  if (objectMatch?.[0]) {
    return objectMatch[0].trim();
  }

  return raw.trim();
}

export function isClaudeConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function extractStructureFromPageImage(params: {
  page: number;
  base64Image: string;
  mediaType: "image/png" | "image/jpeg";
}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is missing.");
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: defaultModel,
    max_tokens: 3000,
    temperature: 0,
    system:
      "You extract structured document content from PDF page images. Output only JSON. Keep wording verbatim where possible.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Return JSON with this schema: {\"page\": number, \"sections\": [{\"title\": string, \"level\": number, \"paragraphs\": string[], \"listItems\": string[]}], \"tables\": [{\"caption\": string, \"headers\": string[], \"rows\": string[][]}], \"notes\": string[]}. Include all detected headings, paragraph content, bullet items, and table rows from the page."
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: params.mediaType,
              data: params.base64Image
            }
          } as any
        ]
      }
    ]
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");

  const jsonPayload = extractJsonFromText(text);

  try {
    const parsed = JSON.parse(jsonPayload) as VisionPageResult;
    return {
      page: parsed.page || params.page,
      sections: parsed.sections ?? [],
      tables: parsed.tables ?? [],
      notes: parsed.notes ?? []
    };
  } catch (error) {
    throw new Error(`Claude returned non-JSON output for page ${params.page}: ${String(error)}`);
  }
}
