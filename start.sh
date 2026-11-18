#!/usr/bin/env bash
# Quick launcher untuk TAJAWWUL Bullet Hell
PORT=${1:-8080}
echo "🕌 Starting TAJAWWUL Bullet Hell on http://localhost:$PORT ..."
echo "   Tekan Ctrl+C untuk stop server."
python3 -m http.server "$PORT"
