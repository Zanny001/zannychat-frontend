package com.example.zannychat

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import org.json.JSONObject
import expo.modules.zannychatcallmapping.NativeCallMappingCrypto
import java.net.HttpURLConnection
import java.net.URL

private const val BACKEND_URL = "__ZANNYCHAT_BACKEND_URL__"

class CallEndedReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "ZannyChatCallEnded"
        private val SUPPORTED_EVENTS = setOf("onCallEnded", "onCallReportedEnded")
    }

    override fun onReceive(context: Context, intent: Intent) {
        val eventName = intent.getStringExtra("eventName") ?: return
        if (eventName !in SUPPORTED_EVENTS) return

        val payload = intent.getStringExtra("payload")?.let {
            try { JSONObject(it) } catch (_: Exception) { null }
        } ?: return
        val session = payload.optJSONObject("session") ?: return
        val nativeCallId = session.optString("id", "")
        val incomingCall = session.optJSONObject("incomingCallEvent")
        val incomingMetadata = incomingCall?.optJSONObject("metadata")
        // Incoming sessions carry their signed metadata in the VoIP payload.
        // Outgoing sessions have no incomingCallEvent, so resolve their
        // call-scoped credential from app-private SharedPreferences. This
        // remains available to this receiver when the JS runtime is killed.
        val outgoingMapping = if (incomingCall == null
            && session.optString("origin") == "outgoingApp"
            && nativeCallId.isNotBlank()) {
            val prefs = context.getSharedPreferences("zannychat_native_call_mapping", Context.MODE_PRIVATE)
            val encrypted = prefs.getString(nativeCallId, null)
                ?: prefs.getString("pending_outgoing_call", null)
            encrypted?.let {
                try { JSONObject(NativeCallMappingCrypto.decrypt(it)) } catch (_: Exception) { null }
            }
        } else null
        val callId = incomingCall?.optString("serverCallId", "")
            ?: outgoingMapping?.optString("serverCallId", "")
            ?: ""
        val eventToken = incomingMetadata?.optString("serverEventToken", "")
            ?: outgoingMapping?.optString("token", "")
            ?: ""
        // onCallReportedEnded carries the native terminal reason (notably
        // "unanswered"). onCallEnded may omit it; the backend treats that
        // event as a local decline rather than guessing it was missed.
        val reason = payload.optString("reason", "").ifBlank {
            payload.optString("endReason", "")
        }
        if (callId.isBlank() || eventToken.isBlank()) {
            Log.w(TAG, "Native call event missing server reconciliation metadata")
            return
        }

        val pending = goAsync()
        Thread {
            var connection: HttpURLConnection? = null
            try {
                val endpoint = BACKEND_URL.trimEnd('/') + "/calls/native-event"
                connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 5000
                    readTimeout = 5000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                }
                val body = JSONObject()
                    .put("callId", callId)
                    .put("token", eventToken)
                    .put("reason", reason)
                    .toString()
                connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                val responseCode = connection?.responseCode ?: -1
                Log.i(TAG, "Native call reconciliation returned HTTP $responseCode")
                if (responseCode in 200..299 && nativeCallId.isNotBlank() && outgoingMapping != null) {
                    context.getSharedPreferences("zannychat_native_call_mapping", Context.MODE_PRIVATE)
                        .edit().remove(nativeCallId).remove("pending_outgoing_call").apply()
                }
            } catch (error: Exception) {
                Log.w(TAG, "Native call reconciliation failed: ${error.message}")
            } finally {
                connection?.disconnect()
                pending.finish()
            }
        }.start()
    }
}
