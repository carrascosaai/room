import SwiftUI
import WidgetKit

/// Lo que la app deja en el App Group (src/widget/data.ts), ya traducido y formateado.
struct TaimoWidgetData: Codable {
  var title: String
  var left: String
  var perDay: String
  var spent: String
  var progress: Double
  var over: Bool
  var add: String
  var scan: String
}

let taimoGroup = "group.app.taimo"
let mint = Color(red: 0.18, green: 0.90, blue: 0.62)
let ink = Color(red: 0.04, green: 0.06, blue: 0.05)

struct TaimoEntry: TimelineEntry {
  let date: Date
  let data: TaimoWidgetData?
}

struct TaimoProvider: TimelineProvider {
  func load() -> TaimoWidgetData? {
    guard let json = UserDefaults(suiteName: taimoGroup)?.string(forKey: "widget"),
          let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(TaimoWidgetData.self, from: data)
  }

  func placeholder(in context: Context) -> TaimoEntry {
    TaimoEntry(date: .now, data: TaimoWidgetData(title: "Taimo", left: "—", perDay: "", spent: "", progress: 0.4, over: false, add: "+", scan: "📷"))
  }

  func getSnapshot(in context: Context, completion: @escaping (TaimoEntry) -> Void) {
    completion(TaimoEntry(date: .now, data: load()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TaimoEntry>) -> Void) {
    // La app pide recargar cada vez que cambia algo; además, una vez por hora.
    completion(Timeline(entries: [TaimoEntry(date: .now, data: load())], policy: .after(.now.addingTimeInterval(3600))))
  }
}

struct TaimoWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: TaimoEntry

  var body: some View {
    let d = entry.data
    VStack(alignment: .leading, spacing: 6) {
      Text(d?.title ?? "Taimo").font(.caption).foregroundStyle(.secondary)
      Text(d?.left ?? "—")
        .font(.system(size: family == .systemSmall ? 28 : 34, weight: .heavy, design: .rounded))
        .foregroundStyle(d?.over == true ? Color.red : Color.primary)
        .minimumScaleFactor(0.5)
        .lineLimit(1)
      if family != .systemSmall {
        ProgressView(value: min(1, max(0, d?.progress ?? 0)))
          .tint(d?.over == true ? Color.red : mint)
      }
      Text(d?.perDay ?? "Open Taimo").font(.footnote).foregroundStyle(.secondary).lineLimit(2)
      if family != .systemSmall, let d {
        Spacer(minLength: 0)
        HStack(spacing: 8) {
          Link(destination: URL(string: "taimo://add")!) {
            Text("+ \(d.add)").font(.footnote.bold()).frame(maxWidth: .infinity).padding(.vertical, 6)
              .background(mint).foregroundStyle(ink).clipShape(Capsule())
          }
          Link(destination: URL(string: "taimo://add?scan=1")!) {
            Text(d.scan).font(.footnote.bold()).frame(maxWidth: .infinity).padding(.vertical, 6)
              .background(Color.secondary.opacity(0.2)).clipShape(Capsule())
          }
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetURL(URL(string: "taimo://"))
    .containerBackground(for: .widget) { Color(.systemBackground) }
  }
}

struct TaimoWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TaimoWidget", provider: TaimoProvider()) { entry in
      TaimoWidgetView(entry: entry)
    }
    .configurationDisplayName("Taimo")
    .description("What you have left this month and per day.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct TaimoWidgets: WidgetBundle {
  var body: some Widget {
    TaimoWidget()
  }
}
