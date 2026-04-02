/**
 * Proxies /api/v1/* to FastAPI at BACKEND_API_ORIGIN.
 * Use api/v1/[[...segments]].js so Vercel matches /api/v1/... before the SPA rewrite;
 * a single api/[...path].js can miss /api/v1/* and POST then hits index.html → 405.
 */

function hostnameFrom(value) {
  if (!value || typeof value !== "string") return "";
  const v = value.trim();
  try {
    if (v.includes("://")) return new URL(v).hostname.toLowerCase();
  } catch {
    /* ignore */
  }
  return v.split(":")[0].toLowerCase();
}

export default async function handler(req, res) {
  const backend = process.env.BACKEND_API_ORIGIN?.replace(/\/$/, "");
  if (!backend) {
    res.status(503).json({
      detail:
        "Set BACKEND_API_ORIGIN in Vercel (Environment Variables), e.g. https://your-api.example.com",
    });
    return;
  }

  const backendHost = hostnameFrom(backend);
  const requestHost = hostnameFrom(
    Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host,
  );
  const vercelHost = process.env.VERCEL_URL
    ? hostnameFrom(`https://${process.env.VERCEL_URL}`)
    : "";

  if (
    backendHost &&
    (backendHost === requestHost ||
      (vercelHost && backendHost === vercelHost))
  ) {
    res.status(503).json({
      detail:
        "BACKEND_API_ORIGIN must NOT be this Vercel app URL. Deploy FastAPI on another host (Render, Railway, Fly.io, a VPS, etc.) and set BACKEND_API_ORIGIN to that host only, e.g. https://my-api.onrender.com — no /api/v1. Using the same domain makes the proxy call itself and login will never work.",
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
