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
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.getStringExtra("eventName") != "onCallEnded") return
        val payload = intent.getStringExtra("payload")?.let {
            try { JSONObject(it) } catch (_: Exception) { null }
        } ?: return
        val session = payload.optJSONObject("session") ?: return
        val incomingCall = session.optJSONObject("incomingCallEvent") ?: return
        val callId = incomingCall.optString("serverCallId", "")
        val metadata = incomingCall.optJSONObject("metadata")
        val eventToken = metadata?.optString("serverEventToken", "") ?: ""
        if (callId.isBlank() || eventToken.isBlank()) {
            Log.w(TAG, "Call ended without a server reconciliation token")
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
                    .toString()
                connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                Log.i(TAG, "Native call-end reconciliation returned HTTP ${connection?.responseCode}")
            } catch (error: Exception) {
                Log.w(TAG, "Native call-end reconciliation failed: ${error.message}")
            } finally {
                connection?.disconnect()
                pending.finish()
            }
        }.start()
    }
}
