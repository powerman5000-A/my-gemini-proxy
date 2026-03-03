export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. 强制清理路径
  // 无论游戏发来什么，我们只要最后那段 chat/completions 或 models
  const urlParts = req.url.split('/');
  const lastPart = urlParts[urlParts.length - 1];
  const secondLastPart = urlParts[urlParts.length - 2];
  
  let targetPath = '/v1beta/openai/chat/completions';
  if (lastPart === 'models' || secondLastPart === 'models') {
    targetPath = '/v1beta/openai/models';
  }

  const targetUrl = `https://generativelanguage.googleapis.com${targetPath}`;
  console.log(`[Proxy] 目标地址: ${targetUrl}`);

  try {
    const authHeader = req.headers['authorization'] || '';
    const apiKey = authHeader.replace('Bearer ', '').trim();

    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey, // 强制使用 Google 官方头
      },
    };

    if (req.method === 'POST') {
      const buffers = [];
      for await (const chunk of req) { buffers.push(chunk); }
      fetchOptions.body = Buffer.concat(buffers);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();
    
    // 如果 Google 返回错误，我们直接透传
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy Error', message: error.message });
  }
}
