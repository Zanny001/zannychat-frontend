#!/usr/bin/env python3
"""Fetch and verify official npm SRI hashes for registry lock entries missing integrity.

Run before npm ci in a network-enabled environment. Never invent or infer hashes.
"""
import base64
import binascii
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCK_PATH = ROOT / "package-lock.json"
REGISTRY = "https://registry.npmjs.org/"
SRI_RE = re.compile(r"^sha(256|384|512)-([A-Za-z0-9+/]+={0,2})$")
EXPECTED_DIGEST_BYTES = {"256": 32, "384": 48, "512": 64}

def valid_sri(value):
    """Require a canonical SRI token with the digest length matching its algorithm."""
    if not isinstance(value, str):
        return False
    match = SRI_RE.fullmatch(value)
    if not match:
        return False
    algorithm, encoded = match.groups()
    try:
        digest = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        return False
    return len(digest) == EXPECTED_DIGEST_BYTES[algorithm] and base64.b64encode(digest).decode("ascii") == encoded

def main():
    lock = json.loads(LOCK_PATH.read_text())
    packages = lock.get("packages", {})
    pending = []
    for key, entry in packages.items():
        resolved = entry.get("resolved", "")
        if not key or not resolved.startswith(REGISTRY) or entry.get("integrity"):
            continue
        name = key.removeprefix("node_modules/")
        version = entry.get("version")
        if not version:
            raise SystemExit(f"BLOCK: {key} has a registry URL but no exact version")
        # Scope names need the slash preserved in the metadata URL.
        metadata_url = REGISTRY + name + "/" + version
        request = urllib.request.Request(metadata_url, headers={"Accept": "application/vnd.npm.install-v1+json", "User-Agent": "ZannyChat-release-integrity-check/1"})
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                metadata = json.load(response)
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            raise SystemExit(f"BLOCK: unable to retrieve official npm metadata for {name}@{version}: {exc}")
        dist = metadata.get("dist", {})
        official_tarball = dist.get("tarball")
        integrity = dist.get("integrity")
        if metadata.get("version") != version:
            raise SystemExit(f"BLOCK: registry version mismatch for {name}@{version}")
        if official_tarball != resolved:
            raise SystemExit(f"BLOCK: tarball URL mismatch for {name}@{version}: lock={resolved!r}, registry={official_tarball!r}")
        if not valid_sri(integrity):
            raise SystemExit(f"BLOCK: registry did not provide a valid SRI integrity value for {name}@{version}")
        pending.append((key, integrity))
    for key, integrity in pending:
        packages[key]["integrity"] = integrity
    if pending:
        LOCK_PATH.write_text(json.dumps(lock, indent=2) + "\n")
    missing = [key for key, entry in packages.items() if key and entry.get("resolved", "").startswith(REGISTRY) and not valid_sri(entry.get("integrity", ""))]
    if missing:
        raise SystemExit("BLOCK: unresolved or invalid registry integrity records: " + ", ".join(missing))
    print(f"PASS: all registry lockfile entries have valid SRI hashes; refreshed {len(pending)} missing hash(es).")

if __name__ == "__main__":
    main()
