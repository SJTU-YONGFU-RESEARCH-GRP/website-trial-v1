export class ApiError extends Error {
  constructor(readonly statusCode: number, readonly code: string, message: string, readonly details: Record<string, unknown> | null = null) { super(message); }
}
