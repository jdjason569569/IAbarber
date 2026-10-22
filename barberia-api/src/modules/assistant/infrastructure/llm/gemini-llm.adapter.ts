import { Injectable } from '@nestjs/common';
import type { LlmPort, LlmResponse, LlmTool } from '../../domain/ports/llm.port.js';

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
}

@Injectable()
export class GeminiLlmAdapter implements LlmPort {
  async complete(input: { system: string; user: string; tools: LlmTool[] }): Promise<LlmResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: [{ role: 'user', parts: [{ text: input.user }] }],
          tools: [{ functionDeclarations: input.tools.map(toDeclaration) }],
          toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
          generationConfig: { temperature: 0 },
        }),
      },
    );
    if (!res.ok) {
      throw new Error(`Gemini request failed: ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as GeminiResponse;
    const parts = body.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .map((p) => p.text ?? '')
      .join('')
      .trim();
    return {
      text: text || null,
      toolCalls: parts
        .filter((p): p is GeminiPart & { functionCall: NonNullable<GeminiPart['functionCall']> } =>
          Boolean(p.functionCall),
        )
        .map((p) => ({ name: p.functionCall.name, arguments: p.functionCall.args ?? {} })),
    };
  }
}

/** Gemini rejects an OBJECT schema with empty `properties`, so parameterless tools omit it. */
function toDeclaration(tool: LlmTool): Record<string, unknown> {
  const properties = (tool.parameters['properties'] ?? {}) as Record<string, unknown>;
  const hasParams = Object.keys(properties).length > 0;
  return {
    name: tool.name,
    description: tool.description,
    ...(hasParams ? { parameters: tool.parameters } : {}),
  };
}
