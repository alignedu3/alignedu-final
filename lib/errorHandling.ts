type ErrorLike = {
  message?: unknown;
  details?: unknown;
};

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === 'object' && value !== null;
}

export function getErrorMessage(error: unknown, fallback = 'Server error') {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (isErrorLike(error) && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function getErrorDetails(error: unknown) {
  if (isErrorLike(error) && typeof error.details === 'string') {
    return error.details;
  }

  return '';
}
