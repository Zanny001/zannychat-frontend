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
        let sessions = await CallManager.shared.store.allSessions
        let session = sessions.first { $0.incomingCallEvent?.serverCallId == serverCallId }
        let storedId = UserDefaults.standard.string(forKey: storageKey).flatMap(UUID.init(uuidString:))
        let pendingServerId = UserDefaults.standard.string(forKey: "zannychat.callkit.pendingServerId")
        let pendingNativeId = pendingServerId == serverCallId
          ? CXCallObserver().calls.first(where: { $0.isOutgoing && !$0.hasEnded })?.uuid
          : nil
        if let callId = session?.id ?? storedId ?? pendingNativeId {
          await CallManager.shared.reportCallEnded(for: callId, reason: reason)
        }
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
    if (!manager.includes('import Security')) manager = manager.replace('import CallKit', 'import CallKit\nimport Security');
    if (!manager.includes('zannychatSendNativeEndEvent')) {
      const helpers = "\nprivate let ZANNYCHAT_BACKEND_URL = \"__ZANNYCHAT_BACKEND_URL__\"\nprivate let zannychatKeychainService = \"com.zannychat.native-call-mapping\"\n\nprivate func zannychatReadMapping(_ id: UUID) -> [String: String]? {\n  let query: [String: Any] = [\n    kSecClass as String: kSecClassGenericPassword,\n    kSecAttrService as String: zannychatKeychainService,\n    kSecAttrAccount as String: id.uuidString,\n    kSecReturnData as String: true,\n    kSecMatchLimit as String: kSecMatchLimitOne,\n  ]\n  var result: CFTypeRef?\n  guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,\n    let data = result as? Data,\n    let mapping = try? JSONSerialization.jsonObject(with: data) as? [String: String]\n  else { return nil }\n  return mapping\n}\n\nprivate func zannychatStoreMapping(_ id: UUID, serverCallId: String, token: String, origin: String) {\n  guard let data = try? JSONSerialization.data(withJSONObject: [\n    \"serverCallId\": serverCallId, \"token\": token, \"origin\": origin,\n  ]) else { return }\n  let query: [String: Any] = [\n    kSecClass as String: kSecClassGenericPassword,\n    kSecAttrService as String: zannychatKeychainService,\n    kSecAttrAccount as String: id.uuidString,\n  ]\n  let attributes: [String: Any] = [\n    kSecValueData as String: data,\n    kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,\n  ]\n  let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)\n  if status == errSecItemNotFound {\n    var addQuery = query\n    attributes.forEach { addQuery[$0.key] = $0.value }\n    SecItemAdd(addQuery as CFDictionary, nil)\n  }\n  UserDefaults.standard.set(id.uuidString, forKey: \"zannychat.callkit.nativeForServer.\\(serverCallId)\")\n}\n\nprivate func zannychatRemoveMapping(_ id: UUID, serverCallId: String?) {\n  let query: [String: Any] = [\n    kSecClass as String: kSecClassGenericPassword,\n    kSecAttrService as String: zannychatKeychainService,\n    kSecAttrAccount as String: id.uuidString,\n  ]\n  SecItemDelete(query as CFDictionary)\n  if let serverCallId {\n    UserDefaults.standard.removeObject(forKey: \"zannychat.callkit.nativeForServer.\\(serverCallId)\")\n  }\n}\n\nprivate func zannychatSendNativeEndEvent(serverCallId: String, token: String, reason: String, nativeId: UUID) {\n  guard let url = URL(string: ZANNYCHAT_BACKEND_URL.trimmingCharacters(in: CharacterSet(charactersIn: \"/\")) + \"/calls/native-event\"),\n    let body = try? JSONSerialization.data(withJSONObject: [\"callId\": serverCallId, \"token\": token, \"reason\": reason])\n  else { return }\n  var request = URLRequest(url: url)\n  request.httpMethod = \"POST\"\n  request.timeoutInterval = 4\n  request.setValue(\"application/json\", forHTTPHeaderField: \"Content-Type\")\n  request.httpBody = body\n  URLSession.shared.dataTask(with: request) { _, response, _ in\n    guard let http = response as? HTTPURLResponse else { return }\n    let permanentClientError = (400...499).contains(http.statusCode) && http.statusCode != 408 && http.statusCode != 429\n    if (200...299).contains(http.statusCode) || permanentClientError {\n      zannychatRemoveMapping(nativeId, serverCallId: serverCallId)\n    }\n  }.resume()\n}\n\nprivate func zannychatReasonString(_ reason: CXCallEndedReason) -> String {\n  switch reason {\n  case .failed: return \"failed\"\n  case .remoteEnded: return \"remoteEnded\"\n  case .unanswered: return \"unanswered\"\n  case .answeredElsewhere: return \"answeredElsewhere\"\n  case .declinedElsewhere: return \"declinedElsewhere\"\n  @unknown default: return \"unknown\"\n  }\n}\n";
      const classMarker = 'class CallManager: NSObject {';
      if (!manager.includes(classMarker)) throw new Error('withCallEndedReceiver: unsupported iOS CallManager class source');
      manager = manager.replace(classMarker, helpers.replace('__ZANNYCHAT_BACKEND_URL__', String(config.extra?.backendUrl || '').replace(/\\/$/, '')) + classMarker);
    }
    if (!manager.includes('func reportZannyChatNativeEnd(for id: UUID')) {
      const classMarker = 'class CallManager: NSObject {';
      const method = "\n  func reportZannyChatNativeEnd(for id: UUID, reason: String? = nil) async {\n    let session = await store.session(for: id)\n    let mapping = zannychatReadMapping(id)\n    let serverCallId = session?.incomingCallEvent?.serverCallId ?? mapping?[\"serverCallId\"]\n    let token = (session?.incomingCallEvent?.metadata?[\"serverEventToken\"] as? String) ?? mapping?[\"token\"]\n    let origin = session?.origin.rawValue ?? mapping?[\"origin\"]\n    guard let serverCallId, let token else { return }\n    let resolvedReason = reason ?? (origin == \"incoming\" ? \"declined\" : \"cancelled\")\n    zannychatSendNativeEndEvent(serverCallId: serverCallId, token: token, reason: resolvedReason, nativeId: id)\n  }\n\n";
      manager = manager.replace(classMarker, classMarker + method);
    }

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
      if (!section.includes('zannychatStoreMapping(id')) {
        const idLine = manager.indexOf('    let id = UUID()', start);
        if (idLine < 0 || (end >= 0 && idLine > end)) {
          throw new Error('withCallEndedReceiver: could not locate incoming CallKit UUID creation');
        }
        const afterId = idLine + '    let id = UUID()'.length;
        const injection = '\n    if let token = event.metadata?["serverEventToken"] as? String {\n      zannychatStoreMapping(id, serverCallId: event.serverCallId, token: token, origin: "incoming")\n    }\n    UserDefaults.standard.set(id.uuidString, forKey: "zannychat.callkit.nativeForServer.\\(event.serverCallId)")';
        manager = manager.slice(0, afterId) + injection + manager.slice(afterId);
      }
    }
    const reportSignature = 'func reportCallEnded(for id: UUID, reason: CXCallEndedReason) async {';
    if (!manager.includes('await reportZannyChatNativeEnd(for: id, reason: zannychatReasonString(reason))')) {
      const reportStart = manager.indexOf(reportSignature);
      const reportLog = manager.indexOf('    Log.call.debug("Reporting call ended - id: \\(id), reason: \\(reason.rawValue)")', reportStart);
      if (reportStart < 0 || reportLog < 0) throw new Error('withCallEndedReceiver: could not locate iOS call-end reporting method');
      const afterLog = reportLog + '    Log.call.debug("Reporting call ended - id: \\(id), reason: \\(reason.rawValue)")'.length;
      manager = manager.slice(0, afterLog) + '\n    await reportZannyChatNativeEnd(for: id, reason: zannychatReasonString(reason))' + manager.slice(afterLog);
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
    const localEndMarker = '    Task {\n      // Snapshot the session as ended so the embedded session reflects the terminal state.';
    if (!delegate.includes('await reportZannyChatNativeEnd(for: action.callUUID')) {
      if (!delegate.includes(localEndMarker)) throw new Error('withCallEndedReceiver: unsupported iOS end-call action source');
      delegate = delegate.replace(localEndMarker, '    Task {\n      let endSession = await store.session(for: action.callUUID)\n      let endReason = endSession?.status == .ringing ? (endSession?.origin == .incoming ? "declined" : "cancelled") : nil\n      await reportZannyChatNativeEnd(for: action.callUUID, reason: endReason)\n      // Snapshot the session as ended so the embedded session reflects the terminal state.');
    }
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
