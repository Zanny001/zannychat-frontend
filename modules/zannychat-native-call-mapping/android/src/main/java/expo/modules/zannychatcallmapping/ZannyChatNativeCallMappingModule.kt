package expo.modules.zannychatcallmapping

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

class ZannyChatNativeCallMappingModule : Module() {
  private fun preferences() =
    appContext.reactContext?.getSharedPreferences("zannychat_native_call_mapping", Context.MODE_PRIVATE)
      ?: throw IllegalStateException("Android context is unavailable")

  override fun definition() = ModuleDefinition {
    Name("ZannyChatNativeCallMapping")

    AsyncFunction("setCallMapping") { nativeCallId: String, serverCallId: String, token: String ->
      require(nativeCallId.isNotBlank() && nativeCallId.length <= 128) { "Invalid native call id" }
      require(serverCallId.matches(Regex("(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"))) { "Invalid server call id" }
      require(token.length in 40..256) { "Invalid native event token" }
      val value = JSONObject().put("serverCallId", serverCallId).put("token", token).toString()
      preferences().edit().putString(nativeCallId, value).commit()
    }

    AsyncFunction("getCallMapping") { nativeCallId: String ->
      val raw = preferences().getString(nativeCallId, null) ?: return@AsyncFunction null
      val value = JSONObject(raw)
      mapOf("serverCallId" to value.optString("serverCallId"), "token" to value.optString("token"))
    }

    AsyncFunction("clearCallMapping") { nativeCallId: String ->
      preferences().edit().remove(nativeCallId).commit()
    }
  }
}
