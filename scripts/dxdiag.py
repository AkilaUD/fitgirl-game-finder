#!/usr/bin/env python3
"""Read this PC's hardware profile out of dxdiag.

dxdiag is the only Windows tool that reports the CPU model, installed RAM, GPU and
physical drives together without extra packages, so this script runs it into a temp
file, parses the fields Repack Finder needs, and prints them as JSON.

    python scripts/dxdiag.py            # JSON
    python scripts/dxdiag.py --keep     # also keep the raw DxDiag.txt path

Windows only. Nothing is uploaded; the temp report is deleted unless --keep is given.

Note on numbers: dxdiag prints drive sizes in its own units and rounds, so they differ a
little from `node scripts/serve.mjs` (which reads exact byte counts through the Windows API).
For the app's storage check the helper remains the authoritative source; this script is for
when you need the specs outside the local server.
"""

import json
import os
import re
import subprocess
import sys
import tempfile


def run_dxdiag(dest, timeout=180):
    subprocess.run(
        ["dxdiag", "/t", dest],
        check=True,
        timeout=timeout,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    return dest


def read_report(path):
    raw = open(path, "rb").read()
    # dxdiag writes UTF-16LE with a BOM on some builds and plain single-byte text on
    # others, so only trust UTF-16 when the BOM says so.
    if raw[:2] == b"\xff\xfe":
        return raw.decode("utf-16", "ignore")
    if raw[:2] == b"\xfe\xff":
        return raw.decode("utf-16-be", "ignore")
    for encoding in ("utf-8", "cp1252"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", "ignore")


def first(pattern, text, group=1):
    m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
    return m.group(group).strip() if m else None


def parse(text):
    ram_mb = first(r"^\s*Memory:\s*(\d+)\s*MB RAM", text)
    gpus = []
    for block in re.findall(r"^\s*Card name:\s*(.+)$", text, re.IGNORECASE | re.MULTILINE):
        name = block.strip()
        if name and name not in gpus:
            gpus.append(name)

    # Storage section, e.g. "Drive: C:" then "Free Space: 35.8 GB" and "Total Space: 81.3 GB".
    drives = []
    for match in re.finditer(
        r"^\s*Drive:\s*([A-Z]:)[^\n]*\n\s*Free Space:\s*([\d.]+)\s*GB[^\n]*\n\s*Total Space:\s*([\d.]+)\s*GB",
        text,
        re.MULTILINE,
    ):
        mount, free, total = match.groups()
        drives.append({"mount": mount, "totalGb": round(float(total), 1), "freeGb": round(float(free), 1)})

    return {
        "cpu": first(r"^\s*Processor:\s*(.+)$", text),
        "cores": first(r"^\s*Processor:\s*.*?\((\d+)\s*CPUs?\)", text),
        "ramGb": round(int(ram_mb) / 1024, 1) if ram_mb else None,
        "os": first(r"^\s*Operating System:\s*(.+)$", text),
        "gpus": gpus,
        "gpuMemory": first(r"^\s*Display Memory:\s*(.+)$", text),
        "drives": drives,
        "freeGb": round(sum(d["freeGb"] for d in drives), 1) if drives else None,
    }


def main():
    if os.name != "nt":
        sys.exit("dxdiag only exists on Windows.")

    keep = "--keep" in sys.argv
    handle, path = tempfile.mkstemp(prefix="dxdiag-", suffix=".txt")
    os.close(handle)
    try:
        run_dxdiag(path)
        info = parse(read_report(path))
    finally:
        if not keep:
            try:
                os.remove(path)
            except OSError:
                pass

    if keep:
        info["report"] = path
    print(json.dumps(info, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
