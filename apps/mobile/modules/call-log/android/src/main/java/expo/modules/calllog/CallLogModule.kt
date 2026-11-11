package expo.modules.calllog

import android.Manifest
import android.content.pm.PackageManager
import android.provider.CallLog
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CallLogPermissionException : CodedException("READ_CALL_LOG permission is not granted")

class CallLogModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CallLog")

    Function("hasPermission") {
      hasPermission()
    }

    AsyncFunction("getCallsSince") { sinceMs: Double, limit: Int ->
      if (!hasPermission()) throw CallLogPermissionException()
      val context = appContext.reactContext ?: throw CodedException("React context is not available")
      val projection = arrayOf(
        CallLog.Calls._ID,
        CallLog.Calls.NUMBER,
        CallLog.Calls.CACHED_NAME,
        CallLog.Calls.TYPE,
        CallLog.Calls.DATE,
        CallLog.Calls.DURATION,
        CallLog.Calls.PHONE_ACCOUNT_ID,
      )
      val calls = mutableListOf<Map<String, Any?>>()
      context.contentResolver.query(
        CallLog.Calls.CONTENT_URI,
        projection,
        "${CallLog.Calls.DATE} > ?",
        arrayOf(sinceMs.toLong().toString()),
        "${CallLog.Calls.DATE} ASC",
      )?.use { cursor ->
        val idIdx = cursor.getColumnIndexOrThrow(CallLog.Calls._ID)
        val numberIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER)
        val nameIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME)
        val typeIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE)
        val dateIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.DATE)
        val durationIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.DURATION)
        val simIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.PHONE_ACCOUNT_ID)
        while (cursor.moveToNext() && calls.size < limit) {
          calls.add(
            mapOf(
              "id" to cursor.getLong(idIdx).toString(),
              "number" to (cursor.getString(numberIdx) ?: ""),
              "name" to cursor.getString(nameIdx),
              "type" to typeName(cursor.getInt(typeIdx)),
              "timestamp" to cursor.getLong(dateIdx).toDouble(),
              "durationSec" to cursor.getLong(durationIdx).toInt(),
              "sim" to cursor.getString(simIdx),
            )
          )
        }
      }
      calls
    }
  }

  private fun hasPermission(): Boolean {
    val context = appContext.reactContext ?: return false
    return context.checkSelfPermission(Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED
  }

  private fun typeName(type: Int) = when (type) {
    CallLog.Calls.INCOMING_TYPE, CallLog.Calls.ANSWERED_EXTERNALLY_TYPE -> "incoming"
    CallLog.Calls.OUTGOING_TYPE -> "outgoing"
    CallLog.Calls.MISSED_TYPE -> "missed"
    CallLog.Calls.VOICEMAIL_TYPE -> "voicemail"
    CallLog.Calls.REJECTED_TYPE -> "rejected"
    CallLog.Calls.BLOCKED_TYPE -> "blocked"
    else -> "unknown"
  }
}
