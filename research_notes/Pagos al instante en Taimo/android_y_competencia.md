# Captura instantánea de pagos: Android (acceso a notificaciones) y cómo lo hace la competencia

Research date: 2026-10-14. Note on method: support.google.com, bde.es and dev.to could not be fetched directly from this environment (proxy/DNS blocked), so Google Play policy and Banco de España figures come from search-result extracts of those pages, not from full-page reads. Items marked "(training knowledge, unverified here)" were not confirmed by a source in this session.

## 1. Google Play policy for NotificationListenerService ("acceso a notificaciones") in finance apps, 2025–2026

### Takeaway
I found no Play policy that bans finance apps from using notification access, and no published permission-declaration form specific to it, unlike SMS/Call Log, which has a hard restriction. Play's general "Permissions and APIs that Access Sensitive Information" rules apply: the access must be core to the app as promoted on the listing, users must consent explicitly, and the app must still work if the user declines. Play Protect also treats the permission as sensitive, especially for sideloaded apps. Expense trackers that read bank notifications on Android exist and are distributed this way.

### Cited Findings
- Play's sensitive-permissions policy requires that requesting permissions and sensitive APIs that access user data be "necessary for the app's core functionalities as promoted in your Google Play listing". Developers must also "make a reasonable effort to accommodate users who do not grant access". — [Permissions and APIs that Access Sensitive Information – Play Console Help](https://support.google.com/googleplay/android-developer/answer/16558241) (search extract; page not fetchable here)
- Google has a separate help page, "Understanding Restricted Permissions with minimum scope alternatives". It confirms that Play keeps a list of restricted permissions with declarations. I could not confirm whether notification listener access is on that list. — [Play Console Help 16935362](https://support.google.com/googleplay/android-developer/answer/16935362)
- Play policy announcement dated 30 October 2025 (contents not retrievable here). — [Policy announcement: October 30, 2025](https://support.google.com/googleplay/android-developer/answer/16550159?hl=en)
- Play Protect developer guidance on notification access. Allowed examples include health/fitness apps that relay notifications to wearables and apps that aggregate notifications to help users focus. Disallowed examples include accessing notification content "without explicit user consent" and hiding or blocking other apps' notifications without consent. Apps from internet-sideloading sources that declare it may be blocked at install. — [Developer Guidance for Google Play Protect Warnings](https://developers.google.com/android/play-protect/warning-dev-guidance)
- Android Open Source Project documentation has a "Notification access and notification listener policy" page (automotive context). — [source.android.com](https://source.android.com/docs/automotive/hmi/notifications/notification-access)
- SMS/Call Log is a different and much stricter case. Play restricts these permission groups to apps whose critical core function is default SMS, Phone or Assistant handler, plus declared exceptions. Apps must declare them in Play Console. — [Play Console Help 9047303 – Use of SMS or Call Log permission groups](https://support.google.com/googleplay/android-developer/answer/9047303); history of 2018–2019 enforcement: [XDA](https://www.xda-developers.com/google-remove-unapproved-apps-use-call-log-sms-permissions/), [Android Police 2019](https://www.androidpolice.com/2019/01/05/googles-new-sms-and-call-permission-policy-is-crippling-apps-used-by-millions)
- Real-world examples of notification-parsing expense apps:
  - Ginti (indie) parses bank alert notifications without bank login. On Android it detects them automatically. On iOS users must paste them, because Apple gives no background notification access. — [Indie Hackers – Ginti](https://www.indiehackers.com/product/ginti)
  - A DEV Community post describes the same approach on Android and its reliability problems (listener killed, not rebinding after update). Once access is granted, Android hands the app every notification on the phone. — [DEV Community](https://dev.to/rao_asad_fb657aebdb761ad4/turning-bank-notifications-into-expenses-on-android-without-a-bank-login-5af2) (seen via search extract only)
- Third-party commentary (not official) calls notification access a "restricted"/serious-responsibility permission. — [ptkd.com](https://ptkd.com/journal/android-notification-listener-service-security); declaration flow described by [newly.app](https://newly.app/how-to/android-restricted-permissions) (secondary)

### Inferences
- The two permissions carry very different policy risk. Notification access is mainly a disclosure, consent and listing-alignment exercise. SMS reading is effectively barred for a budgeting app on Play.
- To lower rejection risk, Taimo should:
  - list "detect payments from your bank's notifications" as a core feature on the Play listing;
  - show a prominent in-app disclosure before sending the user to the system settings screen;
  - filter by package name (bank apps and Google Wallet only), process on device, and not upload raw notification text;
  - keep manual entry and other routes working when access is declined.
- Reliability risks (training knowledge, unverified here):
  - OEM battery killers (Xiaomi, Huawei, Samsung "sleeping apps") can stop the listener.
  - The listener may need `requestRebind`.
  - Android 15+ "sensitive notifications" protection redacts OTP-type content for untrusted listeners. Purchase alerts are probably not affected, but this should be tested.
  - Banks change notification wording, which breaks parsers.
  - If the user disables the bank's push, nothing is captured.
  - Notification access also requires the user to switch it on manually in a system settings screen, which causes friction and drop-off.

### Gaps
- I could not read the full current Play pages, so I cannot confirm whether `BIND_NOTIFICATION_LISTENER_SERVICE` now triggers a Play Console declaration (as of 2026).
- I found no documented Play rejections specifically of finance apps for notification access.
- No data on what share of users grant notification access.

## 2. Do Spanish banks send a push for every card payment (physical, contactless, online)?

### Takeaway
The large Spanish banks I could check (BBVA, ING, Santander, CaixaBank, Openbank) offer push notifications for card purchases in their apps. For BBVA and ING this is documented by official or near-official sources. In most cases they must be switched on or configured (by card, type of purchase or minimum amount) and need OS notification permission. Online purchases additionally trigger a push to authorise them (SCA). I found no source for Sabadell, Bankinter or Unicaja, and no official confirmation for Revolut or N26 from this search.

### Cited Findings
- **BBVA (Spain)**
  - The official page says alerts are configured in app/web under Configuración > Avisos y Alertas, with choices for accounts, cards and security. It also says "cada vez que el usuario haga uso de sus tarjetas, recibirá notificaciones de sus compras en el móvil". — [bbva.es – Notificaciones](https://www.bbva.es/personas/banca-online/notificaciones.html)
  - Per-card options are "Activar todas las notificaciones para esta tarjeta" or "Por tipo de compra": presencial, online, contactless/NFC, internacional. In 2023 this was not yet available for Mastercard. — [Info Viajera, Mar 2023 (secondary)](https://www.infoviajera.com/2023/03/los-nuevos-avisos-por-tipo-de-consumo-de-las-tarjetas-visa-del-banco-bbva/)
- **ING España**
  - Online purchases are validated in the app, and the customer "recibirás siempre una notificación push en cada operación, tanto si se confirma como si no".
  - For credit cards you can choose which cards, a minimum amount and a monthly total. You must also enable notifications in the phone's settings.
  - Sources: [ING – Pagar con tarjeta o por internet](https://www.ing.es/ennaranja/finanzas-personales/cuentas-y-tarjetas/pagar-con-tarjeta-internet/); [ING FAQ tarjetas](https://www.ing.es/preguntas-frecuentes/tarjetas)
- **Santander (Spain)**
  - The alerts service is free and configurable in app/web, including card charges.
  - Card-payment notifications "aparecen en tiempo real".
  - Sources are secondary and some are from LatAm; Spanish menus are unconfirmed: [elcierredigital](https://elcierredigital.com/economia/banco-santander-envia-alerta-que-sorprende-todos-sus-clientes-asi-facil), [edatv](https://edatv.news/actualidad/banco-santander-sistema-alertas)
- **CaixaBank**
  - Path: CaixaBankNow > Perfil > Configuración > Notificaciones y alertas > Gestionar notificaciones, then accept OS permissions. — [caixabank.es – activar notificaciones](https://www.caixabank.es/particular/banca-digital/activar-notificaciones-app-caixabanknow.html)
  - Online purchases are authorised from CaixaBankNow by push. — [HelpMyCash](https://www.helpmycash.com/blog/los-clientes-de-caixabank-tendran-que-autorizar-las-compras-online-desde-caixabanknow/)
- **Openbank**
  - "Las notificaciones push están disponibles para operaciones con tarjeta" (Dec 2020). — [Openbank on X](https://x.com/openbank_es/status/1339178471361273856?lang=es)
  - Feb 2025: push notifications give the charge and merchant name, and receipts can be configured by amount. — [Openbank on X](https://x.com/openbank_es/status/1888891099210539058)
  - One forum user reported card-purchase pushes arriving 5–10 minutes late (older thread). — [Rankia](https://www.rankia.com/foros/bancos-cajas/temas/4281283-notificaciones-openbank)
- **Revolut, N26 (training knowledge, unverified here)**: both send an instant push for every card transaction (physical, contactless, online, and Apple/Google Pay) by default, because they are the issuer/processor. The push typically includes merchant and amount, and arrives within seconds of authorisation.

### Inferences
- Push notifications from bank apps cover physical card, contactless, online and Apple/Google Pay alike, because they come from the issuer's authorisation flow. This makes them the most complete credential-free source on Android, but only if the user has switched them on. Taimo's onboarding should guide users to switch on "todas las compras" in their bank app.
- Notification content varies by bank: amount, merchant and card last 4 digits are typical. Each bank needs its own parser template, so start with the top 5–6 by market share.
- Latency is usually seconds, but there are reports of minutes (Openbank).

### Gaps
- Sabadell, Bankinter, Unicaja, Kutxabank, Abanca: no source found.
- Whether each bank sends pushes by default or only when enabled is not documented consistently.
- No source on exact notification text formats per bank. This needs hands-on testing with real accounts.

## 3. Google Wallet: notifications for physical card use and API access

### Takeaway
Google Wallet only knows about payments made through Wallet (tap-to-pay with the phone or watch, and virtual card numbers). It does not see or notify swipes or taps of the physical plastic card. There is no public API for third-party apps to read a user's Wallet transaction history. Wallet's own purchase notification can still be captured by a notification listener for Wallet payments.

### Cited Findings
- When you tap to pay with Google Wallet you get a purchase notification; tapping it shows the details. Activity only lists transactions for cards added to Wallet. Users are told to "check your bank statements" for full card history. Purchase notifications can be switched on or off in Wallet settings. — [Google Wallet Help](https://pss.support.google.com/pay/answer/7644079)
- In January 2026 the Android Wallet app showed only the last 10 transactions per card from that device. Google Play services 26.01 added transactions from other devices and "online purchases that use virtual card numbers". — [9to5Google, 13 Jan 2026](https://9to5google.com/2026/01/13/google-wallet-transaction-history/); [Droid Life](https://www.droid-life.com/2026/01/13/google-wallet-transaction-history/); [Android Authority](https://www.androidauthority.com/google-wallet-search-mobile-3632358/)
- Google may use Pay transaction data to show users their own history. No developer read API is described. — [Google Wallet Help – Keep your payment info safe](https://support.google.com/wallet/answer/7643925?hl=en)
- Removing a card from Wallet does not stop use of the physical card. — [Westpac NZ FAQ](https://westpac.co.nz/help/if-i-remove-a-card-from-the-google-wallet-app-does-that-stop-any-transactions-on-the-card)
- Earlier coverage of Google Wallet notification changes: [9to5Google 2023](https://9to5google.com/2023/12/04/google-wallet-notifications/), [9to5Google 2024](https://9to5google.com/2024/06/10/google-wallet-android-notifications/)

### Inferences
- The Wallet notification is a useful second source on Android for mobile payments. It typically arrives instantly and includes merchant and amount (training knowledge). It must be de-duplicated against the bank push for the same purchase.
- It cannot replace bank pushes, because it misses physical-card and non-Wallet online payments.
- The Google Wallet API (passes/loyalty) is for issuing passes, not reading payments.

### Gaps
- I could not confirm the exact package name (`com.google.android.apps.walletnfcrel`, from training knowledge) or the exact notification text.
- Whether Wallet posts notifications for virtual-card online purchases in Spain is unverified.

## 4. Competitors: who achieves truly instant capture, and how

### Takeaway
Truly instant, complete capture is achieved by three kinds of app:
1. The card issuer itself: Revolut, Monzo, N26, Curve.
2. Apps that read SMS or notifications on Android: India's Axio/Walnut, Jupiter, and indie trackers.
3. On iOS, Apple's own data: FinanceKit for Apple Card/Cash in the US (Copilot, Monarch, YNAB).

Open-banking aggregators (Fintonic, Emma, Monarch/Rocket Money via Plaid) are near-real-time at best and often lag hours to a day. Bank consent must also be renewed every 90 days (now 180 under the EU's PSD2 RTS amendment, training knowledge).

### Cited Findings
- **Monzo**
  - Public developer API webhooks; `transaction.created` is the only event. It can fire twice (on creation and on settlement) and does not push updates. — [Monzo Community](https://community.monzo.com/t/webhook-for-settled-transactions/77614), [Monzo Community](https://community.monzo.com/t/api-webhooks-not-firing-on-updates-notes-category/2029)
  - Instant push comes from being the issuer (training knowledge).
- **Copilot / Monarch / YNAB (US, iOS)**
  - Apple FinanceKit launched with iOS 17.4 (March 2024) with these apps as launch partners. It makes Apple Card, Apple Cash and Savings transactions available. Copilot described the data as "real-time". — [TechCrunch, Mar 2024](https://techcrunch.com/2024/03/06/apple-releases-a-new-api-to-fetch-transactions-from-apple-card-and-apple-cash/amp); [Finovate](https://finovate.com/who-needs-open-banking-when-you-have-apple-financekit/)
  - In Jan 2026 9to5Mac still described Copilot's FinanceKit link as real-time for Apple Card/Savings. — [9to5Mac](https://9to5mac.com/2026/01/01/copilot-money-brings-clarity-to-your-finances-now-on-the-web/)
  - Sources conflict on mechanism: a 2026 review says Copilot uses Plaid for Apple Card. — [smartfinpro (low authority)](https://smartfinpro.com/us/ai-tools/copilot-money-review)
  - Other banks' data still come through aggregators.
- **Axio (formerly Walnut), India**
  - Reads transactional SMS to detect spends, bills and budget, and says it analyses only transactional SMS. — [axio on Google Play](https://play.google.com/store/apps/details?id=com.daamitt.walnut.app&hl=en_IN)
  - Expense tracking works only on Android "since iOS does not allow the necessary SMS access"; the iOS app is limited to bill split. — [ask_axio on X](https://twitter.com/ask_axio/status/1392361056480104448)
  - A 2026 competitor blog says it covers 40+ Indian banks, that the app has pivoted toward lending, and that SMS trackers must prove SMS is core. Some trackers have been removed from Play. — [getfinny.app (competitor marketing)](https://getfinny.app/blog/sms-expense-tracking-app)
  - Users report that auto-detection breaks after updates (Play reviews, anecdotal).
- **Jupiter (India)**
  - Its Play listing declares "Send/read SMS: Register UPI and track financial transactions and bills". — [Google Play](https://play.google.com/store/apps/details?id=money.jupiter&hl=en_IN)
  - Its privacy policy says it reads only financial-transaction SMS. — [Jupiter privacy policy](https://jupiter.money/privacy-policy-detail/)
  - Users have complained about it reading other banks' SMS. — [Jupiter Community](https://community.jupiter.money/t/jupiter-feedback-sms-reading-other-banks/16574)
  - Inference: SMS access is tolerated on Play when the app is also a bank/UPI app with an SMS-core use (SIM binding).
- **TU Expense Tracker (open source)**: reads bank SMS on device, stores data locally, distributed through F-Droid (not Play). — [F-Droid](https://f-droid.org/packages/com.tu.expense.manager/)
- **Fintonic (Spain)**
  - Licensed AISP/PISP by Banco de España.
  - The official help says accounts auto-refresh once a day, usually overnight, with manual refresh available. Consent must be renewed periodically (~90 days) or updates stop.
  - Sources: [Fintonic help – Actualización de cuentas](https://fintonic.ladesk.com/644347-Actualizaci%C3%B3n-de-cuentas); [Fintonic licence](https://www.fintonic.com/blog/fintonic-se-convierte-en-la-primera-fintech-con-licencia-del-banco-de-espana-para-prestar-servicios-simultaneos-de-agregacion-de-cuentas-e-iniciacion-de-pagos/); [Fintonic – PSD2](https://www.fintonic.com/blog/como-te-afecta-la-psd2-en-fintonic/)
  - Third-party reviews conflict on whether notifications are real-time. — [holainversion](https://holainversion.com/fintonic-opiniones/)
- **Not verified in this session (training knowledge)**:
  - Emma, Rocket Money, Monarch, YNAB and Cleo use aggregators (Plaid, TrueLayer, Yapily/GoCardless, etc.). PSD2 AIS without the user present is limited to 4 refreshes a day by the RTS, so lag runs from hours to a day and pending card authorisations are often missing.
  - Curve is itself a card that sits in front of other cards, so it sees every Curve transaction instantly.
  - Spendee and Wallet by BudgetBakers use bank sync via aggregators plus manual entry.
  - In China, Alipay/WeChat Pay are the payment rails themselves, so their bills (账单) are inherently real-time.
  - India's RBI Account Aggregator framework offers consented data pulls, not instant pushes.

### Inferences
- No credential-free third-party app in Europe achieves complete instant capture. The closest model is Android notification parsing, as SMS parsing works in India because banks there SMS every transaction by regulation-driven practice.
- In Spain, bank app push notifications fill the role that SMS plays in India.
- On iOS, apps cannot read other apps' notifications. FinanceKit was extended to the UK in 2025 (training knowledge, unverified here), but I did not confirm availability in Spain or the EU, and it only covers Apple Wallet data.
- iOS options for Taimo: Shortcuts automations ("When I tap Wallet card", which triggers on Apple Pay use) or Wallet transaction-based Shortcuts (training knowledge).

### Gaps
- No measured latency figures for Emma, Monarch, Rocket Money or YNAB.
- Revolut and N26 are not cited from primary sources here.
- Cleo, Spendee, Wallet by BudgetBakers and the China specifics were not researched.

## 5. Creative or lesser-known approaches

### Takeaway
Several alternatives exist, but each has a cost or ceiling:
- Bank email alerts via the Gmail API: restricted scope, with a yearly CASA assessment if data reaches a server.
- SMS: blocked on Play for non-default-SMS apps.
- NFC reading of the user's own card: does not give transaction history usable for tracking (inference).
- Wallet/Bank pushes on Wear OS: same listener mechanism.
- Becoming or partnering with an issuer: the only fully reliable route.

### Cited Findings
- **Gmail API**
  - Restricted scopes such as `gmail.readonly` require Google verification plus an annual CASA security assessment by an authorised lab. This applies when restricted-scope data is accessed, stored or transmitted "from or through a server". — [Truto (vendor)](https://truto.one/google/); [Nylas](https://developer.nylas.com/docs/cookbook/use-cases/build/google-oauth-scopes/); [Mimestream's CASA experience, Jun 2024](https://mimestream.com/blog/casa-verified)
  - Costs conflict: "$15,000 to $75,000" annual audits (2019 rollout) — [The Register, 2019](https://www.theregister.com/2019/02/11/google_gmail_developer/); versus "a few hundred to a few thousand dollars per year" — [DeepStrike 2025](https://deepstrike.io/blog/google-casa-security-assessment-2025); also [GMass](https://www.gmass.co/blog/google-oauth-verification-security-assessment/)
- **SMS on Android**: Play limits SMS permission groups to default SMS/Phone/Assistant handlers and declared exceptions. — [Play Console Help 9047303](https://support.google.com/googleplay/android-developer/answer/9047303). Practical consequence: Spanish banks mostly use pushes, not SMS, for purchases anyway (inference from Section 2).
- **Monzo-style webhooks** require being, or partnering with, the issuer. — [Monzo Community](https://community.monzo.com/t/webhook-issues/71013)

### Inferences (not sourced in this session; flag as ideas to validate)
- **Card linking**: Visa/Mastercard card-linked-offer programmes, for example through Fidel API, can deliver real-time authorisation webhooks for enrolled cards with user consent and no bank credentials. This is used by loyalty apps. It needs PCI-scoped enrolment and scheme approval, and coverage of Spanish issuers would have to be checked.
- **Email forwarding instead of the Gmail API**: the user sets a filter to auto-forward bank alert emails or receipts to a Taimo inbox (e.g. user@in.taimo.app). This avoids CASA entirely. Latency is the email latency, and it works on iOS too.
- **Bizum**: no public consumer API. Bizum payments appear as bank pushes and transfers, so the notification listener covers them.
- **Wear OS**: watch notifications mirror the phone's, so nothing new is gained. Taimo could run its listener on the phone only.
- **NFC**: since PSD2/EMV, contactless cards generally do not expose a usable transaction log to phones. Some cards keep an EMV log of the last few offline transactions, which is not reliable for tracking.
- **iOS Shortcuts automation** "Transaction" trigger (iOS 17+): fires when an Apple Pay/Wallet card is used and passes merchant and amount to an app intent. This would be the iOS counterpart for mobile payments, but not for physical card use. Verify availability in Spain.

### Gaps
- Fidel API coverage in Spain is unverified.
- Current CASA pricing is unverified.
- The iOS "Transaction" Shortcut trigger and its data fields are unverified in this session.

## 6. How Spaniards pay: mobile vs physical card (2024–2026)

### Takeaway
At points of sale in Spain, cash was still 57% of transactions in 2024 per Banco de España/ECB SPACE data. Card was 32% and mobile 7% (up from 4% in 2022). By value, mobile was about 12%. In Spain most card payments are still made with the physical card, so Wallet-only capture would miss the majority of card spending.

### Cited Findings
- SPACE 2024 for Spain at points of sale:
  - by number of transactions: card payments rose from 28% to 32% (2022→2024) and mobile from 4% to 7%;
  - cash was 57% of transactions in 2024, down 9 points since 2022;
  - "Soluciones de pago electrónico" include Apple Pay, Google Pay, PayPal and Klarna.
  - Source: [Banco de España, Boletín Económico 2025/T2, "Evolución y tendencias en los pagos de los consumidores"](https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/InformesBoletinesRevistas/BoletinEconomico/25/T2/Fich/be2502-art03.pdf) (search extract; PDF not fetchable here)
- Mobile's share by value doubled to 12% (sponsored article citing BdE). — [El Diario Cantabria (patrocinado)](https://eldiariocantabria.publico.es/articulo/patrocinados/espana-acelera-2025-monederos-electronicos-ganan-terreno-pagos-moviles-commerce/20250829104035181160.html)
- A survey estimate says 15% of Spaniards use digital wallets in shops (different methodology). — [PaynoPain](https://paynopain.com/en/blog/payment-methods-spain-2025-consumer-trends-and-habits/)
- A TradingView/Cointelegraph claim that cards and mobile overtook cash in shops conflicts with BdE's figures. Treat it with caution. — [TradingView](https://es.tradingview.com/news/cointelegraph:d9e848d0a09cd:0/)

### Inferences
- Card plus mobile (39% at POS) should be captured instantly, and physical card is roughly 4–5 times more frequent than mobile. The design should therefore rely on bank pushes on Android, with Wallet notifications only as a supplement.
- Cash (57%) still needs fast manual or voice entry.

### Gaps
- No 2025–2026 split of Apple Pay vs Google Pay in Spain.
- No breakdown by age group. Younger users, Taimo's likely audience, probably use mobile far more; this is unsourced.
