# mc-web-control backend v2

Perubahan:
- Start membuat tmux shell session dulu, lalu menjalankan ./bedrock_server di dalamnya.
- Restart mengirim `stop`, menunggu, lalu menjalankan `./bedrock_server` lagi di tmux yang sama.
- Stop mengirim `stop`, menunggu, lalu `tmux kill-session` untuk end task tmux.
- Status sekarang cek proses bedrock_server, bukan cuma tmux session.

Cara pakai:
1. Backup server.js lama:
   cp ~/mc-web-control/server.js ~/mc-web-control/server.js.bak
2. Replace server.js dengan file ini.
3. Restart backend:
   pm2 restart mc-web-control
   # atau kalau manual: CTRL+C lalu node server.js
