import { trace } from '@opentelemetry/api';
import { logger } from '../utils/logger';

export const getData1 = async () => {
  const tracer = trace.getTracer('data-service');
  const span = tracer.startSpan('getData1');
  
  logger.info('Starting getData1 operation');
  
  try {
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const data = {
      id: 1,
      items: ['item1', 'item2', 'item3']
    };
    
    logger.info('Completed getData1 operation');
    return data;
  } finally {
    span.end();
  }
};

export const getData2 = async () => {
  const tracer = trace.getTracer('data-service');
  const span = tracer.startSpan('getData2');
  
  logger.info('Starting getData2 operation');
  
  try {
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const data = {
      id: 2,
      items: ['item4', 'item5', 'item6']
    };
    
    logger.info('Completed getData2 operation');
    return data;
  } finally {
    span.end();
  }
}; 