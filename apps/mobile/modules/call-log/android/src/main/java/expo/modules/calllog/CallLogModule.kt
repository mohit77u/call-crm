package expo.modules.calllog

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.provider.CallLog
import android.telephony.SubscriptionManager
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

    AsyncFunction("listSims") {
      val context = appContext.reactContext ?: throw CodedException("React context is not available")
      val sm = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
        ?: return@AsyncFunction emptyList<Map<String, Any?>>()
      val infos = sm.activeSubscriptionInfoList ?: emptyList()
      val slotCount = sm.activeSubscriptionInfoCountMax.coerceAtLeast(infos.size).coerceAtMost(2)
      mapOf(
        "sims" to infos.map { info ->
          mapOf(
            "id" to info.subscriptionId,
            "iccId" to info.iccId,
            "label" to (info.carrierName ?: info.displayName)?.toString(),
            "number" to info.number,
            "slotIndex" to info.simSlotIndex,
          )
        },
        "slotCount" to slotCount,
      )
    }

    AsyncFunction("getLastLocation") {
      val context = appContext.reactContext ?: throw CodedException("React context is not available")
      val lm = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        ?: return@AsyncFunction null
      var best: Location? = null
      for (provider in lm.getProviders(true)) {
        val loc = try {
          lm.getLastKnownLocation(provider)
        } catch (e: SecurityException) {
          null
        } ?: continue
        if (best == null || loc.time > best!!.time || (loc.time == best!!.time && loc.accuracy < best!!.accuracy)) {
          best = loc
        }
      }
      best?.let {
        mapOf(
          "lat" to it.latitude,
          "lng" to it.longitude,
          "accuracy" to it.accuracy,
          "time" to it.time,
        )
      }
    }

    AsyncFunction("getCallsSince") { sinceMs: Double, limit: Int, phoneAccountId: String?, iccId: String? ->
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
      // PHONE_ACCOUNT_ID stores the ICCID on some devices and the subscription
      // id on others — match either so SIM filtering works everywhere.
      val selection = when {
        phoneAccountId != null && iccId != null ->
          "${CallLog.Calls.DATE} > ? AND ${CallLog.Calls.PHONE_ACCOUNT_ID} IN (?, ?)"
        phoneAccountId != null ->
          "${CallLog.Calls.DATE} > ? AND ${CallLog.Calls.PHONE_ACCOUNT_ID} = ?"
        else -> "${CallLog.Calls.DATE} > ?"
      }
      val selectionArgs = when {
        phoneAccountId != null && iccId != null ->
          arrayOf(sinceMs.toLong().toString(), phoneAccountId, iccId)
        phoneAccountId != null -> arrayOf(sinceMs.toLong().toString(), phoneAccountId)
        else -> arrayOf(sinceMs.toLong().toString())
      }
      val calls = mutableListOf<Map<String, Any?>>()
      context.contentResolver.query(
        CallLog.Calls.CONTENT_URI,
        projection,
        selection,
        selectionArgs,
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
