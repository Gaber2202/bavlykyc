/**
 * Proxies /api/* to FastAPI at BACKEND_API_ORIGIN.
 * Lives at repo root api/ when Vercel "Root Directory" is empty (monorepo root).
 */

export default async function handler(req, res) {
  const backend = process.env.BACKEND_API_ORIGIN?.replace(/\/$/, "");
  if (!backend) {
    res.status(503).json({
      detail:
        "Set BACKEND_API_ORIGIN in Vercel (Environment Variables), e.g. https://your-api.example.com",
    });
    return;
  }

  const pathAndQuery = req.url || "";
  const target = `${backend}${pathAndQuery}`;

  const headers = new Headers();
  const copy = [
    "content-type",
    "authorization",
    "accept",
    "origin",
    "user-agent",
    "access-control-request-method",
    "access-control-request-headers",
  ];
  for (const name of copy) {
    const v = req.headers[name];
    if (v) headers.set(name, Array.isArray(v) ? v[0] : v);
  }

  /** @type {RequestInit} */
  const init = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    if (typeof req.body === "string") {
      init.body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      init.body = req.body;
    } else if (req.body != null) {
      init.body = JSON.stringify(req.body);
    }
  }

  let upstream;
  try {
    upstream = await fetch(target, init);
  } catch (e) {
    res.status(502).json({
      detail: "Upstream API unreachable",
      message: e instanceof Error ? e.message : String(e),
    });
    return;
  }

  res.status(upstream.status);
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === "transfer-encoding" || k === "connection") return;
    res.setHeader(key, value);
  });

  const buf = Buffer.from(await upstream.arrayBuffer());
  res.send(buf);
}

export const config = {
  api: {
    bodyParser: true,
  },
};
