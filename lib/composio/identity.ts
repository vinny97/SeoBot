import { z } from "zod";

export function getComposioUserId(userId: string): string {
  const parsed = z.string().uuid().safeParse(userId);
  if (!parsed.success) throw new Error("A valid authenticated user ID is required.");
  return `searchhand_${parsed.data}`;
}
