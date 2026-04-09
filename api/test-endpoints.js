// Test endpoint to verify Vercel is serving serverless functions
export default function handler(req, res) {
  try {
    const { method } = req;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] Test endpoint accessed with method: ${method}`);

    switch (method) {
      case 'GET':
        return res.status(200).json({
          status: 'success',
          message: 'Vercel serverless functions are working',
          timestamp,
          availableEndpoints: [
            '/api/test-endpoints',
            '/api/test-db-connection',
            '/api/products-real',
            '/api/categories-real',
            '/api/auth-real',
            '/api/giveaways-real'
          ],
          environment: {
            DATABASE_URL: !!process.env.DATABASE_URL,
            JWT_SECRET: !!process.env.JWT_SECRET,
            NODE_ENV: process.env.NODE_ENV
          }
        });

      default:
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Serverless function error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
