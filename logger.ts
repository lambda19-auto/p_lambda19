import pino from 'pino';

const REDACTED = '[REDACTED]';

export const logger = pino({
  level: process.env.LOG_LEVEL?.trim() || 'info',
  base: {
    service: 'p_lambda19',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || 'unknown',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    censor: REDACTED,
    paths: [
      'authorization',
      'cookie',
      'password',
      'token',
      'apiKey',
      'api_key',
      'OPENAI_API_KEY',
      'DATABASE_URL',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'headers.authorization',
      'headers.cookie',
    ],
  },
});

export function errorDetails(error: unknown): { errorName: string; errorMessage: string } {
  if (error instanceof Error) {
    const sanitizedMessage = error.message
      .replace(/postgres(?:ql)?:\/\/[^\s@]+@/gi, 'postgresql://[REDACTED]@')
      .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, REDACTED)
      .replace(/\bBearer\s+[^\s]+/gi, `Bearer ${REDACTED}`)
      .replace(/(password|token|api[_-]?key)\s*[=:]\s*[^\s,;]+/gi, `$1=${REDACTED}`);
    return { errorName: error.name, errorMessage: sanitizedMessage.slice(0, 2_000) };
  }
  return { errorName: 'UnknownError', errorMessage: 'Unknown error' };
}
