import { createHash } from "node:crypto";
import type { FastifyReply } from "fastify";
import { API_SCHEMA_VERSION, type ApiSuccessV1 } from "../../../shared/contracts/v1.ts";

export function success<T>(data: T, meta?: ApiSuccessV1<T>["meta"]): ApiSuccessV1<T> { return { schemaVersion: API_SCHEMA_VERSION, data, ...(meta ? { meta } : {}) }; }
export function sendList<T>(reply: FastifyReply, data: T[], nextCursor: string | null = null): ApiSuccessV1<T[]> {
  const updatedAt = new Date().toISOString(); const etag = `"${createHash("sha256").update(JSON.stringify(data)).digest("base64url")}"`;
  reply.header("ETag", etag); return success(data, { nextCursor, updatedAt, etag });
}
