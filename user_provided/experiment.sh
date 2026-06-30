#!/usr/bin/env bash
# =============================================================================
# experiment.sh — astroPharmReactor automated experiment runner
# =============================================================================
#
# PURPOSE
#   Runs the sensor logger for SESSION_HOURS, then builds the website,
#   commits study data to git, and repeats until interrupted.
#   Designed as a crash-resilient loop: if the logger errors mid-session,
#   whatever was captured is still committed and the next cycle restarts cleanly.
#
# USAGE
#   From the repo root:
#     bash user_provided/experiment.sh
#
#   Strongly recommended — run inside tmux so it survives terminal disconnects:
#     tmux new -s reactor
#     bash user_provided/experiment.sh
#     (Ctrl-B D to detach;  tmux attach -t reactor  to return)
#
# SETTINGS TO VERIFY BEFORE RUNNING
#   1. SESSION_HOURS — how long each logging block runs (default: 2)
#   2. STUDY_NAME    — must match STUDY_NAME inside the logger script
#   3. SERIAL_PORT inside the logger script must match your OS:
#        Linux:   /dev/ttyUSB0  (or /dev/ttyACM0 for some boards)
#        Windows: COM3 / COM6 / etc.
#      (see user_provided/arduino/01_stepper_motor/logging_sht30_bme688_bme688_as7341.py)
#
# NOTES ON ARDUINO FIRMWARE
#   Arduino firmware persists on the board after upload — you do NOT need to
#   re-upload each cycle.  The Python logger just opens the serial port and reads
#   data.  Only re-upload after a firmware change or board replacement.
#
# DEPENDENCIES
#   - python3 with pyserial  (install via pip, see Step 0 below)
#   - git with SSH key configured  (git@github.com:jesnyder/astroPharmReactor)
#   - arduino-cli  only if you want automated firmware upload (Step 0b, optional)
# =============================================================================

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOGGER="$SCRIPT_DIR/arduino/01_stepper_motor/logging_sht30_bme688_bme688_as7341.py"
BUILD_SH="$SCRIPT_DIR/makefile/build.sh"
PYTHON="${PYTHON:-python3}"

# ── Settings ──────────────────────────────────────────────────────────────────
SESSION_HOURS=2                  # logging duration per cycle
STUDY_NAME="study004_bsub"      # must match STUDY_NAME inside the logger script

SESSION_SECS=$(( SESSION_HOURS * 3600 ))

# =============================================================================
# STEP 0 — INSTALL PYTHON REQUIREMENTS
#   Uncomment the block below on first run, then comment it out again.
#   Only pyserial is required; everything else is standard library.
# =============================================================================
# echo "[ setup ] Installing Python requirements …"
# "$PYTHON" -m pip install --upgrade pip
# "$PYTHON" -m pip install pyserial
# echo "[ setup ] Done."


# =============================================================================
# STEP 0b — UPLOAD ARDUINO FIRMWARE  (one-time setup, not needed per cycle)
#   Requires arduino-cli: https://arduino.github.io/arduino-cli/installation/
#   Set ARDUINO_PORT and ARDUINO_FQBN to match your board, then uncomment.
# =============================================================================
# ARDUINO_PORT="/dev/ttyUSB0"          # Linux; Windows: "COM3" etc.
# ARDUINO_FQBN="arduino:avr:uno"
# SKETCH_DIR="$SCRIPT_DIR/arduino/01_stepper_motor"
# echo "[ setup ] Uploading firmware …"
# arduino-cli compile --fqbn "$ARDUINO_FQBN" "$SKETCH_DIR"
# arduino-cli upload  --fqbn "$ARDUINO_FQBN" --port "$ARDUINO_PORT" "$SKETCH_DIR"
# sleep 5    # allow Arduino to reboot after upload
# echo "[ setup ] Firmware uploaded."


# ── Signal handling ───────────────────────────────────────────────────────────
# Ctrl-C (SIGINT) sets a flag rather than killing the script immediately.
# The current cycle (logger → build → commit → push) runs to completion so
# no data is lost, then the script exits cleanly at the top of the next cycle.
STOP=false
trap 'echo ""; echo "  Ctrl-C — finishing current cycle then stopping …"; STOP=true' INT

# ── Sanity checks ─────────────────────────────────────────────────────────────
if [ ! -f "$LOGGER" ]; then
  echo "ERROR: logger not found at $LOGGER" >&2
  exit 1
fi
if [ ! -f "$BUILD_SH" ]; then
  echo "ERROR: build script not found at $BUILD_SH" >&2
  exit 1
fi
if ! command -v git &>/dev/null; then
  echo "ERROR: git not found in PATH" >&2
  exit 1
fi

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║     astroPharmReactor  —  experiment runner        ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
echo "  Study      : $STUDY_NAME"
echo "  Block size : ${SESSION_HOURS} h  (${SESSION_SECS} s per cycle)"
echo "  Logger     : $LOGGER"
echo "  Build      : $BUILD_SH"
echo "  Repo root  : $REPO_ROOT"
echo "  Python     : $("$PYTHON" --version 2>&1)"
echo ""
echo "  CSV rows are flushed to disk after every reading — data is safe on Ctrl-C."
echo "  Ctrl-C stops the logger and exits cleanly after the current cycle's commit."
echo ""

# ── Main loop ─────────────────────────────────────────────────────────────────
CYCLE=0
while true; do
  CYCLE=$(( CYCLE + 1 ))

  if $STOP; then
    echo "  Ctrl-C acknowledged — exiting cleanly."
    exit 0
  fi

  echo "══════════════════════════════════════════════════════"
  echo "  Cycle ${CYCLE}  —  $(date '+%Y-%m-%d %H:%M:%S')"
  echo "══════════════════════════════════════════════════════"
  echo ""

  # ── 1. Run the sensor logger ───────────────────────────────────────────────
  #   timeout sends SIGINT after SESSION_SECS so Python catches KeyboardInterrupt
  #   and exits through its context managers (flushes + closes CSV and serial port).
  #   Exit codes: 0 = stopped early (Ctrl-C or no data), 124 = timed out normally,
  #   anything else = error (still commit whatever was captured).
  echo "[ 1 / 4 ]  Running sensor logger for ${SESSION_HOURS} h …"
  echo "           ($(date '+%H:%M:%S') → approx $(date -d "+${SESSION_SECS} seconds" '+%H:%M:%S'))"

  timeout --signal=SIGINT "${SESSION_SECS}" "$PYTHON" "$LOGGER" || LOG_EXIT=$?
  LOG_EXIT="${LOG_EXIT:-0}"

  case $LOG_EXIT in
    0)   echo "  Logger exited cleanly (Ctrl-C or empty run)." ;;
    124) echo "  Logger completed ${SESSION_HOURS}-hour block." ;;
    *)   echo "  ⚠  Logger exited with code ${LOG_EXIT} — committing what was captured." ;;
  esac
  echo ""

  # If Ctrl-C was pressed during logging, LOG_EXIT is 130 (SIGINT to timeout itself).
  # We still fall through to commit so no data is lost.

  # ── 2. Build website ───────────────────────────────────────────────────────
  echo "[ 2 / 4 ]  Building website data …"
  bash "$BUILD_SH" || echo "  ⚠  Build failed — committing raw CSV data only."
  echo ""

  # ── 3. Stage and commit ────────────────────────────────────────────────────
  echo "[ 3 / 4 ]  Staging study data and website …"
  git -C "$REPO_ROOT" add "studies/$STUDY_NAME/" "docs/js/" 2>/dev/null || true

  if git -C "$REPO_ROOT" diff --cached --quiet; then
    echo "  Nothing new to commit — skipping."
  else
    COMMIT_MSG="updating study data — cycle ${CYCLE}, $(date '+%Y-%m-%d %H:%M')"
    git -C "$REPO_ROOT" commit -m "$COMMIT_MSG"
    echo ""

    # ── 4. Push ───────────────────────────────────────────────────────────────
    echo "[ 4 / 4 ]  Pushing to remote …"
    git -C "$REPO_ROOT" push \
      || echo "  ⚠  Push failed (SSH key loaded? network up?). Commit is saved locally; will retry next cycle."
  fi

  echo ""
  echo "  Cycle ${CYCLE} complete. Starting cycle $(( CYCLE + 1 )) at $(date '+%H:%M:%S') …"
  echo ""
done
