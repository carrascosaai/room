import AppIntents
import Foundation
import UserNotifications

/// Acción de Atajos "Registrar pago en Taimo". Se usa en la automatización
/// "Transacción" de Wallet: apunta el pago SIN abrir la app y muestra un aviso.
/// Los pagos se guardan en una cola (UserDefaults) que la app vacía al abrirse.
@available(iOS 16.0, *)
struct TaimoRegistrarPagoIntent: AppIntent {
  static var title: LocalizedStringResource = "Log payment in Taimo"
  static var description = IntentDescription("Logs an Apple Pay payment in Taimo without opening the app.")
  static var openAppWhenRun: Bool = false

  @Parameter(title: "Amount")
  var importe: String

  @Parameter(title: "Merchant", default: "")
  var comercio: String

  @Parameter(title: "Card", default: "")
  var tarjeta: String

  static var parameterSummary: some ParameterSummary {
    Summary("Log \(\.$importe) at \(\.$comercio)") {
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

    let text = TaimoStrings.current
    let label = comercio.isEmpty ? importe : "\(importe) · \(comercio)"
    let content = UNMutableNotificationContent()
    content.title = text.title
    content.body = "\(label). \(text.body)"
    content.sound = nil
    let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
    try? await UNUserNotificationCenter.current().add(request)

    return .result(dialog: "\(text.title): \(label)")
  }
}

/// Textos del aviso en el idioma del iPhone (los de la app se traducen en JavaScript).
struct TaimoStrings {
  let title: String
  let body: String

  static var current: TaimoStrings {
    let lang = Locale.preferredLanguages.first.map { String($0.prefix(2)) } ?? "en"
    switch lang {
    case "es": return TaimoStrings(title: "⚡ Apuntado en Taimo", body: "Toca para ver cuánto te queda.")
    case "ca": return TaimoStrings(title: "⚡ Apuntat a Taimo", body: "Toca per veure quant et queda.")
    case "fr": return TaimoStrings(title: "⚡ Enregistré dans Taimo", body: "Touchez pour voir ce qu’il vous reste.")
    case "de": return TaimoStrings(title: "⚡ In Taimo erfasst", body: "Tippe, um zu sehen, was übrig ist.")
    case "it": return TaimoStrings(title: "⚡ Registrato in Taimo", body: "Tocca per vedere quanto ti resta.")
    case "pt": return TaimoStrings(title: "⚡ Registado no Taimo", body: "Toca para ver quanto te resta.")
    case "nl": return TaimoStrings(title: "⚡ Genoteerd in Taimo", body: "Tik om te zien wat je over hebt.")
    case "sv": return TaimoStrings(title: "⚡ Bokfört i Taimo", body: "Tryck för att se vad du har kvar.")
    case "nb", "no", "nn": return TaimoStrings(title: "⚡ Ført i Taimo", body: "Trykk for å se hva du har igjen.")
    case "da": return TaimoStrings(title: "⚡ Noteret i Taimo", body: "Tryk for at se, hvad du har tilbage.")
    case "fi": return TaimoStrings(title: "⚡ Kirjattu Taimoon", body: "Napauta nähdäksesi, paljonko on jäljellä.")
    case "pl": return TaimoStrings(title: "⚡ Zapisano w Taimo", body: "Dotknij, żeby zobaczyć, ile zostało.")
    default: return TaimoStrings(title: "⚡ Logged in Taimo", body: "Tap to see what you have left.")
    }
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
      phrases: ["Log payment in \(.applicationName)"],
      shortTitle: "Log payment",
      systemImageName: "creditcard"
    )
  }
}
