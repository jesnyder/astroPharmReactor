#!/usr/bin/env bash
# =============================================================================
# initiate_windows.sh — astroPharmReactor dependency installer (Windows)
# =============================================================================
#
# PURPOSE
#   Installs everything build.sh and the Arduino data loggers need on a
#   Windows host. Must be run from Git Bash (installed with Git for Windows),
#   since build.sh itself is a bash script.
#
#     - A Python interpreter (python / py / python3), installed via winget
#       if none is found
#     - pyserial (required by the logging_*.py scripts)
#     - git (should already be present, since this is running under Git Bash)
#     - Arduino firmware libraries, if arduino-cli is present
#
# USAGE (from Git Bash)
#   bash user_provided/makefile/initiate_windows.sh
#
#   Normally invoked via initiate.sh, which detects the OS automatically:
#   bash user_provided/makefile/initiate.sh
#
# NOTE
#   Git for Windows (which provides Git Bash) is a prerequisite and is not
#   installed by this script: https://git-scm.com/download/win
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "== astroPharmReactor: Windows dependency setup =="
echo ""

if [[ "${OSTYPE:-}" != msys* && "${OSTYPE:-}" != cygwin* ]]; then
    echo "  WARNING: this script expects to run under Git Bash on Windows"
    echo "           (detected OSTYPE=${OSTYPE:-unknown}). Continuing anyway."
    echo ""
fi

# ── Resolve a Python launcher ─────────────────────────────────────────────────
# Windows' python.org installer provides "python" and the "py" launcher, not
# "python3" — check in that order (build.sh does the same resolution).
PY=""
if command -v python &>/dev/null; then
    PY="python"
elif command -v py &>/dev/null; then
    PY="py -3"
elif command -v python3 &>/dev/null; then
    PY="python3"
fi

if [ -z "$PY" ]; then
    if command -v winget &>/dev/null; then
        echo "[1/3] Python not found — installing via winget..."
        winget install -e --id Python.Python.3.12 --source winget
        echo ""
        echo "  Python was installed. Close and reopen Git Bash so PATH picks it up,"
        echo "  then re-run: bash user_provided/makefile/initiate_windows.sh"
        exit 0
    else
        echo "[1/3] ERROR: no Python interpreter found and winget is unavailable."
        echo "      Install Python manually from https://www.python.org/downloads/windows/"
        echo "      (check \"Add python.exe to PATH\" during setup), then re-run this script."
        exit 1
    fi
fi
echo "[1/3] Using Python: $PY ($($PY --version 2>&1))"

# ── pyserial (required by the Arduino logger scripts) ─────────────────────────
echo "[2/3] Installing pyserial..."
$PY -m pip install --user pyserial

# ── git ─────────────────────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
    echo "[3/3] git not found — install Git for Windows: https://git-scm.com/download/win"
else
    echo "[3/3] git found."
fi

# ── Arduino firmware libraries (best-effort, only if arduino-cli is present) ──
if command -v arduino-cli &>/dev/null; then
    echo ""
    echo "Installing Arduino firmware libraries via arduino-cli..."
    arduino-cli lib install \
        "Adafruit SHT31 Library" \
        "Adafruit BME680 Library" \
        "DFRobot_AS7341" || true
else
    echo ""
    echo "Arduino IDE required libraries (install manually via Library Manager):"
    echo "  Wire (built-in), Adafruit_SHT31, Adafruit_BME680, DFRobot_AS7341"
fi

chmod +x "$SCRIPT_DIR/build.sh" 2>/dev/null || true

echo ""
echo "  Done. Build the dashboard with:"
echo "    bash user_provided/makefile/build.sh"
echo ""
