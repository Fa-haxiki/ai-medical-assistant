import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<Request & { method?: string; url?: string }>();

    const method = request.method || 'UNKNOWN';
    const path = (request as any).originalUrl || request.url || '';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res && 'message' in res) {
        message = (res as any).message ?? message;
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
    }

    const errorBody = {
      statusCode: status,
      error: status >= 500 ? 'Internal Server Error' : 'Bad Request',
      message,
      path,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(
      `${method} ${path} ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    (response as any).status?.(status).json?.(errorBody);
  }
}

