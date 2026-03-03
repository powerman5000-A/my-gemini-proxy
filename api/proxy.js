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

  // 2. 绝对锁死目标地址（不依赖任何拼接）
  const targetUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    };

    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) { chunks.push(chunk); }
      fetchOptions.body = Buffer.concat(chunks);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    // ⚡ 核心防伪雷达：如果 Google 报错，附加上我们的标记
    if (!response.ok) {
        let parsedError = data;
        try { parsedError = JSON.parse(data); } catch(e){}
        return res.status(response.status).json({
            _proxy_status: "Vercel代码已是最新版_V5",
            _target_url: targetUrl,
            google_error: parsedError
        });
    }

    res.status(200).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy Error', detail: error.message });
  }
}
