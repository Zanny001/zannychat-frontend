// Temporary, token-safe OAuth diagnostics. Remove after troubleshooting.
export function oauthDiag(event, details = {}) {
  try {
    const safe = {};
    for (const [key, value] of Object.entries(details)) {
      if (/token|secret|code|credential|url|email|user/i.test(key)) continue;
      if (value instanceof Error) {
        safe[key] = String(value.message || value.name || 'Error')
          .replace(/https?:\/\/[^\s]+/gi, '[URL]')
          .replace(/\b(access_token|refresh_token|provider_token|code)=[^&\s]+/gi, '$1=[REDACTED]');
      } else if (['string', 'number', 'boolean'].includes(typeof value) || value === null) {
        safe[key] = value;
      }
    }
    console.info('[OAUTH_DIAG]', new Date().toISOString(), event, safe);
  } catch (_) {}
}
