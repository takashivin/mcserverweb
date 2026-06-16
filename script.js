let backend = "";
let token = "";
let socket = null;
let statusInterval = null;
let autoScroll = true;

const terminalEl = () => document.getElementById("terminal");
const terminalViewportEl = () => document.getElementById("terminalViewport");
const autoScrollBtnEl = () => document.getElementById("autoScrollBtn");

function normalizeBackendUrl(url) {
    return url.trim().replace(/\/+$/, "");
}

function setMainStatus(text, subtext = "") {
    document.getElementById("status").textContent = text;
    document.getElementById("statusText").textContent = text;

    if (subtext) {
        document.getElementById("statusSubtext").textContent = subtext;
    }
}

function setStatusDot(mode) {
    const dot = document.getElementById("statusDot");

    if (mode === "online") {
        dot.style.background = "#56f39a";
        dot.style.boxShadow = "0 0 0 6px rgba(86, 243, 154, 0.18)";
    } else if (mode === "offline") {
        dot.style.background = "#ffd166";
        dot.style.boxShadow = "0 0 0 6px rgba(255, 209, 102, 0.18)";
    } else if (mode === "error") {
        dot.style.background = "#ff7a90";
        dot.style.boxShadow = "0 0 0 6px rgba(255, 122, 144, 0.18)";
    } else if (mode === "connecting") {
        dot.style.background = "#56ccf2";
        dot.style.boxShadow = "0 0 0 6px rgba(86, 204, 242, 0.18)";
    } else {
        dot.style.background = "#64748b";
        dot.style.boxShadow = "0 0 0 6px rgba(100, 116, 139, 0.18)";
    }
}

function cleanTerminalOutput(text) {
    if (!text) return "Tidak ada output...";

    let output = String(text)
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.replace(/[ \t]+$/g, ""))
        .join("\n");

    const lines = output.split("\n");

    while (lines.length && lines[0].trim() === "") {
        lines.shift();
    }

    while (lines.length && lines[lines.length - 1].trim() === "") {
        lines.pop();
    }

    output = lines.join("\n");

    return output || "Tidak ada output...";
}

function setTerminal(text) {
    const terminal = terminalEl();
    const viewport = terminalViewportEl();

    const shouldStickBottom =
        autoScroll ||
        (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 25);

    terminal.textContent = cleanTerminalOutput(text);

    if (shouldStickBottom) {
        requestAnimationFrame(() => {
            viewport.scrollTop = viewport.scrollHeight;
        });
    }
}

function showToast(title, message, type = "info") {
    const wrap = document.getElementById("toastWrap");
    const toast = document.createElement("div");

    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(message)}</p>
    `;

    wrap.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        toast.style.transition = "0.2s ease";
        setTimeout(() => toast.remove(), 220);
    }, 3200);
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function openConfirm({ title, message, confirmText = "Lanjut", cancelText = "Batal" }) {
    return new Promise((resolve) => {
        const overlay = document.getElementById("modalOverlay");
        const titleEl = document.getElementById("modalTitle");
        const messageEl = document.getElementById("modalMessage");
        const cancelBtn = document.getElementById("modalCancelBtn");
        const confirmBtn = document.getElementById("modalConfirmBtn");

        titleEl.textContent = title;
        messageEl.textContent = message;
        cancelBtn.textContent = cancelText;
        confirmBtn.textContent = confirmText;

        overlay.classList.remove("hidden");

        function cleanup(result) {
            overlay.classList.add("hidden");
            cancelBtn.removeEventListener("click", onCancel);
            confirmBtn.removeEventListener("click", onConfirm);
            overlay.removeEventListener("click", onOverlayClick);
            resolve(result);
        }

        function onCancel() {
            cleanup(false);
        }

        function onConfirm() {
            cleanup(true);
        }

        function onOverlayClick(e) {
            if (e.target === overlay) {
                cleanup(false);
            }
        }

        cancelBtn.addEventListener("click", onCancel);
        confirmBtn.addEventListener("click", onConfirm);
        overlay.addEventListener("click", onOverlayClick);
    });
}

async function connectBackend() {
    backend = normalizeBackendUrl(document.getElementById("backendUrl").value);
    token = document.getElementById("token").value.trim();

    if (!backend || !token) {
        showToast("Input belum lengkap", "Isi Backend URL dan Token dulu.", "error");
        return;
    }

    localStorage.setItem("backend", backend);
    localStorage.setItem("token", token);

    if (socket) {
        socket.disconnect();
    }

    setMainStatus("Connecting...", "Sedang mencoba terhubung ke backend...");
    setStatusDot("connecting");
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

    showToast("Backend connected", "Panel berhasil mencoba terhubung ke backend.", "success");
}

async function api(path, actionName = "Perintah") {
    if (!backend || !token) {
        showToast("Belum connect", "Hubungkan ke backend dulu ya.", "error");
        return null;
    }

    try {
        const res = await fetch(backend + path, {
            method: "POST",
            headers: {
                Authorization: "Bearer " + token,
            },
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || data.message || `HTTP ${res.status}`);
        }

        showToast(actionName, data.message || "Berhasil.", "success");
        await updateStatus();
        return data;
    } catch (err) {
        showToast("Terjadi error", err.message || "Gagal konek ke backend.", "error");
        setMainStatus("Backend Error", "Backend tidak merespons dengan benar.");
        setStatusDot("error");
        return null;
    }
}

function startServer() {
    api("/api/start", "Start Server");
}

async function stopServerFlow() {
    const step1 = await openConfirm({
        title: "Stop server?",
        message: "Kalau server dimatikan, semua player bakal keluar.",
        confirmText: "Lanjut",
        cancelText: "Batal"
    });

    if (!step1) return;

    const step2 = await openConfirm({
        title: "Yakin banget?",
        message: "Ini bakal ngirim perintah stop ke Bedrock server sekarang juga.",
        confirmText: "Ya, Stop Server",
        cancelText: "Jangan"
    });

    if (!step2) return;

    api("/api/stop", "Stop Server");
}

async function restartServerFlow() {
    const ok = await openConfirm({
        title: "Restart server?",
        message: "Server akan stop sebentar lalu menyala lagi. Player yang online bisa terputus.",
        confirmText: "Ya, Restart",
        cancelText: "Batal"
    });

    if (!ok) return;
    api("/api/restart", "Restart Server");
}

function listPlayers() {
    api("/api/list", "List Player");
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
            setMainStatus("Online", "Server sedang berjalan.");
            setStatusDot("online");
        } else {
            setMainStatus("Offline", "Backend aktif, tapi server belum berjalan.");
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
        setMainStatus("Backend Error", "Tidak bisa ambil status dari backend.");
        setStatusDot("error");
    }
}

function toggleAutoScroll() {
    autoScroll = !autoScroll;
    autoScrollBtnEl().classList.toggle("active", autoScroll);

    if (autoScroll) {
        terminalViewportEl().scrollTop = terminalViewportEl().scrollHeight;
        showToast("Auto Scroll", "Auto scroll diaktifkan.", "info");
    } else {
        showToast("Auto Scroll", "Auto scroll dimatikan.", "info");
    }
}

async function copyTerminal() {
    try {
        await navigator.clipboard.writeText(terminalEl().textContent || "");
        showToast("Terminal copied", "Isi terminal berhasil disalin.", "success");
    } catch {
        showToast("Gagal copy", "Browser menolak akses clipboard.", "error");
    }
}

function clearTerminalView() {
    terminalEl().textContent = "";
    showToast("Terminal cleared", "Tampilan terminal dibersihkan.", "info");
}

window.onload = () => {
    const savedBackend = localStorage.getItem("backend") || "";
    const savedToken = localStorage.getItem("token") || "";

    document.getElementById("backendUrl").value = savedBackend;
    document.getElementById("token").value = savedToken;

    setStatusDot("neutral");
    setMainStatus("Belum connect", "Masukkan backend URL dan token untuk mulai.");
};
