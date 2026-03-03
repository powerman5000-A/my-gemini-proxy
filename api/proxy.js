export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. 强制路由到 OpenAI 兼容接口
  const url = new URL(req.url, `https://${req.headers.host}`);
  let targetPath = '/v1beta/openai/chat/completions';
  if (url.pathname.includes('models')) targetPath = '/v1beta/openai/models';

  // 2. 提取玩家填写的 Key
  const authHeader = req.headers['authorization'] || '';
  const urlKey = url.searchParams.get('key');
  const apiKey = (authHeader.replace('Bearer ', '').trim() || urlKey || '').trim();

  if (!apiKey) {
    return res.status(401).json({ error: "Missing API Key", message: "Key 丢失" });
  }

  const targetUrl = `https://generativelanguage.googleapis.com${targetPath}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // ✨ 核心修复：OpenAI 兼容接口必须强制拼装 Bearer 头！
        'Authorization': `Bearer ${apiKey}`,
      }
    };

    // 3. 处理 90,000 字符的大体积请求
    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) { chunks.push(chunk); }
      fetchOptions.body = Buffer.concat(chunks);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy Error', detail: error.message });
  }
}
