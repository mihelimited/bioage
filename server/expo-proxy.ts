import { type Express } from "express";
import { type Server } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn, type ChildProcess } from "child_process";
import path from "path";

let expoProcess: ChildProcess | null = null;

export async function setupExpoProxy(server: Server, app: Express) {
  const EXPO_PORT = 8081;

  expoProcess = spawn(
    "npx",
    ["expo", "start", "--web", "--port", String(EXPO_PORT)],
    {
      cwd: path.resolve(import.meta.dirname, "..", "expo-app"),
      stdio: "pipe",
      env: { ...process.env, BROWSER: "none", CI: "1" },
    }
  );

  expoProcess.stdout?.on("data", (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[expo] ${msg}`);
  });

  expoProcess.stderr?.on("data", (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[expo:err] ${msg}`);
  });

  expoProcess.on("exit", (code) => {
    console.log(`Expo dev server exited with code ${code}`);
  });

  await new Promise<void>((resolve) => {
    const check = () => {
      fetch(`http://localhost:${EXPO_PORT}`)
        .then(() => resolve())
        .catch(() => setTimeout(check, 1000));
    };
    setTimeout(check, 3000);
  });

  const proxy = createProxyMiddleware({
    target: `http://localhost:${EXPO_PORT}`,
    changeOrigin: true,
    ws: true,
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.removeHeader("origin");
      },
    },
  });

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    return proxy(req, res, next);
  });
}
