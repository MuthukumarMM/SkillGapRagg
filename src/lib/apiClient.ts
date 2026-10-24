/**
 * Shared client helper for calling SkillGapRAG backend JSON endpoints.
 * Safely handles non-JSON upstream gateway responses (e.g., HTML 403/413/502 pages)
 * so raw SyntaxError ("Unexpected token '<'...") never leaks into the UI.
 */
export async function postApiJson<T>(endpoint: string, payload: unknown): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();
  const trimmed = rawBody.trim();

  if (trimmed.startsWith('<')) {
    if (response.status === 413) {
      throw new Error(
        'Uploaded PDF payload is too large for the gateway. Please upload a PDF smaller than 5 MB.'
      );
    }
    throw new Error(
      `The server returned an unexpected gateway response (HTTP ${response.status}). Please retry in a moment.`
    );
  }

  let parsed: any = {};
  if (trimmed.length > 0) {
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error(
        `Received malformed response from ${endpoint} (HTTP ${response.status}).`
      );
    }
  }

  if (!response.ok) {
    throw new Error(
      parsed?.error || `Request to ${endpoint} failed with HTTP ${response.status}.`
    );
  }

  return parsed as T;
}
