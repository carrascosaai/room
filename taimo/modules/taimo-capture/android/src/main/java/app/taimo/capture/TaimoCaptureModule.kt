package app.taimo.capture

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TaimoCaptureModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("TaimoCapture")

    /** Notificaciones de pago guardadas desde la última vez (JSON) y vacía la cola. */
    Function("drainPending") {
      PendingStore.drain(context)
    }

    /**
     * Lee el texto de una foto (un ticket) con ML Kit, en el propio móvil.
     * Devuelve cada línea con su posición (0..1) para juntar «producto … precio».
     */
    AsyncFunction("recognizeText") { uri: String, promise: Promise ->
      val image = try {
        InputImage.fromFilePath(context, Uri.parse(uri))
      } catch (e: Exception) {
        promise.reject("ERR_IMAGE", e.message ?: "No se pudo abrir la imagen", e)
        return@AsyncFunction
      }
      val width = image.width.toFloat().coerceAtLeast(1f)
      val height = image.height.toFloat().coerceAtLeast(1f)
      TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        .process(image)
        .addOnSuccessListener { result ->
          val lines = result.textBlocks.flatMap { it.lines }.mapNotNull { line ->
            val box = line.boundingBox ?: return@mapNotNull null
            mapOf(
              "text" to line.text,
              "x" to box.left / width,
              "y" to box.top / height,
              "w" to box.width() / width,
              "h" to box.height() / height,
            )
          }
          promise.resolve(lines)
        }
        .addOnFailureListener { e -> promise.reject("ERR_OCR", e.message ?: "No se pudo leer el texto", e) }
    }

    Function("setIgnoredApps") { apps: List<String> ->
      PendingStore.setIgnoredApps(context, apps)
    }

    /** Para la pantalla «¿Funciona?»: último aviso recibido y si el modo comprobación está encendido. */
    Function("captureStatus") {
      PendingStore.status(context)
    }

    Function("setDiagnostics") { on: Boolean ->
      PendingStore.setDiagnostics(context, on)
    }

    Function("missedNotices") {
      PendingStore.missed(context)
    }

    Function("clearMissed") {
      PendingStore.clearMissed(context)
    }

    /** Un aviso que el lector guardó pero la app no supo leer: a la lista de no apuntados. */
    Function("reportMissed") { json: String ->
      if (PendingStore.diagnostics(context)) PendingStore.addMissed(context, org.json.JSONObject(json))
    }

    /** Ajustes de Taimo en el móvil (batería «Sin restricciones» en Samsung, Xiaomi…). */
    Function("openAppSettings") {
      if (!tryStart(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")))) {
        tryStart(Intent(Settings.ACTION_SETTINGS))
      }
      Unit
    }

    /**
     * De dónde se instaló Taimo: "play" (Google Play), "sideload" (APK por WhatsApp,
     * navegador… → en Android 13+ el permiso sale como «ajuste restringido») o "unknown".
     */
    Function("installSource") {
      try {
        val pm = context.packageManager
        val installer = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
          pm.getInstallSourceInfo(context.packageName).installingPackageName
        } else {
          @Suppress("DEPRECATION") pm.getInstallerPackageName(context.packageName)
        }
        when (installer) {
          "com.android.vending", "com.google.android.feedback" -> "play"
          null -> "sideload"
          else -> if (installer.contains("packageinstaller")) "sideload" else "store"
        }
      } catch (_: Throwable) {
        "unknown"
      }
    }

    /**
     * Samsung, Xiaomi… a veces desconectan el lector (sobre todo tras actualizar la app).
     * Con permiso dado, se le pide a Android que lo vuelva a conectar; si ya lo está, no pasa nada.
     */
    Function("rebindListener") {
      try {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N &&
          NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
        ) {
          android.service.notification.NotificationListenerService.requestRebind(
            android.content.ComponentName(context, TaimoNotificationListener::class.java)
          )
        }
      } catch (_: Throwable) {
        // Algunos fabricantes no lo permiten: no pasa nada.
      }
      Unit
    }

    Function("hasNotificationAccess") {
      try {
        NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
      } catch (_: Throwable) {
        false
      }
    }

    /** Va directo al interruptor de Taimo (Android 11+); si el móvil no lo tiene, a la lista. */
    Function("openNotificationAccessSettings") {
      val direct = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R && tryStart(
        Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).putExtra(
          Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
          android.content.ComponentName(context, TaimoNotificationListener::class.java).flattenToString(),
        )
      )
      if (!direct && !tryStart(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))) {
        tryStart(Intent(Settings.ACTION_SETTINGS))
      }
      Unit
    }
  }

  /** Abre una pantalla de Ajustes sin poder cerrar la app si el fabricante no la tiene. */
  private fun tryStart(intent: Intent): Boolean = try {
    context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    true
  } catch (_: Throwable) {
    false
  }
}
