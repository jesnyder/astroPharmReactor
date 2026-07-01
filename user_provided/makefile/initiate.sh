#!/usr/bin/env bash
# =============================================================================
# initiate.sh — astroPharmReactor dependency installer (OS auto-detect)
# =============================================================================
#
# PURPOSE
#   Detects the host OS and runs the matching dependency installer so that
#   build.sh (and the Arduino data loggers) can run:
#     - Fedora / dnf-based Linux → initiate_fedora.sh
#     - Windows (Git Bash)       → initiate_windows.sh
#
# USAGE
#   From the repo root:
#     bash user_provided/makefile/initiate.sh
#
#   From this directory:
#     ./initiate.sh
#
# FIRST RUN — make executable:
#   chmod +x user_provided/makefile/initiate.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$(uname -s)" in
    Linux*)
        if command -v dnf &>/dev/null; then
            exec bash "$SCRIPT_DIR/initiate_fedora.sh"
        fi
        echo "This installer supports Fedora (dnf) and Windows (Git Bash) only."
        echo "Detected a non-Fedora Linux system (no dnf found)."
        echo "See README.md 'Software' section for manual dependency install steps:"
        echo "  python3, pip install pyserial, xdg-utils, and Arduino IDE libraries"
        echo "  (Wire, Adafruit_SHT31, Adafruit_BME680, DFRobot_AS7341)."
        exit 1
        ;;
    MINGW*|MSYS*|CYGWIN*)
        exec bash "$SCRIPT_DIR/initiate_windows.sh"
        ;;
    Darwin*)
        echo "macOS is not covered by this installer."
        echo "Manually install: Python 3, 'pip install pyserial', and the Arduino IDE"
        echo "libraries (Wire, Adafruit_SHT31, Adafruit_BME680, DFRobot_AS7341)."
        exit 1
        ;;
    *)
        echo "Unrecognized OS: $(uname -s)"
        echo "See README.md 'Software' section for manual dependency install steps."
        exit 1
        ;;
esac
