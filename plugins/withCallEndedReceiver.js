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
    const marker = '    guard let event = IncomingCallEventParser.parse(from: dictionaryPayload) else {';
    if (!source.includes(marker) && !source.includes('CallEndedPushEnvelope')) {
      throw new Error('withCallEndedReceiver: unsupported expo-callkit-telecom PushKit delegate source');
    }
    if (!source.includes('import CallKit')) source = source.replace('import Foundation', 'import CallKit\nimport Foundation');
    if (!source.includes('CallEndedPushEnvelope')) {
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
      let storageKey = "zannychat.callkit.server.\\(serverCallId)"
      Task {
        let session = await CallManager.shared.store.allSessions.first {
          $0.incomingCallEvent?.serverCallId == serverCallId
        }
        let storedId = UserDefaults.standard.string(forKey: storageKey).flatMap(UUID.init(uuidString:))
        if let callId = session?.id ?? storedId {
          await CallManager.shared.reportCallEnded(for: callId, reason: reason)
        }
        UserDefaults.standard.removeObject(forKey: storageKey)
        completion()
      }
      return
    }

`;
      source = source.replace(marker, handler + marker);
    }
    fs.writeFileSync(sourcePath, source);

    // Persist serverCallId -> CallKit UUID because CallStore is in-memory and
    // iOS may relaunch the process for a later PushKit callEnded event.
    const managerPath = path.join(
      config.modRequest.projectRoot,
      'node_modules/expo-callkit-telecom/ios/Managers/CallManager.swift',
    );
    if (!fs.existsSync(managerPath)) {
      throw new Error('withCallEndedReceiver: expo-callkit-telecom iOS CallManager was not found');
    }
    let manager = fs.readFileSync(managerPath, 'utf8');
    if (!manager.includes('import Foundation')) manager = manager.replace('import CallKit', 'import CallKit\nimport Foundation');
    const incomingSignatures = [
      'func reportIncomingCall(event: IncomingCallEvent) async throws {',
      'func reportIncomingCall(event: IncomingCallEvent, completion: @escaping (Error?) -> Void) {',
    ];
    for (const signature of incomingSignatures) {
      const start = manager.indexOf(signature);
      if (start < 0) throw new Error('withCallEndedReceiver: unsupported iOS incoming-call manager source');
      const end = manager.indexOf('\n  }', start);
      const section = manager.slice(start, end < 0 ? manager.length : end);
      if (!section.includes('zannychat.callkit.server.\\(event.serverCallId)')) {
        const idLine = manager.indexOf('    let id = UUID()', start);
        if (idLine < 0 || (end >= 0 && idLine > end)) {
          throw new Error('withCallEndedReceiver: could not locate incoming CallKit UUID creation');
        }
        const afterId = idLine + '    let id = UUID()'.length;
        manager = manager.slice(0, afterId)
          + '\n    UserDefaults.standard.set(id.uuidString, forKey: "zannychat.callkit.server.\\(event.serverCallId)")'
          + manager.slice(afterId);
      }
    }
    const reportSignature = 'func reportCallEnded(for id: UUID, reason: CXCallEndedReason) async {';
    if (!manager.includes('UserDefaults.standard.removeObject(forKey: "zannychat.callkit.server.\\(serverCallId)")')) {
      const reportStart = manager.indexOf(reportSignature);
      const reportLog = manager.indexOf('    Log.call.debug("Reporting call ended - id: \\(id), reason: \\(reason.rawValue)")', reportStart);
      if (reportStart < 0 || reportLog < 0) throw new Error('withCallEndedReceiver: could not locate iOS call-end cleanup');
      const afterLog = reportLog + '    Log.call.debug("Reporting call ended - id: \\(id), reason: \\(reason.rawValue)")'.length;
      manager = manager.slice(0, afterLog)
        + '\n    if let session = await store.session(for: id), let serverCallId = session.incomingCallEvent?.serverCallId {\n      UserDefaults.standard.removeObject(forKey: "zannychat.callkit.server.\\(serverCallId)")\n    }'
        + manager.slice(afterLog);
    }
    fs.writeFileSync(managerPath, manager);

    const delegatePath = path.join(
      config.modRequest.projectRoot,
      'node_modules/expo-callkit-telecom/ios/Managers/CallManager+CXProviderDelegate.swift',
    );
    if (!fs.existsSync(delegatePath)) {
      throw new Error('withCallEndedReceiver: expo-callkit-telecom iOS CallKit delegate was not found');
    }
    let delegate = fs.readFileSync(delegatePath, 'utf8');
    const endActionMarker = '      if var session = await store.session(for: action.callUUID) {';
    if (!delegate.includes('zannychat.callkit.server.\\(serverCallId)')) {
      if (!delegate.includes(endActionMarker)) throw new Error('withCallEndedReceiver: unsupported iOS end-call delegate source');
      delegate = delegate.replace(endActionMarker, endActionMarker + '\n        if let serverCallId = session.incomingCallEvent?.serverCallId {\n          UserDefaults.standard.removeObject(forKey: "zannychat.callkit.server.\\(serverCallId)")\n        }');
    }
    fs.writeFileSync(delegatePath, delegate);
    return config;
  }]);
}

module.exports = withCallEndedReceiver;
