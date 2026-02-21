const { spawn } = require("child_process");
const path = require("path");

const apiProcess = spawn("npx", ["tsx", "server/index.ts"], {
  cwd: __dirname,
  stdio: "inherit",
  env: { ...process.env, PORT: "5001", NODE_ENV: "development" },
});

const expoProcess = spawn("npx", ["expo", "start", "--web", "--port", "5000", "--non-interactive"], {
  cwd: path.join(__dirname, "expo-app"),
  stdio: "inherit",
  env: { ...process.env },
});

function cleanup() {
  apiProcess.kill();
  expoProcess.kill();
  process.exit();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

apiProcess.on("exit", (code) => {
  console.log(`API server exited with code ${code}`);
  cleanup();
});

expoProcess.on("exit", (code) => {
  console.log(`Expo dev server exited with code ${code}`);
  cleanup();
});
