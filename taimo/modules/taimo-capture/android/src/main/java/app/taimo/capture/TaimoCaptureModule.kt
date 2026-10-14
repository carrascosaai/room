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

    Function("hasNotificationAccess") {
      NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
    }

    Function("openNotificationAccessSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
      Unit
    }
  }
}
