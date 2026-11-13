package expo.modules.calllog

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.provider.CallLog
import android.os.Build
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
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
      // CallLog.Calls.PHONE_ACCOUNT_ID stores the telecom phone-account id, which
      // is the subscription id on most devices but the ICCID (or another value)
      // on some OEM builds — collect every identifier that maps to each SIM.
      val phoneAccounts: List<PhoneAccountHandle> = try {
        val tm = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
        tm?.callCapablePhoneAccounts ?: emptyList()
      } catch (e: Exception) {
        emptyList()
      }
      mapOf(
        "sims" to infos.map { info ->
          // SubscriptionInfo.getIccId() is hidden on Android 10+ unless the app
          // has carrier privileges — on devices like Xiaomi it returns null even
          // though the call log stores the ICCID in PHONE_ACCOUNT_ID. Fall back
          // to TelephonyManager.getSimSerialNumber(), which only needs
          // READ_PHONE_STATE.
          val iccId = info.iccId?.takeIf { it.isNotBlank() } ?: simIccId(context, info.subscriptionId)
          val accountIds = phoneAccounts
            .filter { it.id == info.subscriptionId.toString() || (iccId != null && it.id == iccId) }
            .map { it.id }
          mapOf(
            "id" to info.subscriptionId,
            "iccId" to iccId,
            "label" to (info.carrierName ?: info.displayName)?.toString(),
            "number" to info.number,
            "slotIndex" to info.simSlotIndex,
            "accountIds" to accountIds,
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

    // Returns every call after sinceMs — SIM attribution is done in JS because
    // PHONE_ACCOUNT_ID is unreliable across OEMs (null, ICCID, subscription id,
    // or phone-account id depending on the device).
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
      val selection = "${CallLog.Calls.DATE} > ?"
      val selectionArgs = arrayOf(sinceMs.toLong().toString())
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

  private fun simIccId(context: Context, subId: Int): String? {
    return try {
      val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager ?: return null
      val tel = if (Build.VERSION.SDK_INT >= 29 && subId >= 0) tm.createForSubscriptionId(subId) else tm
      tel.simSerialNumber?.takeIf { it.isNotBlank() }
    } catch (e: Exception) {
      null
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
