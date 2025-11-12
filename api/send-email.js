export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, subject, message } = req.body;

    // Simple test response
    return res.status(200).json({ 
      message: '✅ Backend is working with CORS!',
      test: 'CORS fix successful',
      received: { name, email, subject, message }
    });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}