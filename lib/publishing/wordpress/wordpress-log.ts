import "server-only";

export function logWordPressOperation(input: {
  operation: string;
  connectionId: string;
  projectId: string;
  durationMs?: number;
  httpStatus?: number;
  remotePostId?: string;
  errorCode?: string;
}) {
  console.info("wordpress_publishing", { provider: "wordpress", ...input });
}
