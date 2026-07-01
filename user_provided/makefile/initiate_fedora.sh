#!/usr/bin/env bash
# =============================================================================
# initiate_fedora.sh — astroPharmReactor dependency installer (Fedora)
# =============================================================================
#
# PURPOSE
#   Installs everything build.sh and the Arduino data loggers need on a
#   Fedora host:
#     - python3 + pip3
#     - pyserial (required by the logging_*.py scripts)
#     - xdg-utils (provides xdg-open, used by build.sh to open the dashboard)
#     - git
#     - Arduino firmware libraries, if arduino-cli is present
#
# USAGE
#   bash user_provided/makefile/initiate_fedora.sh
#
#   Normally invoked via initiate.sh, which detects the OS automatically:
#   bash user_provided/makefile/initiate.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "== astroPharmReactor: Fedora dependency setup =="
echo ""

# ── Python 3 + pip ────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    echo "[1/5] Installing python3..."
    sudo dnf install -y python3 python3-pip
else
    echo "[1/5] python3 found: $(python3 --version)"
fi

if ! command -v pip3 &>/dev/null; then
    echo "      Installing python3-pip..."
    sudo dnf install -y python3-pip
fi

# ── pyserial (required by the Arduino logger scripts) ─────────────────────────
echo "[2/5] Installing pyserial..."
python3 -m pip install --user pyserial

# ── xdg-utils (xdg-open, used by build.sh to open the dashboard) ──────────────
if ! command -v xdg-open &>/dev/null; then
    echo "[3/5] Installing xdg-utils..."
    sudo dnf install -y xdg-utils
else
    echo "[3/5] xdg-utils found."
fi

# ── git ─────────────────────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
    echo "[4/5] Installing git..."
    sudo dnf install -y git
else
    echo "[4/5] git found."
fi

# ── Arduino firmware libraries (best-effort, only if arduino-cli is present) ──
echo "[5/5] Arduino firmware libraries..."
if command -v arduino-cli &>/dev/null; then
    arduino-cli lib install \
        "Adafruit SHT31 Library" \
        "Adafruit BME680 Library" \
        "DFRobot_AS7341" || true
else
    echo "      arduino-cli not found — install these manually via the Arduino IDE"
    echo "      Library Manager: Wire (built-in), Adafruit_SHT31, Adafruit_BME680,"
    echo "      DFRobot_AS7341."
fi

chmod +x "$SCRIPT_DIR/build.sh"

echo ""
echo "  Done. Build the dashboard with:"
echo "    bash user_provided/makefile/build.sh"
echo ""
