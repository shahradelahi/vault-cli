import logger from '@/logger';

export function handleError(error: unknown): never {
  if (typeof error === 'string') {
    logger.error(error);
  } else if (error instanceof Error) {
    logger.error(error.message);
  } else {
    logger.error('Something went wrong. Please try again.');
  }

  if (process.env['NODE_ENV'] !== 'test') {
    process.exit(1);
  }

  throw error;
}
