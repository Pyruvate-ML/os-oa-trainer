import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import http from "node:http";

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 8080);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function send(res, status, headers, body = "") {
  res.writeHead(status, {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    ...headers
  });
  res.end(body);
}

function resolvePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const relative = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.join(ROOT, relative);
  const normalized = path.normalize(filePath);

  if (!normalized.startsWith(ROOT)) return null;
  return normalized;
}

const server = http.createServer((req, res) => {
  const filePath = resolvePath(req.url || "/");
  if (!filePath) {
    send(res, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Forbidden");
    return;
  }

  if (!existsSync(filePath)) {
    send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not Found");
    return;
  }

  let stats;
  try {
    stats = statSync(filePath);
  } catch {
    send(res, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Failed to read file");
    return;
  }

  if (stats.isDirectory()) {
    send(res, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Directory listing is disabled");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Content-Length": stats.size,
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0"
  });

  createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Serving with no-cache headers at http://localhost:${PORT}`);
});
