package app.taimo.capture

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Las mismas reglas que usa la app en src/domain/notifications.ts, leídas de
 * assets/taimo_payment_rules.json: bancos y carteras conocidos, palabras de
 * pago en ~25 idiomas y todas las monedas del mundo. Aquí solo se decide si un
 * aviso es un pago (para guardarlo y avisar); la app lo interpreta al abrirse.
 */
class PaymentRules private constructor(json: JSONObject) {
  private val apps: Set<String> = json.getJSONObject("apps").keys().asSequence().toSet()
  private val wallets: Set<String> = json.getJSONArray("wallets").strings().toSet()
  private val deny: Set<String> = json.getJSONArray("deny").strings().toSet()
  private val purchase = Regex(json.getString("purchase"), RegexOption.IGNORE_CASE)
  private val notPurchase = Regex(json.getString("notPurchase"), RegexOption.IGNORE_CASE)
  private val cardHint = Regex(json.getString("cardHint"), RegexOption.IGNORE_CASE)
  private val balanceBefore = Regex("(${json.getString("balance")})[^\\d]{0,25}$", RegexOption.IGNORE_CASE)
  private val money: List<Regex>

  init {
    val symbols = json.getJSONArray("symbols")
    val tokens = (0 until symbols.length()).map { symbols.getJSONArray(it).getString(0) } +
      json.getJSONArray("codes").strings() +
      listOf("euros", "euro", "eur", "dólares", "dollars", "kronor", "kroner")
    val token = tokens.sortedByDescending { it.length }.joinToString("|") { Regex.escape(it) }
    val num = "(?:\\d{1,2}(?:,\\d{2})+,\\d{3}|\\d{1,3}(?:[ \\u00a0\\u202f.,'’]\\d{3})+|\\d+)(?:[.,]\\d{1,2})?(?:[.,]-)?"
    money = listOf(Regex("(?:$token)\\s?-?\\s?$num"), Regex("-?$num\\s?(?:$token)"))
  }

  /** El importe tal cual aparece ("¥3,000", "12,40 €") si el aviso es un pago; si no, null. */
  fun match(pkg: String, ignored: Set<String>, title: String, text: String): String? {
    if (pkg in deny || pkg in ignored) return null
    val full = "$title\n$text"
    if (notPurchase.containsMatchIn(full)) return null
    val amount = findAmount(full) ?: return null
    val isPayment = if (pkg in apps) {
      pkg in wallets || purchase.containsMatchIn(full)
    } else {
      // Cualquier otra app (también los SMS del banco): palabra de pago + pista de tarjeta o cuenta.
      purchase.containsMatchIn(full) && cardHint.containsMatchIn(full)
    }
    return if (isPayment) amount else null
  }

  /**
   * Para la pantalla «¿Funciona?»: un aviso con importe que no se ha apuntado
   * (de una app que no está en la lista negra). Sirve para ver qué banco falla.
   */
  fun looksLikeMoney(pkg: String, ignored: Set<String>, title: String, text: String): Boolean =
    pkg !in deny && pkg !in ignored && findAmount("$title\n$text") != null

  private fun findAmount(full: String): String? {
    val candidates = money.flatMap { it.findAll(full).toList() }.sortedBy { it.range.first }
    for (m in candidates) {
      val start = m.range.first
      val end = m.range.last + 1
      if (start > 0 && (full[start - 1].isDigit() || (m.value.first().isLetter() && full[start - 1].isLetter()))) continue
      if (end < full.length && m.value.last().isLetter() && full[end].isLetter()) continue
      if (start > 0 && full[start - 1] in "*xX•·") continue
      if (balanceBefore.containsMatchIn(full.substring(maxOf(0, start - 40), start))) continue
      return m.value.trim()
    }
    return null
  }

  companion object {
    @Volatile private var instance: PaymentRules? = null

    fun get(context: Context): PaymentRules =
      instance ?: synchronized(this) {
        instance ?: PaymentRules(
          JSONObject(context.assets.open("taimo_payment_rules.json").bufferedReader().use { it.readText() }),
        ).also { instance = it }
      }

    private fun JSONArray.strings(): List<String> = (0 until length()).map { getString(it) }
  }
}
