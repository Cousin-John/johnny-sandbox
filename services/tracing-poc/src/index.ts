import express from 'express';
import sdk from './tracing';
import { traceMiddleware } from './middleware/traceMiddleware';
import { getData1, getData2 } from './services/dataService';
import { logger } from './utils/logger';

// Start the OpenTelemetry SDK
try {
  sdk.start();
  logger.info('Tracing initialized successfully');
} catch (error) {
  logger.error('Error initializing tracing', { error });
}

const app = express();
const port = process.env.PORT || 3000;

// Use our tracing middleware
app.use(traceMiddleware);

// Endpoints
app.get('/data1', async (req, res) => {
  try {
    logger.info('Processing request for /data1', { 
      method: req.method, 
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    
    const data = await getData1();
    
    logger.info('Successfully processed /data1 request', { 
      dataId: data.id,
      itemCount: data.items.length
    });
    
    res.json(data);
  } catch (error) {
    logger.error('Error in /data1 endpoint', { 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/data2', async (req, res) => {
  try {
    logger.info('Processing request for /data2', { 
      method: req.method, 
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    
    const data = await getData2();
    
    logger.info('Successfully processed /data2 request', { 
      dataId: data.id,
      itemCount: data.items.length
    });
    
    res.json(data);
  } catch (error) {
    logger.error('Error in /data2 endpoint', { 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  logger.debug('Health check requested');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  logger.info(`Server started successfully`, { port, environment: process.env.NODE_ENV });
}); 