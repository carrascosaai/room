// UTF-8 + base64url sin depender de btoa/TextEncoder (no siempre existen en el móvil).
// Sirve para meter datos dentro de un enlace o un QR sin servidor.

export function encodeJson(value: unknown): string {
  return toBase64Url(utf8Encode(JSON.stringify(value)));
}

/** Lanza si el texto no es base64url válido o no es JSON. */
export function decodeJson(data: string): unknown {
  return JSON.parse(utf8Decode(fromBase64Url(data)));
}

/** Lo que va después de # o de ?d= en un enlace (o el texto tal cual). */
export function linkData(input: string): string {
  const s = input.trim();
  if (s.includes('#')) return s.slice(s.indexOf('#') + 1);
  const q = s.match(/[?&]d=([^&\s]+)/);
  return q ? q[1] : s;
}

function utf8Encode(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

function utf8Decode(bytes: number[]): string {
  let s = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let c: number;
    if (b < 0x80) c = bytes[i++];
    else if (b < 0xe0) (c = ((b & 31) << 6) | (bytes[i + 1] & 63)), (i += 2);
    else if (b < 0xf0) (c = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63)), (i += 3);
    else (c = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63)), (i += 4);
    s += String.fromCodePoint(c);
  }
  return s;
}

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toBase64Url(bytes: number[]): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    s += ABC[(n >> 18) & 63] + ABC[(n >> 12) & 63];
    if (i + 1 < bytes.length) s += ABC[(n >> 6) & 63];
    if (i + 2 < bytes.length) s += ABC[n & 63];
  }
  return s;
}

function fromBase64Url(s: string): number[] {
  const clean = s.replace(/\+/g, '-').replace(/\//g, '_').replace(/[=\s]/g, '');
  const out: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of clean) {
    const v = ABC.indexOf(ch);
    if (v < 0) throw new Error('bad base64');
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 255);
    }
  }
  return out;
}
