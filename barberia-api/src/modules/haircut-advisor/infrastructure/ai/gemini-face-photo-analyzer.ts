import { Injectable } from '@nestjs/common';
import { FACE_SHAPES } from '../../domain/entities/face-shape.entity.js';
import type { FaceShape } from '../../domain/entities/face-shape.entity.js';
import type { Haircut } from '../../domain/entities/haircut.entity.js';
import { HAIR_TYPES } from '../../domain/ports/face-photo-analyzer.port.js';
import type {
  FacePhotoAnalysis,
  FacePhotoAnalyzer,
  HairType,
} from '../../domain/ports/face-photo-analyzer.port.js';

/** Flash (not lite): it reads hair texture and hairline noticeably better and still answers in a few seconds. */
const DEFAULT_MODEL = 'gemini-3.5-flash';
const TIMEOUT_MS = 25_000;
const MAX_PICKS = 5;

const SYSTEM_PROMPT = `Eres un barbero experto en visagismo masculino. Recibes la foto de frente de un cliente y el catálogo de cortes de la barbería.
1. Determina la forma del rostro: oval, round, square, oblong, heart, diamond o triangle. Da una probabilidad a cada forma posible (suman 1). Fíjate en la relación largo/ancho, la anchura de la frente, los pómulos y la mandíbula, y en lo marcado del mentón; no te dejes engañar por el pelo o la barba que tapan el contorno.
2. Describe el pelo: tipo (straight, wavy, curly, coily), densidad, entradas o coronilla si se notan, y la barba si tiene. Escribe "summary" en español, una o dos frases cortas, sin juzgar el físico.
3. Elige hasta ${MAX_PICKS} cortes SOLO del catálogo (usa su "id" exacto), del más al menos recomendado, con "score" de 0 a 1 y "reason": una frase en español que explique por qué le queda bien a ESTE cliente (rostro, tipo de pelo, entradas).
Si no se ve una cara humana con claridad, responde faceDetected=false y listas vacías.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    faceDetected: { type: 'BOOLEAN' },
    shapeScores: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          shape: { type: 'STRING', enum: [...FACE_SHAPES] },
          probability: { type: 'NUMBER' },
        },
        required: ['shape', 'probability'],
      },
    },
    hairType: { type: 'STRING', enum: [...HAIR_TYPES] },
    summary: { type: 'STRING' },
    picks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          haircutId: { type: 'STRING' },
          score: { type: 'NUMBER' },
          reason: { type: 'STRING' },
        },
        required: ['haircutId', 'score', 'reason'],
      },
    },
  },
  required: ['faceDetected', 'shapeScores', 'hairType', 'summary', 'picks'],
};

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

interface RawAnalysis {
  faceDetected?: boolean;
  shapeScores?: { shape?: string; probability?: number }[];
  hairType?: string;
  summary?: string;
  picks?: { haircutId?: string; score?: number; reason?: string }[];
}

/** Gemini vision (REST `generateContent` with a JSON response schema). The photo is not stored. */
@Injectable()
export class GeminiFacePhotoAnalyzer implements FacePhotoAnalyzer {
  get enabled(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  async analyze(input: {
    photo: { mimeType: string; base64: string };
    catalog: Haircut[];
  }): Promise<FacePhotoAnalysis> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    const model = process.env.GEMINI_HAIRCUT_MODEL ?? DEFAULT_MODEL;
    const catalog = input.catalog.map(({ id, name, description }) => ({
      id,
      name,
      description,
    }));
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
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
                { text: `Catálogo de cortes:\n${JSON.stringify(catalog)}` },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    );
    if (!res.ok) {
      throw new Error(
        `Gemini request failed: ${res.status} ${await res.text()}`,
      );
    }
    const body = (await res.json()) as GeminiResponse;
    const text = (body.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('');
    return toAnalysis(
      JSON.parse(text) as RawAnalysis,
      new Set(input.catalog.map((h) => h.id)),
    );
  }
}

/** Keeps only valid shapes and catalog ids; the model may still answer something unexpected. */
function toAnalysis(
  raw: RawAnalysis,
  catalogIds: Set<string>,
): FacePhotoAnalysis {
  if (raw.faceDetected === false) {
    throw new Error('Gemini found no face in the photo');
  }
  const shapeScores = (raw.shapeScores ?? [])
    .filter(
      (s): s is { shape: FaceShape; probability: number } =>
        FACE_SHAPES.includes(s.shape as FaceShape) &&
        Number.isFinite(s.probability) &&
        (s.probability ?? 0) > 0,
    )
    .map(({ shape, probability }) => ({ shape, probability }));
  const seen = new Set<string>();
  const picks = (raw.picks ?? [])
    .filter(
      (p) =>
        p.haircutId &&
        catalogIds.has(p.haircutId) &&
        !seen.has(p.haircutId) &&
        seen.add(p.haircutId),
    )
    .slice(0, MAX_PICKS)
    .map((p) => ({
      haircutId: p.haircutId as string,
      score: clamp(Number(p.score)),
      reason: (p.reason ?? '').trim(),
    }));
  if (shapeScores.length === 0 || picks.length === 0) {
    throw new Error(
      `Gemini answer without shapes or cuts: ${JSON.stringify(raw)}`,
    );
  }
  return {
    shapeScores,
    hairType: HAIR_TYPES.includes(raw.hairType as HairType)
      ? (raw.hairType as HairType)
      : 'straight',
    summary: (raw.summary ?? '').trim(),
    picks,
  };
}

function clamp(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
