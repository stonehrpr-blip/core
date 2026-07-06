# CoreApp — snapshot (4 July 2026, commit 8e4c308)

This folder is a COPY of the app for safekeeping/sharing.
The LIVE code you see at http://localhost:4399 still lives in
`~/core-app/previews` — edit THERE, not here, or changes won't show up.

## Run this copy
    cd ~/Desktop/CoreApp/app
    python3 -m http.server 8000
then open http://localhost:8000/01-index.html

## What's inside
- app/                 every page (01-index → 02-corbit → 07-trial → dashboard…)
- app/_lib/            shared JS/CSS incl. core-i18n.js (languages) and
                       reapply-corbit-upgrade.py (re-applies the Corbit upgrade
                       if a worktree sync ever clobbers the files again)
- BACKEND-SETUP.md     Supabase / Apple / Google sign-in setup guide
