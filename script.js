let backend = "";
let token = "";
let socket = null;
let statusInterval = null;

function normalizeBackendUrl(url) {
  return url.trim().replace(/\/+$/, "");
}

function setMainStatus(text) {
  document.getElementById("status").textContent = text;
  document.getElementById("statusText").textContent = text;
}

function setStatusDot(mode) {
  const dot = document.getElementById("statusDot");

  if (mode === "online") {
    dot.style.background = "#22c55e";
    dot.style.boxShadow = "0 0 0 6px rgba(34, 197, 94, 0.15)";
  } else if (mode === "offline") {
    dot.style.background = "#facc15";
    dot.style.boxShadow = "0 0 0 6px rgba(250, 204, 21, 0.15)";
  } else if (mode === "error") {
    dot.style.background = "#fb7185";
    dot.style.boxShadow = "0 0 0 6px rgba(251, 113, 133, 0.15)";
  } else {
    dot.style.background = "#64748b";
    dot.style.boxShadow = "0 0 0 6px rgba(100, 116, 139, 0.15)";
  }
}

function setTerminal(text) {
  const terminal = document.getElementById("terminal");
  terminal.textContent = text;
  terminal.scrollTop = terminal.scrollHeight;
}

async function connect() {
  backend = normalizeBackendUrl(document.getElementById("backendUrl").value);
  token = document.getElementById("token").value.trim();

  if (!backend || !token) {
    alert("Isi Backend URL dan Token dulu.");
    return;
  }

  localStorage.setItem("backend", backend);
  localStorage.setItem("token", token);

  if (socket) {
    socket.disconnect();
  }

  setMainStatus("Connecting...");
  setStatusDot("neutral");
  setTerminal("Mencoba terhubung ke backend...\n");

  socket = io(backend, {
    transports: ["websocket", "polling"]
  });

  socket.on("connect", () => {
    socket.emit("auth", token);
  });

  socket.on("log", (text) => {
    setTerminal(text || "Tidak ada output...");
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  await updateStatus();

  if (statusInterval) {
    clearInterval(statusInterval);
  }

  statusInterval = setInterval(updateStatus, 3000);
}

async function api(path) {
  if (!backend || !token) {
    alert("Connect dulu, Sensei.");
    return;
  }

  try {
    const res = await fetch(backend + path, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    const data = await res.json();
    alert(data.message || JSON.stringify(data));
    await updateStatus();
  } catch (err) {
    alert("Gagal konek ke backend: " + err.message);
    setMainStatus("Backend Error");
    setStatusDot("error");
  }
}

async function updateStatus() {
  if (!backend || !token) return;

  try {
    const res = await fetch(backend + "/api/status", {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

    const data = await res.json();

    if (data.running) {
      setMainStatus("Online");
      setStatusDot("online");
    } else {
      setMainStatus("Offline");
      setStatusDot("offline");
    }

    document.getElementById("ram").textContent = `${data.ram.percent}%`;
    document.getElementById("cpu").textContent = `${data.cpu.load}% / ${data.cpu.cores} core`;

    if (data.storage) {
      document.getElementById("storage").textContent = `${Math.round(data.storage.percent)}%`;
    } else {
      document.getElementById("storage").textContent = "-";
    }
  } catch (err) {
    document.getElementById("ram").textContent = "-";
    document.getElementById("cpu").textContent = "-";
    document.getElementById("storage").textContent = "-";
    setMainStatus("Backend Error");
    setStatusDot("error");
  }
}

window.onload = () => {
  const savedBackend = localStorage.getItem("backend") || "";
  const savedToken = localStorage.getItem("token") || "";

  document.getElementById("backendUrl").value = savedBackend;
  document.getElementById("token").value = savedToken;

  setStatusDot("neutral");
};
