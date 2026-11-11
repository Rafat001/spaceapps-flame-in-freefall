#!/usr/bin/env bash
# Print a Python 3.11–3.13 interpreter path.
# Homebrew's `python3` may be 3.14, which can abort during `make ingest` (Error 134).
set -euo pipefail

is_ok() {
  "$1" -c 'import sys; raise SystemExit(0 if (3, 11) <= sys.version_info[:2] <= (3, 13) else 1)' 2>/dev/null
}

candidates=(
  python3.13 python3.12 python3.11
  /opt/homebrew/bin/python3.13 /opt/homebrew/bin/python3.12 /opt/homebrew/bin/python3.11
  /usr/local/bin/python3.13 /usr/local/bin/python3.12 /usr/local/bin/python3.11
  python3
)

seen=
for c in "${candidates[@]}"; do
  if ! command -v "$c" >/dev/null 2>&1 && [[ "$c" != /* ]]; then
    continue
  fi
  if [[ "$c" == /* ]]; then
    [[ -x "$c" ]] || continue
    path="$c"
  else
    path="$(command -v "$c")"
  fi
  case " $seen " in
    *" $path "*) continue ;;
  esac
  seen="$seen $path"
  if is_ok "$path"; then
    printf '%s\n' "$path"
    exit 0
  fi
done

echo "Need Python 3.11, 3.12, or 3.13. 3.14 is not supported yet and can crash during ingest (Error 134)." >&2
echo "On a Mac with Homebrew:  brew install python@3.13" >&2
exit 1
