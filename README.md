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


## v6 terminal behavior
- Terminal is now truly scrollable up/down.
- Auto-scroll automatically turns off when the user scrolls upward.
- Auto-scroll automatically turns on again when the user returns to the bottom.
- Clear now stores a baseline, so old logs do not immediately reappear on the next update.
- Terminal uses normal top-to-bottom text flow for readable history.


## v7 changes
- Restart button now has 2-step confirmation, same style as Stop.


## v8 changes
- Stop button color now uses a stronger red style matching the other control buttons.
- Added Public Server Address above Kontrol Server after backend connection:
  relations-webmaster.gl.at.ply.gg : 51633
- Added entrance animations to panels, cards, orbs, and controls.
- Toast notification now has entrance animation, exit animation, and a horizontal countdown bar.
