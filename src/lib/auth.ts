import { auth } from "@clerk/nextjs/server";

/**
 * Resolve the current Clerk user id, or throw if unauthenticated.
 * Every data operation is scoped to this id so notes are isolated per user.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not authenticated.");
  }
  return userId;
}
