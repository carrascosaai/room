package app.taimo.capture

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Escucha las notificaciones de Google Wallet y de los bancos de la lista.
 * Solo guarda (en el móvil) las que llevan un importe en euros; la app las
 * interpreta al abrirse (src/domain/notifications.ts). El resto se ignora.
 */
class TaimoNotificationListener : NotificationListenerService() {
  companion object {
    // Mantener igual que PAYMENT_APPS en src/domain/notifications.ts.
    val PAYMENT_APPS = setOf(
      "com.google.android.apps.walletnfcrel",
      "com.samsung.android.spay",
      "com.revolut.revolut",
      "de.number26.android",
      "com.bbva.bbvacontigo",
      "es.bancosantander.apps",
      "es.lacaixa.mobile.android.newwapicon",
      "com.imaginbank.app",
      "es.ingdirect.android",
      "com.openbank.app",
      "net.inverline.bancosabadell.officelocator.android",
      "es.bankinter.bankingapp",
    )
    private val AMOUNT = Regex("(€\\s?-?\\d[\\d.,]*|-?\\d[\\d.,]*\\s?(€|eur\\b|euros?\\b))", RegexOption.IGNORE_CASE)
    private const val CHANNEL_ID = "taimo_captures"
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (sbn.packageName !in PAYMENT_APPS) return
    val extras = sbn.notification?.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
    val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
      ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString() ?: ""
    val amount = AMOUNT.find("$title $text")?.value ?: return

    val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
      timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date(sbn.postTime))
    PendingStore.append(this, JSONObject().apply {
      put("package", sbn.packageName)
      put("title", title)
      put("text", text)
      put("postedAt", iso)
    })
    notifyCaptured(amount.trim())
  }

  /** Textos del aviso según el idioma del móvil (los de la app se traducen en JavaScript). */
  private fun strings(): Pair<String, String> = when (java.util.Locale.getDefault().language) {
    "es" -> "apuntados en Taimo" to "Toca para ver cuánto te queda este mes"
    "ca" -> "apuntats a Taimo" to "Toca per veure quant et queda aquest mes"
    "fr" -> "enregistrés dans Taimo" to "Touchez pour voir ce qu’il vous reste ce mois-ci"
    "de" -> "in Taimo erfasst" to "Tippe, um zu sehen, was diesen Monat übrig ist"
    "it" -> "registrati in Taimo" to "Tocca per vedere quanto ti resta questo mese"
    "pt" -> "registados no Taimo" to "Toca para ver quanto te resta este mês"
    "nl" -> "genoteerd in Taimo" to "Tik om te zien wat je deze maand over hebt"
    "sv" -> "bokfört i Taimo" to "Tryck för att se vad du har kvar den här månaden"
    "nb", "no", "nn" -> "ført i Taimo" to "Trykk for å se hva du har igjen denne måneden"
    "da" -> "noteret i Taimo" to "Tryk for at se, hvad du har tilbage denne måned"
    "fi" -> "kirjattu Taimoon" to "Napauta nähdäksesi, paljonko tässä kuussa on jäljellä"
    "pl" -> "zapisano w Taimo" to "Dotknij, żeby zobaczyć, ile zostało w tym miesiącu"
    else -> "logged in Taimo" to "Tap to see what you have left this month"
  }

  /** Aviso propio: "⚡ 12,40 € apuntados en Taimo". */
  private fun notifyCaptured(amount: String) {
    val (titleSuffix, body) = strings()
    val manager = getSystemService(NotificationManager::class.java) ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Taimo", NotificationManager.IMPORTANCE_DEFAULT)
      )
    }
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val pending = launch?.let {
      android.app.PendingIntent.getActivity(
        this, 0, it, android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
      )
    }
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("⚡ $amount $titleSuffix")
      .setContentText(body)
      .setContentIntent(pending)
      .setAutoCancel(true)
      .build()
    try {
      manager.notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), notification)
    } catch (_: SecurityException) {
      // Sin permiso de notificaciones: el pago queda apuntado igualmente.
    }
  }
}
