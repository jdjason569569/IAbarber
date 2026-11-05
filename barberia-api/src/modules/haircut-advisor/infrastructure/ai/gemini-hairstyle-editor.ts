import { Injectable } from '@nestjs/common';
import type { Haircut } from '../../domain/entities/haircut.entity.js';
import type { Photo } from '../../domain/entities/photo.entity.js';
import { ImageQuotaExceededError } from '../../domain/errors/image-quota-exceeded.error.js';
import type { HairstyleEditor } from '../../domain/ports/hairstyle-editor.port.js';

/** Needs billing enabled on the key: the free tier has a quota of 0 images. About US$0.04 per picture. */
const DEFAULT_MODEL = 'gemini-2.5-flash-image';
const TIMEOUT_MS = 60_000;

interface GeminiImagePart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: GeminiImagePart[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

/** Image editing with Gemini (REST `generateContent`, `responseModalities: IMAGE`). Nothing is stored. */
@Injectable()
export class GeminiHairstyleEditor implements HairstyleEditor {
  async apply(input: { photo: Photo; haircut: Haircut }): Promise<Photo> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    const model = process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_MODEL;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: input.photo.mimeType,
                    data: input.photo.base64,
                  },
                },
                { text: buildPrompt(input.haircut) },
              ],
            },
          ],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      },
    );
    if (res.status === 429) {
      throw new ImageQuotaExceededError(
        `Gemini image quota exceeded: ${await res.text()}`,
      );
    }
    if (!res.ok) {
      throw new Error(
        `Gemini image request failed: ${res.status} ${await res.text()}`,
      );
    }
    const body = (await res.json()) as GeminiResponse;
    const image = (body.candidates?.[0]?.content?.parts ?? []).find(
      (p) => p.inlineData?.data,
    )?.inlineData;
    if (!image?.data) {
      const reason =
        body.promptFeedback?.blockReason ??
        body.candidates?.[0]?.finishReason ??
        'no image';
      throw new Error(`Gemini returned no image: ${reason}`);
    }
    return { mimeType: image.mimeType ?? 'image/png', base64: image.data };
  }
}

/** English works best for image editing; the cut's Spanish name and description go in as reference. */
function buildPrompt(haircut: Haircut): string {
  return [
    `Edit this photo of a barbershop client so he wears this haircut: "${haircut.name}" — ${haircut.description}`,
    'Change ONLY the hair on the head. Keep exactly the same person: face, identity, skin, expression, eyes, beard and facial hair, ears, clothes, pose, framing, lighting and background.',
    "Make it look like a real photo taken right after a professional cut, with a natural hairline and the client's own hair color and texture.",
  ].join('\n');
}
