export class PublishingIntegrationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "PublishingIntegrationError";
  }
}

export function safePublishingError(error: unknown) {
  if (error instanceof PublishingIntegrationError) return error;
  return new PublishingIntegrationError(
    "integration_unavailable",
    "The publishing connection could not be updated. Please try again.",
    502,
  );
}
