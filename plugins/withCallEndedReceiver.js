const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

function withCallEndedReceiver(config) {
  return withDangerousMod(config, ['android', (config) => {
    const packageName = config.android?.package;
    if (!packageName) throw new Error('withCallEndedReceiver: android.package is not set');
    const backendUrl = String(config.extra?.backendUrl || '').replace(/\/$/, '');
    if (!backendUrl.startsWith('https://')) throw new Error('withCallEndedReceiver: extra.backendUrl must be an HTTPS URL');
    const packageDir = path.join(
      config.modRequest.platformProjectRoot,
      'app/src/main/java',
      ...packageName.split('.'),
    );
    fs.mkdirSync(packageDir, { recursive: true });
    const source = fs.readFileSync(path.join(__dirname, 'CallEndedReceiver.kt'), 'utf8')
      .replace(/^package .*$/m, `package ${packageName}`)
      .replace('__ZANNYCHAT_BACKEND_URL__', backendUrl);
    fs.writeFileSync(path.join(packageDir, 'CallEndedReceiver.kt'), source);
    return config;
  }]);
}

module.exports = withCallEndedReceiver;
