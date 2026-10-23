// Bildet die Supabase-API unter einer Adresse ab: /auth/v1 → GoTrue, /rest/v1 → PostgREST.
import http from "node:http";
const port = Number(process.env.PROXY_PORT ?? 54321);
const routes = [["/auth/v1", 9999], ["/rest/v1", 3001], ["", 9999]];
const cors = (req) => ({
  "access-control-allow-origin": req.headers.origin ?? "*",
  "access-control-allow-headers": req.headers["access-control-request-headers"] ?? "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-credentials": "true",
});
http
  .createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors(req));
      return res.end();
    }
    const [prefix, target] = routes.find(([p]) => req.url.startsWith(p));
    const up = http.request(
      { host: "127.0.0.1", port: target, path: req.url.slice(prefix.length) || "/", method: req.method, headers: req.headers },
      (u) => {
        res.writeHead(u.statusCode, { ...u.headers, ...cors(req) });
        u.pipe(res);
      },
    );
    up.on("error", (e) => {
      res.writeHead(502);
      res.end(String(e));
    });
    req.pipe(up);
  })
  .listen(port, "127.0.0.1");
