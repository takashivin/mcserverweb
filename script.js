let backend = "https://conflicts-blacks-fruits-while.trycloudflare.com/";
let token = "0bacbe11-19fb-4571-81e6-93e830a89691";
let socket = null;
let statusInterval = null;

function connect() {
  backend = document.getElementById("backendUrl").value.trim();
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

  socket = io(backend);

  socket.on("connect", () => {
    socket.emit("auth", token);
  });

  socket.on("log", (text) => {
    const terminal = document.getElementById("terminal");
    terminal.textContent = text;
    terminal.scrollTop = terminal.scrollHeight;
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  updateStatus();

  if (statusInterval) {
    clearInterval(statusInterval);
  }

  statusInterval = setInterval(updateStatus, 3000);
}

async function api(path) {
  if (!backend || !token) {
    alert("Connect dulu.");
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
    updateStatus();
  } catch (err) {
    alert("Gagal konek ke backend: " + err.message);
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

    const data = await res.json();

    document.getElementById("status").textContent = data.running ? "Online" : "Offline";
    document.getElementById("ram").textContent = `${data.ram.percent}%`;
    document.getElementById("cpu").textContent = `${data.cpu.load}% / ${data.cpu.cores} core`;

    if (data.storage) {
      document.getElementById("storage").textContent = `${data.storage.percent}%`;
    } else {
      document.getElementById("storage").textContent = "-";
    }
  } catch (err) {
    document.getElementById("status").textContent = "Backend Error";
  }
}

window.onload = () => {
  document.getElementById("backendUrl").value = localStorage.getItem("backend") || "";
  document.getElementById("token").value = localStorage.getItem("token") || "";
};
