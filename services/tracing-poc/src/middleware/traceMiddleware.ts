import { Request, Response, NextFunction } from 'express';
import { context, trace, SpanStatusCode } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export const traceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  logger.debug('Processing request', {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type')
  });
  
  // Check if traceparent header exists
  if (!req.headers.traceparent) {
    // Generate a new trace ID and span ID
    const traceId = uuidv4().replace(/-/g, '');
    const spanId = uuidv4().substring(0, 16);
    
    // Create a new traceparent header
    const traceparent = `00-${traceId}-${spanId}-01`;
    req.headers.traceparent = traceparent;
    
    logger.info('Created new trace', {
      traceId,
      spanId,
      method: req.method,
      path: req.path
    });
  } else {
    logger.debug('Using existing trace', {
      traceparent: req.headers.traceparent,
      method: req.method,
      path: req.path
    });
  }

  // Create a new span for this request
  const tracer = trace.getTracer('tracing-poc');
  const span = tracer.startSpan(`${req.method} ${req.path}`, {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.route': req.path,
    },
  });

  // Create a new context with the span
  const ctx = trace.setSpan(context.active(), span);
  
  // Run the next middleware in the new context
  context.with(ctx, () => {
    // Add the span to the response locals for use in route handlers
    res.locals.span = span;

    // End the span when the response is finished
    res.on('finish', () => {
      span.setAttribute('http.status_code', res.statusCode);
      if (res.statusCode >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      
      logger.info('Request completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: Date.now() - (req as any).startTime,
        responseSize: res.get('Content-Length') || 'unknown'
      });
      
      span.end();
    });

    // Store start time for duration calculation
    (req as any).startTime = Date.now();
    
    next();
  });
}; 