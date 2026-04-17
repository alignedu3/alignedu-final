type FetchJsonOptions = RequestInit & {
  timeoutMs?: number;
};

export async function fetchJsonWithTimeout<T = any>(
  input: RequestInfo | URL,
  { timeoutMs = 12000, ...init }: FetchJsonOptions = {}
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    let data: T | null = null;

    try {
      data = (await response.json()) as T;
    } catch {
      data = null;
    }

    return { response, data };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
