import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function sealCheckout(value: unknown, key: string, owner: string, id: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "base64"), nonce);
  cipher.setAAD(Buffer.from(`${owner}:${id}`));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [nonce, cipher.getAuthTag(), ciphertext].map(part => part.toString("base64url")).join(".");
}

export function openCheckout(value: string, key: string, owner: string, id: string): { checkoutUrl: string } {
  const [nonce, tag, ciphertext] = value.split(".").map(part => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "base64"), nonce);
  decipher.setAAD(Buffer.from(`${owner}:${id}`));
  decipher.setAuthTag(tag);
  const decoded = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"));
  // Provider reusable authentication tokens are deliberately never returned to a client.
  return { checkoutUrl: decoded.checkoutUrl };
}
