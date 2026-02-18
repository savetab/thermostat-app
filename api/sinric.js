// Proxy SinricPro pour Vercel - utilise fetch au lieu d'axios
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-sinric-api-key, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'path manquant' });

  const sinricUrl = `https://api.sinric.pro/api/v1/${path}`;
  const headers = { 'Content-Type': 'application/json' };
  
  if (req.headers['x-sinric-api-key']) headers['x-sinric-api-key'] = req.headers['x-sinric-api-key'];
  if (req.headers['authorization']) headers['authorization'] = req.headers['authorization'];

  const forcePost = path === 'auth' || path.includes('/action');
  const method = forcePost ? 'POST' : req.method;

  try {
    const response = await fetch(sinricUrl, {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
    });
    
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ 
      error: err.message,
      url: sinricUrl,
      method
    });
  }
};
