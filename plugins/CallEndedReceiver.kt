package com.example.zannychat

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import org.json.JSONObject
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
        val incomingCall = session.optJSONObject("incomingCallEvent") ?: return
        val callId = incomingCall.optString("serverCallId", "")
        val metadata = incomingCall.optJSONObject("metadata")
        val eventToken = metadata?.optString("serverEventToken", "") ?: ""
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
                Log.i(TAG, "Native call reconciliation returned HTTP ${connection?.responseCode}")
            } catch (error: Exception) {
                Log.w(TAG, "Native call reconciliation failed: ${error.message}")
            } finally {
                connection?.disconnect()
                pending.finish()
            }
        }.start()
    }
}
