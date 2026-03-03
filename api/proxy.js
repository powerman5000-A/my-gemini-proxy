export default async function handler(req, res) {
  // 1. 允许跨域（这步很重要）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. 核心：修正路径
  // 去掉 Vercel 自带的 /api/proxy 前缀，只保留 Google 需要的路径
  const path = req.url.replace('/api/proxy', '');
  const targetUrl = `https://generativelanguage.googleapis.com${path}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers['authorization'] || '',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : null,
    });

    // 3. 针对 90,000 字符的流式传输简单处理
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy Error', message: error.message });
  }
}
