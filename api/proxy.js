export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. 提取 Key
  const authHeader = req.headers['authorization'] || '';
  const urlKey = new URL(req.url, `https://${req.headers.host}`).searchParams.get('key');
  const apiKey = (authHeader.replace('Bearer ', '').trim() || urlKey || '').trim();

  if (!apiKey) {
    return res.status(401).json({ error: "Missing API Key" });
  }

  // 2. 绝对锁死目标地址
  const targetUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    };

    // ✨ 核心修复：直接使用 Vercel 解析好的 req.body，不搞花里胡哨的数据流了
    if (req.method === 'POST') {
      fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy Error', detail: error.message });
  }
}
