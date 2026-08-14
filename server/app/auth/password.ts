import { argon2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const MEMORY_KIB = 65_536;
const PASSES = 3;
const PARALLELISM = 1;
const TAG_LENGTH = 32;

export function hashPassword(password: string): string {
  if (password.length < 12 || password.length > 1024) throw new Error("password must be between 12 and 1024 characters");
  const nonce = randomBytes(16);
  const tag = argon2Sync("argon2id", {
    message: Buffer.from(password, "utf8"), nonce, parallelism: PARALLELISM,
    tagLength: TAG_LENGTH, memory: MEMORY_KIB, passes: PASSES,
  });
  return `$argon2id$v=19$m=${MEMORY_KIB},t=${PASSES},p=${PARALLELISM}$${nonce.toString("base64url")}$${tag.toString("base64url")}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const match = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/.exec(encoded);
  if (!match) return false;
  const memory = Number(match[1]);
  const passes = Number(match[2]);
  const parallelism = Number(match[3]);
  if (memory < 8192 || memory > 1_048_576 || passes < 1 || passes > 10 || parallelism < 1 || parallelism > 16) return false;
  const nonce = Buffer.from(match[4], "base64url");
  const expected = Buffer.from(match[5], "base64url");
  const actual = argon2Sync("argon2id", {
    message: Buffer.from(password, "utf8"), nonce, parallelism,
    tagLength: expected.length, memory, passes,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
