export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. 获取原始路径并清理
  let rawPath = req.url.split('/api/proxy')[1] || '';
  
  // 核心修复：如果路径里包含 /v1/chat/completions，强制修正为 Google 的格式
  // 因为 Google 的格式是 /v1beta/openai/chat/completions (没有那个中间的 v1)
  let fixedPath = rawPath.replace('/v1/chat/completions', '/chat/completions');
  
  // 如果请求不含 v1beta，自动补全（防止某些 MOD 只发 /v1/chat/completions）
  if (!fixedPath.includes('v1beta')) {
      fixedPath = '/v1beta/openai' + fixedPath;
  }

  const targetUrl = `https://generativelanguage.googleapis.com${fixedPath}`;

  // 打印日志到 Vercel 控制台，方便你排查
  console.log(`正在转发到: ${targetUrl}`);

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers['authorization'] || '',
        'x-goog-api-key': (req.headers['authorization'] || '').replace('Bearer ', ''),
      },
    };

    if (req.method === 'POST') {
      const buffers = [];
      for await (const chunk of req) { buffers.push(chunk); }
      fetchOptions.body = Buffer.concat(buffers);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();
    
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy Error', message: error.message });
  }
}
