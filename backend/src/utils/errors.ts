export const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    if (/Transaction numbers are only allowed on a replica set member or mongos/i.test(error.message)) {
      return (
        'Database is not configured as a replica set. This operation requires multi-document ' +
        'transactions, which need MongoDB Atlas or a local replica set — see backend/.env.example.'
      );
    }
    return error.message;
  }
  return fallback;
};
