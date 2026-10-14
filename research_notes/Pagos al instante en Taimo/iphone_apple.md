# Instant card-payment awareness for a third-party iPhone app (Taimo, Spain/EU), state as of Oct 2026

Note on method: Apple developer docs were read from Apple's own JSON doc endpoints and pages. Several hosts (support.apple.com, heise.de, fsfe.org, macrumors.com, getfinny.app) could not be fetched from this environment, so claims from those come from search-result snippets. Those are flagged "(snippet)".

## 1. Apple FinanceKit: data, regions (Spain/EU?), real-time behaviour, entitlement, physical-card coverage

### Takeaway
FinanceKit is the only Apple API that gives an app transaction data. As of October 2026 it is officially limited to the **US** (Apple Card, Apple Cash, Savings; iOS 17.4+) and the **UK** (open-banking "Connected Cards" accounts at about 13 named banks; iOS 18.4+). **Spain and the EU are not supported, and no EU expansion has been announced.** That includes WWDC 2026 / iOS 27. Its "background delivery" (iOS 26) is near-real-time at best: it fires when the issuer pushes data, throttled to at most once per hour.

### Cited Findings
- FinanceKit's purpose: "Access financial data and interact with Apple Card, Apple Cash, and orders in Wallet". Its APIs are `FinanceStore` (`accounts`, `accountBalances`, `transactions(query:)`, `transactionHistory(forAccountID:since:isMonitoring:)`, `accountHistory`, `saveOrder(signedArchive:)`) and `FinanceKitUI` (a standard picker UI). Types include `Transaction`, `MerchantCategoryCode`, `TransactionStatus`, `TransactionType`, `CreditDebitIndicator` and `CurrencyAmount`. `Account` and `Transaction` were introduced in iOS 17.4 — [Apple FinanceKit docs](https://developer.apple.com/documentation/financekit)
- Regions, in Apple's words. **US**: "requires an iPhone running iOS 17.4 or later, and currently supports … Apple Card (excluding participants using Apple Card Family), Apple Cash (excluding children using Apple Cash Family), Savings." **UK**: "requires an iPhone running iOS 18.4 or later, and uses open banking to access various financial data in the U.K. from institutions, including Barclays, Barclaycard, First Direct, Halifax, HSBC, Lloyds, M&S Bank, MBNA, Monzo, Nationwide, NatWest, Royal Bank of Scotland, and Santander." No EU country is mentioned — [Apple "Get started with FinanceKit"](https://developer.apple.com/financekit/)
- Entitlement eligibility: the app must "Be listed in the Finance category in App Store Connect and distributed through the App Store for iPhone in the United States or United Kingdom" and "Provide financial management tools (for example, a comprehensive view of net worth, spending trends, budgeting)". Apps that offer accounts or cards must let customers connect them to Wallet. The entitlement is granted per bundle ID — [Apple FinanceKit](https://developer.apple.com/financekit/)
- Process to get the entitlement: hold an **organization-level** Apple Developer account, be logged in as **Account Holder**, add `NSFinancialDataUsageDescription`, and submit the **FinanceKit managed entitlement request form** at https://developer.apple.com/contact/request/financekit/. "Apple reviews each application using defined criteria. If your request meets the criteria, Apple adds the entitlement to your developer account by using managed capabilities." — [Apple FinanceKit docs](https://developer.apple.com/documentation/financekit)
- UK expansion was announced at WWDC25: "we've brought the two together [FinanceKit + Connected Cards] and made the FinanceKit API available in the UK", built on the Open Banking Standard. Users control which apps see their data and how far back — [WWDC25 session 201 "What's new in Apple Pay"](https://developer.apple.com/videos/play/wwdc2025/201/)
- **Background delivery (iOS 26.0+)**: a `BackgroundDeliveryExtension` "will be notified whenever data changes in the finance store … regardless of if your app is running or not". Data types are Accounts, AccountBalances and Transactions. Each type is registered with a frequency of **hourly, daily or weekly**, which is "the expected minimum Interval between extension launches". In Apple's example, an hourly extension "may be called right after data changes, but if data changes within the subsequent hour, your extension won't be called again until that hour has elapsed." The extension has a limited time window, and `willTerminate` is called when it runs out. Apple's demo says the widget updates "after … the transaction comes through from the card issuer" — [WWDC25 session 201](https://developer.apple.com/videos/play/wwdc2025/201/); [Implementing a background delivery extension (iOS 26.0)](https://developer.apple.com/documentation/financekit/implementing-a-background-delivery-extension)
- The UK Connected Cards feature (late 2023) uses Open Banking to show balances and "a list of the latest transactions on the card", and the refresh "can be slow" — [AppleInsider, Nov 2023](https://appleinsider.com/articles/23/11/16/apple-uk-launches-wallets-connected-cards-feature); [GSMArena](https://m.gsmarena.com/apple_connected_cards_united_kingdom-news-60608.php)
- iOS 27 (WWDC June 2026) Wallet news includes no FinanceKit country expansion that could be found. Order tracking expands to Australia and Canada. Split Bill is US-only (Apple Cash). "Insights" builds on Connected Accounts and is live in some territories, including some UK banks (snippet) — [MacRumors, 10 Jun 2026](https://www.macrumors.com/2026/06/10/ios-27-new-apple-wallet-features/); [walletwallet blog](https://walletwallet.alen.ro/blog/wwdc-2026-apple-wallet-live/)
- In March 2024 (iOS 17.4 era), Computerworld reported the API as US-only (dated) — [Computerworld](https://www.computerworld.com/article/1612346/what-is-financekit-in-ios-174.html)

### Inferences
- **Physical-card question:** in the UK the data comes from **open banking (the account feed)**, not from Wallet tap events. It therefore very likely includes physical-card, online and direct-debit transactions on that account, with the latency of the bank's open-banking feed. Apple does not state this explicitly. For US Apple Card, transactions from the titanium card and the card number are part of the issuer feed as well.
- For Taimo in Spain, FinanceKit returns nothing today. Even if Apple brings it to the EU, Spanish banks would first need to be connected via a PSD2-style "Connected Cards" equivalent, and Apple has announced no such thing for any EU country.
- A further barrier: eligibility requires App Store distribution "in the United States or United Kingdom". An EU-only app would not qualify today.
- Real-time ceiling: background delivery is issuer-push driven and throttled hourly. It is good enough for a "you've spent X today" widget, but not for a guaranteed per-payment notification within seconds.

### Gaps
- No Apple statement could be found on FinanceKit EU or Spain plans. Absence from WWDC26 is only negative evidence.
- Typical FinanceKit entitlement approval time is not published. No public developer reports of turnaround were found.
- No published latency figures exist for Wallet or FinanceKit transaction arrival in the UK.
- Third-party FinanceKit users (Copilot, YNAB, Monarch, Emma) and their stated limits could not be verified in this session.

## 2. Shortcuts "Transaction" (Wallet) automation: triggers, confirmation, data, reliability

### Takeaway
The Transaction automation is the only system hook that fires the moment a user pays with a **card in Apple Wallet**, and it works in Spain. It can "Run Immediately" without confirmation and passes **Amount, Merchant and Card/Pass** into a shortcut. That shortcut can call an App Intent exposed by Taimo. It does **not** see physical-card or plain online card payments, and users report that it misses payments when the issuer notifies Wallet late.

### Cited Findings
- The automation was introduced in iOS 17. You pick the Wallet cards (and optionally merchant categories), and it fires when you tap the card — [Matthew Cassinelli](https://matthewcassinelli.com/shortcuts-automations-ios-ipados-transaction-display-stage-manager/); [iDrop News](https://www.idropnews.com/ios-17/this-new-ios-17-shortcut-will-help-you-keep-track-of-your-spending/197589/)
- Setup used by finance apps: choose Transaction, select cards, choose "Run Immediately" and turn off "Notify When Run". Map Shortcut Input fields: Amount, Merchant, Card or Pass (snippet) — [TravelSpend help](https://help.travel-spend.com/shortcuts--automation/ignQHsp85RQDsig2QwVcdX/set-up-apple-pay-automation/7tL8XfjBceg4D7mQeiSK2V); [Finerd help](https://help.finerd.ai/apple-pay); [PocketClear blog](https://pocketclear.app/blog/auto-log-apple-pay-bank-sms-iphone-shortcuts.html)
- Reliability: in Feb 2025 users reported "Automation failed" and the trigger not firing. One theory: when an issuer delivers the transaction to Wallet late, Wallet still shows it eventually, "but the transaction automation trigger … times out instead". No Apple engineer reply — [Apple Dev Forums 773745](https://developer.apple.com/forums/thread/773745); [Apple Dev Forums 758053 (iOS 18)](https://www.developer.apple.com/forums/thread/758053)
- An app-intent-based "After Payment" automation shows an "Always Allow" permission prompt that reportedly does not persist (developer report) — [Apple Dev Forums 850369](https://developer.apple.com/forums/thread/850369)
- A vendor reports that Low Power Mode can delay or drop runs, that "Ask Before Running" shows a banner instead of running, and that "if a tap doesn't appear in Wallet at all, the automation never receives it" (snippet) — [Finny blog](https://getfinny.app/blog/tap-to-track-missed-tap-what-to-do); [Finny: flaky automations](https://getfinny.app/blog/ios-shortcuts-automations-flaky-fix)

### Inferences
- Coverage is likely only Apple Pay **taps** with a Wallet card on that iPhone, possibly also on a paired Apple Watch and Apple Pay in-app/web where the issuer sends a Wallet transaction notification. Physical-card swipes and card-number online purchases never reach Wallet in Spain (no Connected Cards), so they cannot trigger it. Whether Watch and online Apple Pay trigger it is not documented by Apple; treat it as unverified.
- Practical design for Taimo: ship an App Intent such as "Registrar gasto (importe, comercio, tarjeta)" that runs without opening the app, plus a one-tap install link for a prebuilt shortcut. The user must create the automation themselves, because apps cannot create automations programmatically. This is the pattern used by TravelSpend, Finerd, PocketClear and Finny.
- Since many Spanish users pay by phone (Apple Pay is widely supported by Spanish banks), this path probably covers a large share of in-store spending, though not all of it.

### Gaps
- The official Apple support page for the Transaction trigger (support.apple.com) could not be fetched, so the exact Apple wording on Watch and online coverage is unconfirmed.
- No quantitative miss-rate data exists.

## 3. Can an iOS app read bank push notifications, SMS or Wallet history?

### Takeaway
No. iOS gives an app no access to other apps' notifications, the Messages database, or Wallet transaction history. FinanceKit (where available) is the only exception. Notification Service Extensions only process **the app's own** pushes.

### Cited Findings
- "No app should be able to see notifications from other apps." Apple sandboxing gives third-party apps "zero read access to the iOS Messages app database" — [Apple Dev Forums 749836](https://developer.apple.com/forums/thread/749836); [Apple Dev Forums 818261](https://developer.apple.com/forums/thread/818261)
- A Notification Service Extension runs only for pushes with `mutable-content` addressed to the extension's own app, to modify their content before display — [Tutsplus](https://code.tutsplus.com/ios-10-notification-service-extensions--cms-27550t); [OneSignal docs](https://documentation.onesignal.com/docs/en/service-extensions.md)
- **EU DMA notification forwarding** (iOS 26.3 to 26.5 betas) forwards iPhone notifications, "including the name of the app and all content", to **one third-party wearable** (a connected device, not an iPhone app). As of 30 Mar 2026 it was still in testing with no EU launch date (snippet) — [MacRumors 30 Mar 2026](https://www.macrumors.com/2026/03/30/apple-airpods-like-pairing-notification-forwarding/); [Heise](https://www.heise.de/en/news/New-framework-Will-iOS-26-1-forward-notifications-to-non-Apple-watches-10669113.html?view=print); [Thurrott](https://www.thurrott.com/apple/331005/ios-26-3-to-improve-interoperability-with-third-party-earbuds-and-smartwatches-in-the-eu); [MacRumors Dec 2025](https://macrumors.com/2025/12/22/ios-26-3-dma-airpods-pairing)

### Inferences
- Notification forwarding is aimed at **accessory makers** (Bluetooth devices). An app maker would have to build or pose as a wearable companion device to receive other apps' notifications. That is speculative, likely against the framework's terms, and limited to one device that replaces Apple Watch forwarding. Not a realistic path.
- SMS: the IdentityLookup Message Filter extension (from general knowledge, not fetched this session) only sees SMS from unknown senders, for filtering. Using it to harvest bank SMS would conflict with its purpose and App Review. Also, Spanish banks mostly send OTP SMS rather than purchase alerts. Treat this as not viable.
- The bank-agnostic way to get every card payment remains server-side: PSD2/AIS aggregators (polling, minutes to hours), or bank or issuer webhooks where a bank offers them. That is outside Apple's scope and covered by other researchers.

### Gaps
- The current status (Oct 2026) of EU notification forwarding (shipped in iOS 26.x or not) was not confirmed.

## 4. EU Digital Markets Act: Art. 6(7), NFC/HCE, and requesting Wallet/payment-event access

### Takeaway
Since iOS 17.4, EEA apps can do **HCE contactless payments** and become the default contactless app. That requires being a regulated payment provider (EMV/PCI). Under the 2024 EC commitments it is free and needs no Apple Pay. If Taimo itself were the wallet, it would see every tap it processes. Separately, any developer can file an **Art. 6(7) interoperability request** via Feedback Assistant, with defined phases and up to 24 months to delivery. Track record: by 22 Mar 2026, **none of 56 requests** had produced a new solution, and **Wallet-related requests have been denied**. A request for Wallet transaction events is possible, but Apple is likely to reject it as out of scope or not feasible.

### Cited Findings
- HCE in the EEA: iPhone XS+ on iOS 17.4+, users in the EEA. The developer must be **established in the EEA**, enrolled as an **organization**, and commit to PCI DSS, EMVCo and GDPR. For in-store payments it must hold "the legal right and the necessary regulatory permissions to provide mobile payment solutions in the EEA". Entitlement keys: `com.apple.developer.nfc.hce` and `...default-contactless-app`. The request form is at /contact/request/hce-entitlement/ (Account Holder). Testing outside the EEA is possible on iOS 18.2+ — [Apple: HCE-based contactless NFC transactions in the EEA](https://developer.apple.com/support/hce-transactions-in-apps/)
- EC commitments: effective **17 July 2024 for ten years**, with access free of charge. Monitoring Trustee: ApplePay.EC-commitments@alcis-advisers.com. Disputes go to HCEEntitlementdispute@apple.com within 15 business days, then the NFC Appeal Board — [Apple HCE page](https://developer.apple.com/support/hce-transactions-in-apps/). Press reports the commitments drop the need for a PSP licence or PSP agreement to access NFC (snippet; check against the EC decision) — [fintech.global](https://fintech.global/?p=166682); [MacRumors](https://www.macrumors.com/537/)
- Art. 6(7) request process: submit via Feedback Assistant (form `interop`) at http://feedbackassistant.apple.com/new?form=interop; questions to **dmainteroperability@apple.com**. Membership must be in good standing; one request per feature; the Account Holder is copied.
  - Phase I eligibility: ~20 working days.
  - Phase II project plan: 40 working days.
  - Phase III development: 6, 12 or 18 months for minor, mild or significant work, with release in all cases ≤24 months from submission.
  - Appeals: internal review within 15 working days, then non-binding conciliation.
  - Technical reference queries are answered in 20 working days.
  - Confidentiality can be full, partial or confidential. Apple publishes a tracker of requests since 20 May 2025.
  - Source: [Apple: Requesting interoperability with iOS and iPadOS in the EU](https://developer.apple.com/support/ios-interoperability/)
- The Commission's specification decisions (opened Sept 2024) set the request process rules: immediate notice with reasoning on rejection — [EC DMA portal](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/apple-specification-proceedings-interoperability-connected-devices-and-request-based-process_en); [EC Interoperability portal](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability_en)
- FSFE (Apr 2026), based on Apple's tracker: as of 22 Mar 2026, **56 requests and no new interoperability solution**. Of 16 publicly disclosed closures, 10 were denied on "technical grounds", 2 for "existing solutions" and 3 as "out of scope". Requests on **Apple Wallet** and BLE are cited as denied with reasoning that contradicts Apple's docs. One rejection said a request "is not seeking interoperability with a software feature accessed or controlled by iOS" (snippets) — [FSFE](https://fsfe.org/news/2026/news-20260420-01.html); [Heise](https://www.heise.de/en/news/DMA-FSFE-laments-Apple-s-blockade-on-interoperability-requests-11266688.html); [HN discussion](https://news.ycombinator.com/item?id=47847124)

### Inferences
- **Option A: Taimo as an HCE wallet.** It would see 100% of payments made through its own wallet, instantly. But it requires being, or partnering under a binding agreement with, a regulated payment institution or e-money issuer, issuing or tokenising cards, EMVCo certification and PCI DSS. That is very heavy for a free budgeting app, and it only covers payments made with Taimo's own wallet, not the user's bank cards elsewhere.
- **Option B: an Art. 6(7) request for "Wallet transaction-event notification / Transaction automation as an API for third-party apps".** Formally possible and cheap to file (a free Feedback Assistant form). Argument: Apple's own apps (Wallet, Shortcuts, Wallet's Insights) use the payment-event feature. Expect a rejection (out of scope, privacy or existing solution such as FinanceKit or Shortcuts), after which the appeal and EC complaint routes open. Even on success, delivery could take up to 24 months. It is regulatory leverage, not a product plan.
- Apple will likely point to existing solutions (Shortcuts Transaction automation, FinanceKit) to deny. Note that FinanceKit not being available in the EU strengthens a "no effective interoperability in the EU" argument.

### Gaps
- The exact text of the denied Wallet requests in Apple's tracker could not be retrieved (pages unreachable).
- No precedent of a successful payment-data or Wallet-data DMA request was found.

## 5. Other iOS mechanisms (Order tracking, passes, Live Activities, App Intents, Tap to Pay, iOS 26/27)

### Takeaway
None of these give an app payment events from the user's cards. They are useful only as UX surfaces: App Intents to receive data from Shortcuts, plus widgets, Live Activities and Siri. Wallet Orders are merchant-issued.

### Cited Findings
- Wallet **orders** are added by merchants, and FinanceKit can `saveOrder(signedArchive:)`. In iOS 26, Wallet uses Apple Intelligence to detect order emails in Mail and turn them into orders. This is merchant/order data, not card payments — [WWDC25 201](https://developer.apple.com/videos/play/wwdc2025/201/); [FinanceKit docs](https://developer.apple.com/documentation/financekit)
- Order tracking was US/UK in iOS 26 and expands to Australia and Canada in iOS 27. No EU mention (snippet) — [MacRumors iOS 27 Wallet](https://www.macrumors.com/2026/06/10/ios-27-new-apple-wallet-features/)
- Background delivery can drive widgets that update "as users shop", but only with FinanceKit data (so US/UK) — [WWDC25 201](https://developer.apple.com/videos/play/wwdc2025/201/)

### Inferences
- "Tap to Pay on iPhone" lets a *merchant* accept cards. It is irrelevant to reading a consumer's payments.
- Wallet passes (loyalty cards) give no payment data.
- Live Activities and widgets can show a "last spend" fed by Taimo's backend (PSD2 webhook or poll) or by the Shortcuts App Intent.
- Push from Taimo's own server is the main "instant" UI channel once a backend source (bank or aggregator webhook) exists.

### Gaps
- iOS 27 FinanceKit developer release notes could not be checked directly.

## 6. Whom to contact and expected timelines

### Takeaway
- **FinanceKit:** managed entitlement form (Account Holder of an organization account). It only applies in the US/UK, and no turnaround is published.
- **DMA:** a Feedback Assistant interop form, plus dmainteroperability@apple.com. Statutory phases run about 1 to 3 months to a plan and up to 24 months to delivery.
- **HCE:** HCE entitlement form, with Monitoring Trustee and NFC Appeal Board escalation.

### Cited Findings
- FinanceKit entitlement form: https://developer.apple.com/contact/request/financekit/ (Account Holder, organization account, per bundle ID) — [Apple FinanceKit docs](https://developer.apple.com/documentation/financekit); [Apple FinanceKit page](https://developer.apple.com/financekit/)
- DMA interop: Feedback Assistant `form=interop`; dmainteroperability@apple.com; 20 working days (Phase I), 40 working days (Phase II plan), up to 24 months total — [Apple](https://developer.apple.com/support/ios-interoperability/)
- HCE: /contact/request/hce-entitlement/; disputes to HCEEntitlementdispute@apple.com, the trustee ApplePay.EC-commitments@alcis-advisers.com, and chair@nfc-appeal-board.com — [Apple HCE](https://developer.apple.com/support/hce-transactions-in-apps/)
- EC complaints and DMA developer portal: [digital-markets-act.ec.europa.eu interoperability](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability_en)

### Inferences
- Realistic ranking for Taimo in Spain (Oct 2026):
  1. Shortcuts Transaction automation plus a Taimo App Intent: instant, free, Apple Pay only, user setup required.
  2. A backend PSD2/bank feed with Taimo's own pushes: covers physical and online card payments, latency depends on the bank.
  3. FinanceKit: request the entitlement now to be ready if Apple extends it to the EU, but it is of no use in Spain today.
  4. A DMA Art. 6(7) request for Wallet payment events: low cost, low odds, long timeline, mostly strategic and PR value.
  5. Becoming an HCE wallet: impractical for a free budgeting app.

### Gaps
- No published SLA or experience reports for FinanceKit entitlement approval times.
