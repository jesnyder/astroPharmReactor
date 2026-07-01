#!/usr/bin/env bash
# =============================================================================
# build.sh — astroPharmReactor data pipeline
# =============================================================================
#
# PURPOSE
#   Two-step build that regenerates the website study summaries from raw data:
#
#   Step 1 — generate_study_summaries.py
#     Walks studies/study*/ (repo root) for CSV log files.
#     Normalises column names across all schema versions (SHT30-only → dual
#     BME688 + AS7341).  Filters bad/saturated values.  Computes per-variable
#     min/max/range/mean/slope/r, bad-data windows, reads each study's
#     description*.txt file, and writes downsampled time-series chart data.
#     Writes one JS data file per study to docs/js/.
#
#   Step 2 — open docs/index.html in the system default browser.
#     The page loads the generated JS files and renders Plotly charts, a
#     session-timeline chart, a bad-data bar chart, and a sortable/downloadable
#     Tabulator stats table for each study — all at the top of the page.
#
# USAGE
#   From the repo root:
#     bash user_provided/makefile/build.sh
#
#   From this directory:
#     ./build.sh
#
# FIRST RUN — make executable:
#   chmod +x user_provided/makefile/build.sh
#
#   On a fresh machine (Fedora or Windows/Git Bash) that is missing Python,
#   pip, pyserial, etc., run the dependency installer first:
#     bash user_provided/makefile/initiate.sh
#
# OVERRIDE PYTHON INTERPRETER
#   PYTHON=python3.11 bash build.sh
#
# OUTPUT FILES
#   docs/js/study001_ecoli.js
#   docs/js/study002_ecoli.js
#   docs/js/study003_ecoli.js
#   docs/js/study004_bsub.js
#   (one JS file per study* folder found under studies/)
#
# DEPENDENCIES
#   Python 3 — standard library only (csv, glob, json, math, os, datetime)
#   A Python interpreter reachable as python3, python, or py (Windows'
#   python.org installer only provides "python"/"py", not "python3" — see
#   initiate_windows.sh / initiate_fedora.sh to install one).
# =============================================================================

set -euo pipefail

# ── Resolve paths relative to this script's location ─────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PYTHON_SCRIPT="$REPO_ROOT/user_provided/python/generate_study_summaries.py"
INDEX_HTML="$REPO_ROOT/docs/index.html"

# ── Resolve a Python interpreter ──────────────────────────────────────────────
# Fedora/Linux/macOS ship "python3"; Windows' python.org installer only
# provides "python" and the "py" launcher. Respect PYTHON if the caller set it.
if [ -n "${PYTHON:-}" ]; then
    PYTHON_CMD=("$PYTHON")
elif command -v python3 &>/dev/null; then
    PYTHON_CMD=(python3)
elif command -v python &>/dev/null; then
    PYTHON_CMD=(python)
elif command -v py &>/dev/null; then
    PYTHON_CMD=(py -3)
else
    echo "ERROR: no Python interpreter found (tried python3, python, py)." >&2
    echo "       Run: bash user_provided/makefile/initiate.sh" >&2
    exit 1
fi

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     astroPharmReactor  —  build          ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Repo  : $REPO_ROOT"
echo "  Python: $("${PYTHON_CMD[@]}" --version 2>&1)"
echo ""

# ── Step 1: generate study summary JS files ───────────────────────────────────
echo "[ 1 / 2 ]  Scraping Arduino CSV data and generating study summaries …"
echo "           $PYTHON_SCRIPT"
echo ""
"${PYTHON_CMD[@]}" "$PYTHON_SCRIPT"

# ── Step 2: open the docs site in the default browser ────────────────────────
echo ""
echo "[ 2 / 2 ]  Opening site …"
echo "           $INDEX_HTML"

if command -v xdg-open &>/dev/null; then
    xdg-open "$INDEX_HTML"
elif command -v open &>/dev/null; then
    open "$INDEX_HTML"
elif command -v cmd.exe &>/dev/null; then
    # Windows/Git Bash — cmd.exe auto-translates the POSIX path argument.
    cmd.exe /c start "" "$INDEX_HTML" || true
elif command -v explorer.exe &>/dev/null; then
    # explorer.exe returns a non-zero exit code even on success.
    explorer.exe "$INDEX_HTML" || true
else
    echo ""
    echo "  No browser opener found (tried xdg-open, open, cmd.exe, explorer.exe)."
    echo "  Open manually: file://$INDEX_HTML"
fi

echo ""
echo "  ✓  Build complete."
echo ""
