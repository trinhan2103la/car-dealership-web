/** Lỗi gọi BFF, mang ProblemDetails (RFC 9457). Tách riêng để api.ts và auth-client.ts không import lẫn nhau. */
export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  code?: string;
  correlationId?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly problem: ProblemDetails;
  readonly retryAfterSeconds?: number;

  constructor(problem: ProblemDetails, retryAfterSeconds?: number) {
    super(problem.title);
    this.name = 'ApiError';
    this.problem = problem;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  get status(): number {
    return this.problem.status;
  }
}

export const NETWORK_ERROR_TITLE = 'Không kết nối được tới máy chủ, vui lòng thử lại.';

export const networkError = () => new ApiError({ title: NETWORK_ERROR_TITLE, status: 0, code: 'NetworkError' });

export async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

export async function toApiError(response: Response): Promise<ApiError> {
  const body = await readJson(response);
  const problem =
    body && typeof body === 'object' && 'title' in body
      ? (body as ProblemDetails)
      : { title: NETWORK_ERROR_TITLE, status: response.status };
  const retry = Number(response.headers.get('Retry-After'));
  return new ApiError(problem, Number.isFinite(retry) && retry > 0 ? retry : undefined);
}
