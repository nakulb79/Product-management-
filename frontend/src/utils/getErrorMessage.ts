type ApiError = {
  response?: { data?: { error?: string } };
  message?: string;
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  const apiError = error as ApiError;
  return apiError?.response?.data?.error || apiError?.message || fallback;
};
