import ExpoModulesCore
import UIKit
import Vision
import WidgetKit

/// Puente con JavaScript. El App Intent (en el target de la app, ver
/// native/ios/TaimoCaptureIntent.swift) deja los pagos en una cola de
/// UserDefaults; la app la vacía al abrirse y los convierte en gastos.
public class TaimoCaptureModule: Module {
  static let pendingKey = "taimo.pendingCaptures"

  public func definition() -> ModuleDefinition {
    Name("TaimoCapture")

    /// Devuelve las capturas pendientes como JSON (array) y vacía la cola.
    Function("drainPending") { () -> String in
      let defaults = UserDefaults.standard
      let items = defaults.array(forKey: Self.pendingKey) as? [[String: String]] ?? []
      defaults.removeObject(forKey: Self.pendingKey)
      let data = (try? JSONSerialization.data(withJSONObject: items)) ?? Data("[]".utf8)
      return String(data: data, encoding: .utf8) ?? "[]"
    }

    /// En iOS no hace falta permiso de notificaciones de otras apps.
    Function("hasNotificationAccess") { () -> Bool in
      return false
    }

    Function("openNotificationAccessSettings") { () -> Void in
    }

    /// Lee el texto de una foto (un ticket) con Vision, en el propio iPhone.
    /// Devuelve cada línea con su posición (0..1, desde arriba a la izquierda)
    /// para que JavaScript pueda juntar «producto … precio» en la misma fila.
    AsyncFunction("recognizeText") { (uri: String) -> [[String: Any]] in
      let path = uri.hasPrefix("file://") ? String(uri.dropFirst(7)) : uri
      guard let image = UIImage(contentsOfFile: path.removingPercentEncoding ?? path)?.cgImage else { return [] }
      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true
      request.automaticallyDetectsLanguage = true
      try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
      return (request.results ?? []).compactMap { obs -> [String: Any]? in
        guard let text = obs.topCandidates(1).first?.string else { return nil }
        let box = obs.boundingBox  // origen abajo a la izquierda
        return ["text": text, "x": box.minX, "y": 1 - box.maxY, "w": box.width, "h": box.height]
      }
    }

    /// Deja los datos del widget en el App Group compartido y le pide que se redibuje.
    Function("setWidgetData") { (json: String) -> Void in
      UserDefaults(suiteName: "group.app.taimo")?.set(json, forKey: "widget")
      WidgetCenter.shared.reloadAllTimelines()
    }

    /// Solo tiene sentido en Android (lector de notificaciones).
    Function("setIgnoredApps") { (_: [String]) -> Void in
    }
  }
}
