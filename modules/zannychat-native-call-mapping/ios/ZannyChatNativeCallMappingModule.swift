import ExpoModulesCore
import Foundation
import Security

public final class ZannyChatNativeCallMappingModule: Module {
  private static let service = "com.zannychat.native-call-mapping"
  private static let pendingKey = "pending_outgoing_call"

  public func definition() -> ModuleDefinition {
    Name("ZannyChatNativeCallMapping")

    AsyncFunction("setPendingCallMapping") { (serverCallId: String, token: String) -> Bool in
      try Self.validate(serverCallId: serverCallId, token: token)
      return Self.store(Self.encode(serverCallId: serverCallId, token: token), key: Self.pendingKey)
    }

    AsyncFunction("bindPendingCallMapping") { (nativeCallId: String) -> Bool in
      guard !nativeCallId.isEmpty, nativeCallId.count <= 128 else { return false }
      let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: Self.service,
        kSecAttrAccount as String: Self.pendingKey,
      ]
      let attributes: [String: Any] = [kSecAttrAccount as String: nativeCallId]
      return SecItemUpdate(query as CFDictionary, attributes as CFDictionary) == errSecSuccess
    }

    AsyncFunction("clearPendingCallMapping") {
      Self.remove(key: Self.pendingKey)
    }

    AsyncFunction("setCallMapping") { (nativeCallId: String, serverCallId: String, token: String) -> Bool in
      guard !nativeCallId.isEmpty, nativeCallId.count <= 128 else { return false }
      try Self.validate(serverCallId: serverCallId, token: token)
      return Self.store(Self.encode(serverCallId: serverCallId, token: token), key: nativeCallId)
    }

    AsyncFunction("getCallMapping") { (nativeCallId: String) -> [String: String]? in
      guard let data = Self.read(key: nativeCallId),
            let value = try? JSONSerialization.jsonObject(with: data) as? [String: String]
      else { return nil }
      return value
    }

    AsyncFunction("clearCallMapping") { (nativeCallId: String) -> Bool in
      Self.remove(key: nativeCallId)
    }
  }

  private static func validate(serverCallId: String, token: String) throws {
    guard UUID(uuidString: serverCallId) != nil else {
      throw NSError(domain: "ZannyChatNativeCallMapping", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid server call id"])
    }
    guard (40...256).contains(token.count) else {
      throw NSError(domain: "ZannyChatNativeCallMapping", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid native event token"])
    }
  }

  private static func encode(serverCallId: String, token: String) -> Data {
    (try? JSONSerialization.data(withJSONObject: ["serverCallId": serverCallId, "token": token])) ?? Data()
  }

  private static func store(_ data: Data, key: String) -> Bool {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: key,
    ]
    let attributes: [String: Any] = [
      kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
    ]
    let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
    if updateStatus == errSecSuccess { return true }
    guard updateStatus == errSecItemNotFound else { return false }
    var addQuery = query
    attributes.forEach { addQuery[$0.key] = $0.value }
    return SecItemAdd(addQuery as CFDictionary, nil) == errSecSuccess
  }

  private static func read(key: String) -> Data? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: key,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var result: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess else { return nil }
    return result as? Data
  }

  @discardableResult
  private static func remove(key: String) -> Bool {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: key,
    ]
    let status = SecItemDelete(query as CFDictionary)
    return status == errSecSuccess || status == errSecItemNotFound
  }
}
