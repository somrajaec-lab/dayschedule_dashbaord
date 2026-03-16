// Vercel Serverless Function — DaySchedule API Proxy
// Receives requests from the dashboard and forwards them to
// DaySchedule with the Bearer token, returning CORS headers
// so the browser never complains.

export default async function handler(req, res) {
  // Allow browser requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-DS-Token');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Bearer token passed from the browser via X-DS-Token header
  const token = req.headers['x-ds-token'];
  if (!token) {
    return res.status(401).json({ error: 'Missing X-DS-Token header' });
  }

  // Which DaySchedule endpoint to hit — passed as ?path=/bookings etc.
  const dsPath = req.query.path || '/';

  // Forward all other query params (status, from, to, limit, offset…)
  const params = new URLSearchParams();
  Object.entries(req.query).forEach(([k, v]) => {
    if (k !== 'path') params.set(k, v);
  });
  const qs = params.toString();

  const targetUrl = `https://api.dayschedule.com/v1${dsPath}${qs ? '?' + qs : ''}`;

  try {
    const upstream = await fetch(targetUrl, {
      method:  req.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
