#!/usr/bin/env python3
"""Check release version alignment and dependency-lock completeness without network access."""
import json, sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
backend = root.parent / "zannychat-back-github"
checks=[]
def check(name, ok, detail=""):
    checks.append((name, bool(ok), detail))
try:
    package=json.loads((root/"package.json").read_text())
    app=json.loads((root/"app.json").read_text())
    lock=json.loads((root/"package-lock.json").read_text())
    backend_package=json.loads((backend/"package.json").read_text())
    check("Frontend package and Expo versions match", package.get("version")==app.get("expo",{}).get("version"), f"package={package.get('version')} app={app.get('expo',{}).get('version')}")
    locked=lock.get("packages",{}).get("",{}).get("dependencies",{})
    check("Lockfile root dependencies match package manifest", all(locked.get(k)==v for k,v in package.get("dependencies",{}).items()), "Run npm install with the intended Expo SDK to reconcile package-lock.json.")
    missing=[k for k in package.get("dependencies",{}) if k not in lock.get("packages",{}).get("",{}).get("dependencies",{})]
    check("All declared frontend dependencies are represented in lockfile", not missing, ", ".join(missing))
    check("Backend package version is explicit", bool(backend_package.get("version")), str(backend_package.get("version")))
except Exception as exc:
    check("Release manifests parse", False, str(exc))
for name,ok,detail in checks:
    print(("PASS" if ok else "FAIL")+": "+name+(" — "+detail if detail else ""))
print(f"\n{sum(ok for _,ok,_ in checks)}/{len(checks)} release contract checks passed")
sys.exit(0 if all(ok for _,ok,_ in checks) else 1)
