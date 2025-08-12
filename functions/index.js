const { onRequest } = require("firebase-functions/v2/https");
const next = require("next");

const isDev = process.env.NODE_ENV !== "production";

const server = next({
  dev: isDev,
  // The Next.js server configuration
  conf: { distDir: ".next" },
});

const nextjsHandle = server.getRequestHandler();

exports.nextjsFunc = onRequest(
  {
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 60,
  },
  async (req, res) => {
    await server.prepare();
    return nextjsHandle(req, res);
  }
);
