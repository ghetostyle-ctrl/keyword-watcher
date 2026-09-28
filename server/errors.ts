export class DomainError extends Error {
  override readonly name = "DomainError";
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 409 | 422 | 503 = 400,
  ) {
    super(message);
  }
}
