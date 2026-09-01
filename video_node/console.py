"""
console.py
----------
Windows console hardening.

DeepFace emits emoji in its log messages. On Windows the default console
code page is cp1252, which cannot encode those characters -- printing them
raises UnicodeEncodeError and would crash the vision loop mid-run.

Calling enable_utf8() first thing in an entry point reconfigures stdout and
stderr to UTF-8 and degrades unencodable characters instead of raising.
"""

import sys


def enable_utf8() -> None:
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is None:
            continue
        try:
            reconfigure(encoding="utf-8", errors="replace")
        except (ValueError, OSError):
            # Non-reconfigurable stream (redirected/closed); safe to ignore.
            pass
