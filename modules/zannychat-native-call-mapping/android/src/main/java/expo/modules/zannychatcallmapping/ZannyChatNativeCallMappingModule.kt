package expo.modules.zannychatcallmapping

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

private const val PENDING_CALL_MAPPING_KEY = "pending_outgoing_call"

class ZannyChatNativeCallMappingModule : Module() {
  private fun preferences() =
    appContext.reactContext?.getSharedPreferences("zannychat_native_call_mapping", Context.MODE_PRIVATE)
      ?: throw IllegalStateException("Android context is unavailable")

  private fun validateCredential(serverCallId: String, token: String) {
    require(serverCallId.matches(Regex("(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"))) { "Invalid server call id" }
    require(token.length in 40..256) { "Invalid native event token" }
  }

  override fun definition() = ModuleDefinition {
    Name("ZannyChatNativeCallMapping")

    // Persist before Telecom creates the native session. If Android kills the
    // JS process before startOutgoingCall returns its generated UUID, the
    // receiver can still reconcile the outgoingApp session from this record.
    AsyncFunction("setPendingCallMapping") { serverCallId: String, token: String ->
      validateCredential(serverCallId, token)
      val value = JSONObject().put("serverCallId", serverCallId).put("token", token).toString()
      preferences().edit().putString(PENDING_CALL_MAPPING_KEY, NativeCallMappingCrypto.encrypt(value)).commit()
    }

    // Atomically move the pending ciphertext to the OS-generated session UUID.
    AsyncFunction("bindPendingCallMapping") { nativeCallId: String ->
      require(nativeCallId.isNotBlank() && nativeCallId.length <= 128) { "Invalid native call id" }
      val prefs = preferences()
      val raw = prefs.getString(PENDING_CALL_MAPPING_KEY, null) ?: return@AsyncFunction false
      prefs.edit().putString(nativeCallId, raw).remove(PENDING_CALL_MAPPING_KEY).commit()
    }

    AsyncFunction("setCallMapping") { nativeCallId: String, serverCallId: String, token: String ->
      require(nativeCallId.isNotBlank() && nativeCallId.length <= 128) { "Invalid native call id" }
      validateCredential(serverCallId, token)
      val value = JSONObject().put("serverCallId", serverCallId).put("token", token).toString()
      preferences().edit().putString(nativeCallId, NativeCallMappingCrypto.encrypt(value)).commit()
    }

    AsyncFunction("getCallMapping") { nativeCallId: String ->
      val raw = preferences().getString(nativeCallId, null) ?: return@AsyncFunction null
      val value = JSONObject(NativeCallMappingCrypto.decrypt(raw))
      mapOf("serverCallId" to value.optString("serverCallId"), "token" to value.optString("token"))
    }

    AsyncFunction("clearCallMapping") { nativeCallId: String ->
      preferences().edit().remove(nativeCallId).commit()
    }
  }
}
