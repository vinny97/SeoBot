import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { PublishingIntegrationError } from "@/lib/publishing/errors";

export type EncryptedCredentialEnvelope = {
  algorithm: "aes-256-gcm";
  ciphertext: string;
  iv: string;
  tag: string;
  version: 1;
};

function decodeKey(value: string) {
  let key: Buffer;
  if (/^[a-f\d]{64}$/i.test(value)) key = Buffer.from(value, "hex");
  else if (/^[A-Za-z\d_-]{43}$/.test(value)) key = Buffer.from(value, "base64url");
  else if (/^[A-Za-z\d+/]{43}=$/.test(value)) key = Buffer.from(value, "base64");
  else throw new PublishingIntegrationError("invalid_encryption_key", "WordPress credential encryption is not configured correctly.", 500);
  if (key.byteLength !== 32) throw new PublishingIntegrationError("invalid_encryption_key", "WordPress credential encryption is not configured correctly.", 500);
  return key;
}

export function encryptionKeyId(value: string) {
  return createHash("sha256").update(decodeKey(value)).digest("hex").slice(0, 16);
}

export function encryptCredentialJson(value: unknown, keyValue: string, context: string): EncryptedCredentialEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", decodeKey(keyValue), iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return {
    algorithm: "aes-256-gcm",
    ciphertext: ciphertext.toString("base64url"),
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    version: 1,
  };
}

export function decryptCredentialJson<T>(envelope: EncryptedCredentialEnvelope, keyValue: string, context: string): T {
  try {
    if (envelope.algorithm !== "aes-256-gcm" || envelope.version !== 1) throw new Error("Unsupported credential envelope");
    const decipher = createDecipheriv("aes-256-gcm", decodeKey(keyValue), Buffer.from(envelope.iv, "base64url"));
    decipher.setAAD(Buffer.from(context, "utf8"));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(plaintext) as T;
  } catch {
    throw new PublishingIntegrationError(
      "credential_decryption_failed",
      "Searchhand could not unlock this WordPress connection. Reconnect it before publishing.",
      409,
    );
  }
}
