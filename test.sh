#!/usr/bin/env bash
# Test DULU sebelum submit — jalankan harness Node tanpa browser.
# Kalau muncul "SEMUA TEST LULUS", game aman.
set -e
cd "$(dirname "$0")"
echo "🧪 Menjalankan test harness TAJAWWUL..."
node test-harness.js
