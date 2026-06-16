# Bedrock Control Panel UI v3

Upload/replace these files to your GitHub Pages repo:

- index.html
- style.css
- script.js
- favicon.svg
- icon-192.png
- icon-512.png
- site.webmanifest

Features:
- Fredoka + Quicksand font
- Font Awesome icons
- Custom toast, no browser alert
- Stop server has 2-step confirmation
- Restart has confirmation
- Terminal auto-scroll toggle
- Copy and clear terminal buttons
- Web icon / favicon included

Remember:
- Do not upload backend .env to GitHub.
- Backend URL should not end with slash.


## v4 changes
- Terminal area is now truly scrollable.
- Removed bottom alignment that caused unused empty space.
- Trimmed empty tmux capture lines from the top/bottom of terminal output.
- Added custom scrollbar styling.
- Mobile terminal height adjusted.


## v5 terminal behavior
- Terminal text now sits at the bottom when the log is short.
- History is still scrollable upward normally.
- No unused empty block under the text.
- Auto-scroll still works, but you can scroll up to inspect history.
