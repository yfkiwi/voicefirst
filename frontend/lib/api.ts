const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000/api';

export interface DraftAnalysis {
  section: string;
  summary: string;
  recommendations: string[];
  score?: number;
}

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || DEFAULT_API_BASE_URL;

function buildUrl(path: string) {
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function analyzeDraft(file: File): Promise<DraftAnalysis[]> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(buildUrl('/proposals/analyze'), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  const payload = await response.json();

  if (!Array.isArray(payload)) {
    throw new Error('Unexpected analysis response from server.');
  }

  return payload as DraftAnalysis[];
}

async function extractErrorMessage(response: Response) {
  try {
    const data = await response.json();
    if (data?.detail) {
      if (typeof data.detail === 'string') return data.detail;
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        return data.detail[0].msg || 'Unable to analyze draft.';
      }
    }
  } catch (error) {
    // ignore JSON parsing errors
  }

  return `Unable to analyze draft. (${response.status})`;
}
