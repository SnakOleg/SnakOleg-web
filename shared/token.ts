const enc = new TextEncoder();
const dec = new TextDecoder();

export const b64u = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export const unb64u = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

const hmacKey = (secret: string) =>
  crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);

export async function sign(data: object, secret: string, ttlSec: number) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const body = b64u(enc.encode(JSON.stringify({ ...data, exp })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body));
  return `${body}.${b64u(sig)}`;
}

export async function verify<T = Record<string, any>>(
  token: string | undefined,
  secret: string,
): Promise<T | null> {
  const [body, sig] = (token ?? "").split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), unb64u(sig), enc.encode(body));
    if (!ok) return null;
    const data = JSON.parse(dec.decode(unb64u(body)));
    return data.exp > Date.now() / 1000 ? data : null;
  } catch {
    return null;
  }
}
