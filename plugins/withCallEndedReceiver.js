const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

function withCallEndedReceiver(config) {
  config = withDangerousMod(config, ['android', (config) => {
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

  // expo-callkit-telecom currently handles server-side callEnded pushes on
  // Android. Patch its PushKit delegate at prebuild so iOS can also dismiss an
  // already-reported CallKit session when the app is launched by APNs VoIP.
  return withDangerousMod(config, ['ios', (config) => {
    const sourcePath = path.join(
      config.modRequest.projectRoot,
      'node_modules/expo-callkit-telecom/ios/Managers/VoIPPushManager+PKPushRegistryDelegate.swift',
    );
    if (!fs.existsSync(sourcePath)) {
      throw new Error('withCallEndedReceiver: expo-callkit-telecom iOS PushKit delegate was not found');
    }
    let source = fs.readFileSync(sourcePath, 'utf8');
    if (source.includes('CallEndedPushEnvelope')) return config;
    const marker = '    guard let event = IncomingCallEventParser.parse(from: dictionaryPayload) else {';
    if (!source.includes(marker)) {
      throw new Error('withCallEndedReceiver: unsupported expo-callkit-telecom PushKit delegate source');
    }
    if (!source.includes('import CallKit')) source = source.replace('import Foundation', 'import CallKit\nimport Foundation');
    const handler = `    // CallEndedPushEnvelope: server-originated end signal for an existing CallKit session.
    if let callEnded = dictionaryPayload["callEnded"] as? [String: Any],
      let eventId = callEnded["eventId"] as? String,
      UUID(uuidString: eventId) != nil,
      let serverCallId = callEnded["serverCallId"] as? String,
      !serverCallId.isEmpty
    {
      let reason: CXCallEndedReason
      switch callEnded["reason"] as? String ?? "remoteEnded" {
      case "failed": reason = .failed
      case "unanswered", "missed": reason = .unanswered
      case "answeredElsewhere": reason = .answeredElsewhere
      case "declinedElsewhere", "declined": reason = .declinedElsewhere
      default: reason = .remoteEnded
      }
      Task {
        let session = await CallManager.shared.store.allSessions.first {
          $0.incomingCallEvent?.serverCallId == serverCallId
        }
        if let session {
          await CallManager.shared.reportCallEnded(for: session.id, reason: reason)
        }
        completion()
      }
      return
    }

`;
    source = source.replace(marker, handler + marker);
    fs.writeFileSync(sourcePath, source);
    return config;
  }]);
}

module.exports = withCallEndedReceiver;
