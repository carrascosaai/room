import AppIntents
import Foundation
import UserNotifications

/// Acción de Atajos "Registrar pago en Taimo". Se usa en la automatización
/// "Transacción" de Wallet: apunta el pago SIN abrir la app y muestra un aviso.
/// Los pagos se guardan en una cola (UserDefaults) que la app vacía al abrirse.
@available(iOS 16.0, *)
struct TaimoRegistrarPagoIntent: AppIntent {
  static var title: LocalizedStringResource = "Registrar pago en Taimo"
  static var description = IntentDescription("Apunta un pago con Apple Pay en Taimo sin abrir la app.")
  static var openAppWhenRun: Bool = false

  @Parameter(title: "Importe")
  var importe: String

  @Parameter(title: "Comercio", default: "")
  var comercio: String

  @Parameter(title: "Tarjeta", default: "")
  var tarjeta: String

  static var parameterSummary: some ParameterSummary {
    Summary("Registrar \(\.$importe) en \(\.$comercio)") {
      \.$tarjeta
    }
  }

  func perform() async throws -> some IntentResult & ProvidesDialog {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    TaimoPendingQueue.append([
      "amount": importe,
      "merchant": comercio,
      "card": tarjeta,
      "date": formatter.string(from: Date()),
      "source": "applepay",
    ])

    let label = comercio.isEmpty ? importe : "\(importe) en \(comercio)"
    let content = UNMutableNotificationContent()
    content.title = "⚡ Apuntado en Taimo"
    content.body = "\(label). Toca para ver cuánto te queda."
    content.sound = nil
    let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
    try? await UNUserNotificationCenter.current().add(request)

    return .result(dialog: "Apuntado: \(label)")
  }
}

/// Cola compartida con TaimoCaptureModule (misma clave de UserDefaults).
enum TaimoPendingQueue {
  static let key = "taimo.pendingCaptures"

  static func append(_ item: [String: String]) {
    let defaults = UserDefaults.standard
    var items = defaults.array(forKey: key) as? [[String: String]] ?? []
    items.append(item)
    if items.count > 200 { items.removeFirst(items.count - 200) }
    defaults.set(items, forKey: key)
  }
}

@available(iOS 16.0, *)
struct TaimoAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: TaimoRegistrarPagoIntent(),
      phrases: ["Registrar pago en \(.applicationName)"],
      shortTitle: "Registrar pago",
      systemImageName: "creditcard"
    )
  }
}
