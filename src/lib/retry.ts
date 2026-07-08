/**
 * Retry a promise-returning function a few times with linear backoff.
 * Used to absorb transient failures — most importantly Neon's serverless
 * compute cold-start, where the first query after the database auto-suspends
 * can fail before the compute wakes.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, delayMs = 150 }: { retries?: number; delayMs?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}
