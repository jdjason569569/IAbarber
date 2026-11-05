import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * True when `header` (X-Hub-Signature-256: "sha256=<hex>") is the HMAC-SHA256 of the raw body
 * with the app secret, i.e. the request really comes from Meta.
 */
export function isValidMetaSignature(rawBody: Buffer, header: string | undefined, appSecret: string): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  const received = Buffer.from(header.slice('sha256='.length), 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}
