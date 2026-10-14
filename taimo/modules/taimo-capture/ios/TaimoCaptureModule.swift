import ExpoModulesCore

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

    /// Solo tiene sentido en Android (lector de notificaciones).
    Function("setIgnoredApps") { (_: [String]) -> Void in
    }
  }
}
