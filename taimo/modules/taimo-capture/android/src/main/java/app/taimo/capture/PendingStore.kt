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
    val current = JSONArray(prefs.getString(KEY, "[]"))
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
    val array = JSONArray(raw)
    return (0 until array.length()).map { array.getString(it) }.toSet()
  }

  fun setIgnoredApps(context: Context, apps: List<String>) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(IGNORED, JSONArray(apps).toString()).apply()
  }
}
