export default async function handler(req, res) {
  // 1. 处理跨域和预检请求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 2. 更加稳健的路径提取
  // 无论游戏请求 /api/proxy/v1beta/... 还是 /api/proxy/v1/... 都能精准匹配
  const path = req.url.split('/api/proxy')[1] || '';
  const targetUrl = `https://generativelanguage.googleapis.com${path}`;

  try {
    // 3. 直接透传 Body 和 Header
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // 兼容不同的 Key 传递方式
        'Authorization': req.headers['authorization'] || '',
        'x-goog-api-key': (req.headers['authorization'] || '').replace('Bearer ', ''),
      },
    };

    // 只有 POST 请求才读取并转发 Body
    if (req.method === 'POST') {
      // 这里的关键：不解析 JSON，直接读取原始 Buffer
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      fetchOptions.body = Buffer.concat(buffers);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const responseData = await response.text(); // 先以文本形式接收

    res.status(response.status).send(responseData);
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Proxy Error', detail: error.message });
  }
}
