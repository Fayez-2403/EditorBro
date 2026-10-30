// Real end-to-end encryption with the browser's WebCrypto API.
// ECDH P-256 key agreement -> AES-GCM-256 key (deriveKey) -> AES-GCM with a 96-bit IV.
// Safety number = SHA-256 over both raw public keys (sorted), shown as 12 groups of 5 digits.
const subtle = globalThis.crypto.subtle;
const EC = { name: 'ECDH', namedCurve: 'P-256' } as const;

export interface Party {
  name: string;
  priv: CryptoKey;
  pub: CryptoKey;
  raw: Uint8Array; // 65-byte uncompressed public key
}

/** Fresh key pair. The private key is non-extractable: it can be used here but never exported from this tab. */
export async function newParty(name: string): Promise<Party> {
  const kp = await subtle.generateKey(EC, false, ['deriveKey']);
  return { name, priv: kp.privateKey, pub: kp.publicKey, raw: new Uint8Array(await subtle.exportKey('raw', kp.publicKey)) };
}

/** Fixed demo key pair from a JWK (reel mode only, so the film is repeatable). */
export async function importParty(name: string, jwk: { x: string; y: string; d: string }): Promise<Party> {
  const base = { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y };
  const priv = await subtle.importKey('jwk', { ...base, d: jwk.d }, EC, false, ['deriveKey']);
  const pub = await subtle.importKey('jwk', base, EC, true, []);
  return { name, priv, pub, raw: new Uint8Array(await subtle.exportKey('raw', pub)) };
}

/** Each side runs this on its own: my private key + the other side's public key -> the same AES-GCM-256 key. */
export function deriveShared(me: Party, other: Party) {
  return subtle.deriveKey({ name: 'ECDH', public: other.pub }, me.priv, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export const freshIv = () => globalThis.crypto.getRandomValues(new Uint8Array(12));

export async function encrypt(key: CryptoKey, iv: Uint8Array, text: string) {
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource, tagLength: 128 }, key, new TextEncoder().encode(text));
  return new Uint8Array(ct);
}

/** Throws if a single bit of the ciphertext, tag or IV changed: AES-GCM authenticates the message. */
export async function decrypt(key: CryptoKey, iv: Uint8Array, ct: Uint8Array) {
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource, tagLength: 128 }, key, ct as BufferSource);
  return new TextDecoder().decode(pt);
}

const cmp = (a: Uint8Array, b: Uint8Array) => {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
};

/** Order-independent, so Asha and Ben compute the same number on their own devices. */
export async function safetyNumber(mine: Uint8Array, theirs: Uint8Array): Promise<string[]> {
  const [a, b] = cmp(mine, theirs) <= 0 ? [mine, theirs] : [theirs, mine];
  const joined = new Uint8Array(a.length + b.length);
  joined.set(a);
  joined.set(b, a.length);
  const h1 = new Uint8Array(await subtle.digest('SHA-256', joined));
  const h2 = new Uint8Array(await subtle.digest('SHA-256', h1));
  const bytes = new Uint8Array([...h1, ...h2]);
  const groups: string[] = [];
  for (let g = 0; g < 12; g++) {
    let n = 0;
    for (let i = 0; i < 5; i++) n = n * 256 + bytes[g * 5 + i];
    groups.push(String(n % 100000).padStart(5, '0'));
  }
  return groups;
}

export async function fingerprint(raw: Uint8Array) {
  const h = new Uint8Array(await subtle.digest('SHA-256', raw as BufferSource));
  return Array.from(h.slice(0, 8), (x) => x.toString(16).padStart(2, '0')).join('').toUpperCase().match(/.{4}/g)!.join(' ');
}

export const hex = (u: Uint8Array) => Array.from(u, (x) => x.toString(16).padStart(2, '0')).join('');
export const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
