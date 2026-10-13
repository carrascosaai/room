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

  /** Aviso propio: "⚡ 12,40 € apuntados en Taimo". */
  private fun notifyCaptured(amount: String) {
    val manager = getSystemService(NotificationManager::class.java) ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Pagos apuntados", NotificationManager.IMPORTANCE_DEFAULT)
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
      .setContentTitle("⚡ $amount apuntados en Taimo")
      .setContentText("Toca para ver cuánto te queda este mes")
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
