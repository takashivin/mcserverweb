require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { exec } = require("child_process");
const si = require("systeminformation");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.TOKEN;
const MC_DIR = process.env.MC_DIR || "/home/takashi/server2";
const SESSION = process.env.TMUX_SESSION || "bedrock";

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { shell: "/bin/bash" }, (err, stdout, stderr) => {
      resolve({
        ok: !err,
        stdout,
        stderr,
      });
    });
  });
}

function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!TOKEN || token !== TOKEN) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized",
    });
  }

  next();
}

async function tmuxExists() {
  const r = await run(`tmux has-session -t "${SESSION}" 2>/dev/null`);
  return r.ok;
}

async function ensureTmuxSession() {
  if (await tmuxExists()) return true;

  // Buat tmux sebagai shell kosong, bukan langsung ./bedrock_server.
  // Jadi kalau server stop, tmux tetap hidup.
  const r = await run(`tmux new-session -d -s "${SESSION}" -c "${MC_DIR}"`);
  return r.ok;
}

async function sendToTmux(command) {
  await ensureTmuxSession();
  return run(`tmux send-keys -t "${SESSION}" '${command}' C-m`);
}

async function isBedrockRunning() {
  const r = await run(`pgrep -f "${MC_DIR}/bedrock_server|./bedrock_server"`);
  return r.ok && r.stdout.trim().length > 0;
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Minecraft Bedrock Web Control Backend aktif",
  });
});

app.post("/api/start", auth, async (req, res) => {
  await ensureTmuxSession();

  if (await isBedrockRunning()) {
    return res.json({
      ok: true,
      message: "Server sudah berjalan",
    });
  }

  const r = await sendToTmux(`cd "${MC_DIR}" && ./bedrock_server`);

  res.json({
    ok: r.ok,
    message: r.ok ? "Server berhasil dinyalakan" : "Gagal menyalakan server",
    error: r.stderr,
  });
});

app.post("/api/stop", auth, async (req, res) => {
  if (!(await tmuxExists())) {
    return res.json({
      ok: true,
      message: "Tmux server tidak berjalan",
    });
  }

  if (await isBedrockRunning()) {
    await run(`tmux send-keys -t "${SESSION}" 'stop' C-m`);
    await new Promise((resolve) => setTimeout(resolve, 8000));
  }

  // STOP = matikan server DAN end task tmux/session.
  await run(`tmux kill-session -t "${SESSION}" 2>/dev/null`);

  res.json({
    ok: true,
    message: "Server distop dan tmux session dimatikan",
  });
});

app.post("/api/restart", auth, async (req, res) => {
  await ensureTmuxSession();

  if (await isBedrockRunning()) {
    await run(`tmux send-keys -t "${SESSION}" 'stop' C-m`);
    await new Promise((resolve) => setTimeout(resolve, 8000));
  }

  // RESTART = jangan kill tmux. Jalankan ulang di tmux yang sama.
  const r = await sendToTmux(`cd "${MC_DIR}" && ./bedrock_server`);

  res.json({
    ok: r.ok,
    message: r.ok ? "Server berhasil direstart tanpa mematikan tmux" : "Gagal restart server",
    error: r.stderr,
  });
});

app.post("/api/list", auth, async (req, res) => {
  if (!(await tmuxExists())) {
    return res.json({
      ok: false,
      message: "Tmux/session belum berjalan",
    });
  }

  if (!(await isBedrockRunning())) {
    return res.json({
      ok: false,
      message: "Server belum berjalan",
    });
  }

  await run(`tmux send-keys -t "${SESSION}" 'list' C-m`);

  res.json({
    ok: true,
    message: "Perintah list dikirim",
  });
});

app.get("/api/status", auth, async (req, res) => {
  const tmux = await tmuxExists();
  const running = await isBedrockRunning();

  const mem = await si.mem();
  const load = await si.currentLoad();
  const fs = await si.fsSize();

  const mainDisk = fs.find((d) => d.mount === "/") || fs[0];

  res.json({
    tmux,
    running,
    ram: {
      total: mem.total,
      used: mem.used,
      free: mem.free,
      percent: Number(((mem.used / mem.total) * 100).toFixed(1)),
    },
    cpu: {
      load: Number(load.currentLoad.toFixed(1)),
      cores: load.cpus.length,
    },
    storage: mainDisk
      ? {
          mount: mainDisk.mount,
          size: mainDisk.size,
          used: mainDisk.used,
          available: mainDisk.available,
          percent: mainDisk.use,
        }
      : null,
  });
});

io.on("connection", (socket) => {
  socket.on("auth", async (token) => {
    if (!TOKEN || token !== TOKEN) {
      socket.emit("log", "Unauthorized\n");
      socket.disconnect();
      return;
    }

    socket.emit("log", "Backend tersambung...\n");

    const interval = setInterval(async () => {
      if (!(await tmuxExists())) {
        socket.emit("log", "Tmux/session belum berjalan...\n");
        return;
      }

      const r = await run(`tmux capture-pane -pt "${SESSION}" -S -200`);
      socket.emit("log", r.stdout || "");
    }, 1500);

    socket.on("disconnect", () => {
      clearInterval(interval);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Backend aktif di port ${PORT}`);
});
