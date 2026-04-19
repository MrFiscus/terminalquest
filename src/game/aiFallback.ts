export const AI_TIMEOUT_MS = 3500;

/**
 * Keeps gameplay moving when hosted AI is unavailable, slow, quota-limited,
 * or missing an API key. The original promise may still resolve later, but
 * callers continue with their deterministic fallback immediately.
 */
export async function withAiFallback<T>(
  work: () => Promise<T>,
  fallback: () => T,
  label: string,
  timeoutMs = AI_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[ai-fallback] ${label} timed out; using deterministic fallback.`);
      resolve(fallback());
    }, timeoutMs);
  });

  try {
    return await Promise.race([work(), timeout]);
  } catch (error) {
    console.warn(`[ai-fallback] ${label} failed; using deterministic fallback:`, error);
    return fallback();
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
