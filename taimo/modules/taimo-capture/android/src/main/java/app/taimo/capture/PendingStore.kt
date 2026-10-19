package app.taimo.capture

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** Cola de notificaciones de pago pendientes de convertir en gastos (se vacía al abrir la app). */
object PendingStore {
  private const val PREFS = "taimo.capture"
  private const val KEY = "pending"
  private const val MAX_ITEMS = 200
  private const val IGNORED = "ignored"

  @Synchronized
  fun append(context: Context, item: JSONObject) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val current = safeArray(prefs.getString(KEY, "[]"))
    current.put(item)
    // Si nadie abre la app en mucho tiempo, guardamos solo los últimos.
    val trimmed = JSONArray()
    val start = maxOf(0, current.length() - MAX_ITEMS)
    for (i in start until current.length()) trimmed.put(current.get(i))
    prefs.edit().putString(KEY, trimmed.toString()).apply()
  }

  @Synchronized
  fun drain(context: Context): String {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val value = prefs.getString(KEY, "[]") ?: "[]"
    prefs.edit().remove(KEY).apply()
    return value
  }

  /** Apps cuyos avisos de pago el usuario ha pedido ignorar (la app las manda con setIgnoredApps). */
  fun ignoredApps(context: Context): Set<String> {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(IGNORED, "[]") ?: "[]"
    val array = safeArray(raw)
    return (0 until array.length()).mapNotNull { array.optString(it, null) }.toSet()
  }

  fun setIgnoredApps(context: Context, apps: List<String>) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(IGNORED, JSONArray(apps).toString()).apply()
  }

  private const val SEEN_AT = "seenAt"
  private const val SEEN_COUNT = "seenCount"
  private const val MISSED = "missed"
  private const val DIAGNOSTICS = "diagnostics"
  private const val MAX_MISSED = 15

  /** Hora del último aviso que ha llegado (de cualquier app; no se guarda nada más). */
  fun markSeen(context: Context, time: Long) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    prefs.edit().putLong(SEEN_AT, time).putInt(SEEN_COUNT, prefs.getInt(SEEN_COUNT, 0) + 1).apply()
  }

  fun status(context: Context): String {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    return JSONObject().apply {
      put("seenAt", prefs.getLong(SEEN_AT, 0))
      put("seenCount", prefs.getInt(SEEN_COUNT, 0))
      put("diagnostics", prefs.getBoolean(DIAGNOSTICS, false))
    }.toString()
  }

  fun diagnostics(context: Context): Boolean =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(DIAGNOSTICS, false)

  /** Al apagar el modo comprobación se borra lo guardado. */
  fun setDiagnostics(context: Context, on: Boolean) {
    val edit = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(DIAGNOSTICS, on)
    if (!on) edit.remove(MISSED)
    edit.apply()
  }

  /** Avisos con importe que no se han apuntado (solo los últimos, solo en el móvil). */
  @Synchronized
  fun addMissed(context: Context, item: JSONObject) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val current = safeArray(prefs.getString(MISSED, "[]"))
    current.put(item)
    val trimmed = JSONArray()
    for (i in maxOf(0, current.length() - MAX_MISSED) until current.length()) trimmed.put(current.get(i))
    prefs.edit().putString(MISSED, trimmed.toString()).apply()
  }

  fun missed(context: Context): String =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(MISSED, "[]") ?: "[]"

  fun clearMissed(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(MISSED).apply()
  }

  /** Lo guardado nunca debería estar roto, pero si lo está se empieza de cero en vez de fallar. */
  private fun safeArray(raw: String?): JSONArray = try {
    JSONArray(raw ?: "[]")
  } catch (_: Throwable) {
    JSONArray()
  }
}
