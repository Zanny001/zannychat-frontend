#!/usr/bin/env python3
"""Conservative static release hygiene checks for the ZannyChat frontend."""
from pathlib import Path
import re, sys, subprocess
root = Path(__file__).resolve().parents[1]
checks = []
def check(name, condition, detail=""):
    checks.append((name, bool(condition), detail))
def text_files():
    for p in root.rglob("*"):
        if not p.is_file() or any(part in {"node_modules", ".git", "dist", "build"} for part in p.parts):
            continue
        if p.suffix.lower() in {".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".yml", ".yaml", ".env", ".txt"}:
            try: yield p, p.read_text(errors="ignore")
            except OSError: pass
files = list(text_files())
all_text = "\n".join(t for _, t in files)
check("Auth screens present", (root/"src/screens/SignupScreen.js").exists() and (root/"src/screens/LoginScreen.js").exists())
check("Email OTP verification screen present", any(p.name.lower() in {"emailverificationscreen.js","emailotpscreen.js","verifyemailscreen.js"} for p,_ in files) or "verifyOtp" in all_text)
check("Google OAuth flow referenced", "signInWithOAuth" in all_text and "google" in all_text.lower())
check("Wallet screen absent", not (root/"src/screens/WalletScreen.js").exists())
check("No service-role key literal", not re.search(r"SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['\"][^'\"]{12,}", all_text))
check("No private SMTP credential literal", not re.search(r"(smtp[_-]?password|brevo[_-]?api[_-]?key)\s*[:=]\s*['\"][^'\"]{8,}", all_text, re.I))
check("No obvious private key block", "-----BEGIN PRIVATE KEY-----" not in all_text)
check("Private-media release notes present", any("PRIVATE_MEDIA_RELEASE" in p.name for p,_ in files))
check("Email OTP Brevo setup notes present", (root/"EMAIL_OTP_BREVO_SETUP.md").exists())
check("No committed .env files", not any(p.name == ".env" or p.name.startswith(".env.") and p.name not in {".env.example"} for p,_ in files))
check("Package manifest present", (root/"package.json").exists())
# Parse plain JavaScript service modules as ESM so duplicate lexical declarations
# and other syntax errors fail release audit (unit tests do not import every service).
service_files = list((root / "src" / "services").glob("*.js"))
syntax_failures = []
for source in service_files:
    result = subprocess.run(["node", "--input-type=module", "--check"], input=source.read_text(), text=True, capture_output=True)
    if result.returncode:
        syntax_failures.append(f"{source.name}: {(result.stderr or result.stdout).strip().splitlines()[-1] if (result.stderr or result.stdout).strip() else 'syntax error'}")
check("Service modules pass JavaScript syntax checks", not syntax_failures, "; ".join(syntax_failures[:3]))
for name, ok, detail in checks:
    print(f'{"PASS" if ok else "FAIL"}: {name}' + (f" — {detail}" if detail else ""))
print(f"\n{sum(ok for _,ok,_ in checks)}/{len(checks)} checks passed")
sys.exit(0 if all(ok for _,ok,_ in checks) else 1)
