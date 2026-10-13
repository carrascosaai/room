# Detección automática de compras (tarjeta / Apple Pay / Google Wallet / Samsung Pay) en una app móvil: España y UE, 2026

Research date: 2026-10-13. Many vendor pages could not be fetched (DNS errors for gocardless.com, enablebanking.com, openbankingtracker.com, actualbudget.org, support.ynab.com), so several claims rest on search-result summaries rather than full-page reads. Those are flagged. Anything taken from background knowledge rather than a source is marked "(unverified)" and kept to Inferences/Gaps.

## 1. Open Banking PSD2 AIS through aggregators: options, pricing, coverage, licensing, latency, consent

### Takeaway
PSD2 AIS through an aggregator is still the only method that gives full coverage of Spanish bank and card movements on both iOS and Android. It is not instant: you get data by polling, the 4-calls-per-day limit applies when the user is not present, and many banks only expose booked transactions. The free tier a tiny startup would have used (GoCardless Bank Account Data, formerly Nordigen) reportedly closed to new sign-ups in July 2025. The rest are sales-led or usage-based (Tink about €0.50/user/month per a third party). Enable Banking is the most often cited self-serve replacement. You can work under the aggregator's licence as an agent or "licence-as-a-service" client, or register your own AISP with Banco de España, as Fintonic did.

### Cited Findings
**GoCardless Bank Account Data (Nordigen)**
- Nordigen was acquired by GoCardless and relaunched as "GoCardless Bank Account Data" in April 2023. Its original model was freemium, with free AIS access. — [Retail Banker International](https://www.retailbankerinternational.com/news/gocardless-to-buy-nordigen/); [Finance Director Europe](https://www.financedirectoreurope.com/news/gocardless-nordigen-open-banking-data-provider-acquisition/)
- Actual Budget's integration docs (search snippet) say GoCardless stopped accepting new Bank Account Data sign-ups from July 2025, and existing users keep working. — [Actual Budget docs](https://actualbudget.org/docs/advanced/bank-sync/gocardless/). I could not fetch GoCardless's own announcement page ([gocardless.com/bank-account-data/announcement](https://gocardless.com/bank-account-data/announcement)). The developer overview still describes sign-up ([developer.gocardless.com](https://developer.gocardless.com/bank-account-data/overview)), so this conflict is not resolved by an official text I could read.
- Open Banking Tracker (search snippet) also describes Nordigen's free AIS tier as "closed to new signups and being wound down" and names Enable Banking as the closest self-serve replacement. — [Open Banking Tracker – Free & Indie Open Banking APIs](https://www.openbankingtracker.com/guides/free-open-banking-apis)

**Enable Banking (Finland, licensed AISP/PISP)**
- Production pricing is sales-led and volume-based: price per accessed account and per payment per month, with a minimum monthly invoice. There is no confirmed public free production tier, and one comparison site's "free tier" claim is unconfirmed. — [Open Banking Tracker guide](https://www.openbankingtracker.com/guides/free-open-banking-apis); [banq.ai Belvo vs Enable Banking](https://banq.ai/api-aggregators/belvo/vs/enablebanking)
- Enable Banking keeps a Spain market-specifics page covering bank-specific behaviour (e.g., BBVA's redirect-flow API, Bankinter's interface). — [Enable Banking – Open Banking Specifics in Spain](https://enablebanking.com/docs/markets/es/) (page not fetchable; details from search snippet)
- Changelogs are active through 2026. — [Enable Banking Changelog March 2026](https://enablebanking.com/blog/2026/04/08/enable-banking-changelogmarch-2026)

**Tink (Visa)**
- A Finexer blog (a competitor, so possibly biased or outdated) says Tink has Standard and Enterprise tiers. Standard Transactions starts at about €0.50 per user per month and Account Check at €0.25 per verification. Enterprise pricing is by quote. — [Finexer – Tink pricing](https://blog.finexer.com/tink-pricing/)

**Salt Edge**
- No public price list. Pricing is usage-based or custom, by sales quote. — [Finexer – Salt Edge pricing](https://blog.finexer.com/salt-edge-pricing/); [rfp.wiki Salt Edge](https://www.rfp.wiki/vendors/salt-edge)
- Salt Edge has partnered with Emma to extend Emma's coverage. — [Temenos/Salt Edge news](https://www.temenos.com/?p=43898)

**Yapily**
- Yapily launched in Spain in 2021 and claimed more than 95% coverage of Spanish bank accounts at that time. This is old data. — [Yapily blog](https://www.yapily.com/blog/the-yapily-platform-is-live-in-spain); [Open Banking Expo](https://www.openbankingexpo.com/news/yapily-launches-in-spain)
- Yapily provided Emma's aggregation infrastructure. — [Yapily award blog](https://www.yapily.com/blog/yapily-wins-best-open-banking-solution-uk-at-banking-tech-awards-2022)

**TrueLayer / Plaid (EU)**
- TrueLayer retired coverage for "a number of countries" from 21 January 2025. YNAB moved its European direct import to Plaid as a result. — [YNAB – Direct Import in Europe](https://support.ynab.com/en_us/direct-import-in-the-uk-and-eu-an-overview-Syae1z_A9)
- YNAB's help article (updated July 2026, per search snippet) lists 18 supported countries through Plaid, including Spain. — [YNAB support](https://support.ynab.com/en_us/direct-import-in-europe-Syae1z_A9.md)
- Yapily (a competitor) says Plaid covers only 14 European countries. — [Yapily – Plaid alternatives](https://yapily.com/blog/plaid-alternatives)

**Afterbanks / Unnax / Powens (Spanish players)**
- Afterbanks, a Spanish aggregator founded in 2012, was acquired by Minsait (Indra) in 2019. — [The Paypers](https://thepaypers.com/payments/news/minsait-acquires-spanish-fintech-afterbanks-to-connect-with-open-banking-data); [Retail Banker International](https://www.retailbankerinternational.com/news/afterbanks-acquisition-minsait-completes-afterbanks-acquisition/)
- Powens (France) completed its acquisition of Unnax (Spanish EMI and aggregator) in April 2024 after Banco de España approval. — [Powens blog](https://powens.com/blog/acquisition-of-spanish-emi-unnax); [Moncloa.com](https://www.moncloa.com/2024/04/24/powens-culmina-la-adquisicion-de-unnax-tras-la-aprobacion-del-banco-de-espana-2570448/)
- Open Banking Tracker lists 38 API aggregators with coverage in Spain. — [Open Banking Tracker – Spain aggregators](https://openbankingtracker.com/api-aggregators?country=ES)

**Licensing (own AISP vs agent)**
- In Spain the registering authority for AISPs is Banco de España, under Real Decreto-ley 19/2018. A 2026 guide counts about 15 registered AISPs, Fintonic among them. — [Crassula – AISP licence guide (ES)](https://crassula.io/es/guides/licenses/aisp/)

**Consent renewal: 90 to 180 days**
- The EBA final report (April 2022) introduced a mandatory SCA exemption for AISP access and extended the SCA renewal period from 90 to 180 days, to reduce friction for AIS users. It was to apply 7 months after publication in the Official Journal. — [EBA press release](https://www.eba.europa.eu/publications-and-media/press-releases/eba-publishes-final-report-amendment-its-technical-standards); [PaytechLaw](https://paytechlaw.com/en/regulatory-technical-standards-rts-sca-csc/)

### Inferences
- From background knowledge, unverified in this session: the amendment became Commission Delegated Regulation (EU) 2022/2360, applicable from 25 July 2023. The 180-day SCA exemption applies when the AISP accesses the bank directly. The RTS (Art. 36(5)) limits AISP access without the user present to 4 times per 24 hours unless agreed otherwise. Polling therefore gives at best roughly 4 refreshes a day in the background, plus a refresh each time the user opens the app.
- Whether pending (authorised but not settled) card transactions appear varies by bank. Many Spanish banks expose only booked transactions, so a card purchase can show up 1 to 3 days later (unverified; the bank-by-bank detail on Enable Banking's Spain page could not be read).
- For a tiny startup without a licence, the realistic paths are:
  - (a) Enable Banking, which has a sandbox and lets you link your own accounts free (unverified), then a quoted production contract.
  - (b) Tink Standard at about €0.50/user/month.
  - (c) Salt Edge or Yapily by quote.
  - All of these operate under the provider's licence, with the startup as client or agent. Your own AISP licence (Banco de España, professional indemnity insurance, etc.) only makes sense later.
- Transaction enrichment (merchant cleaning, categories, sometimes MCC) is sold as an add-on by Tink, Salt Edge and Yapily. Raw PSD2 data usually carries only the bank's free-text description (unverified; no pricing page read).

### Gaps
- Official GoCardless confirmation of the July 2025 sign-up closure (page not reachable).
- Current public pricing for Enable Banking, Salt Edge, Yapily, TrueLayer, Plaid EU, Finexer (UK-focused) and Belvo (mainly LatAm; no Spain evidence found).
- Bank-by-bank Spanish coverage: BBVA, Santander, CaixaBank, Sabadell, Bankinter, ING, Openbank, Unicaja, Kutxabank, Revolut, N26, and which of them return pending transactions. No coverage table was readable.

## 2. Apple FinanceKit: availability and use by a Spanish app

### Takeaway
FinanceKit only works in the US (Apple Card, Apple Cash, Savings; iOS 17.4+) and the UK (open-banking-linked accounts in Wallet; iOS 18.4+). The app must be distributed in the US or UK App Store, sit in the Finance category, and be granted an entitlement. As of October 2026, a Spanish app cannot use it for Spanish users.

### Cited Findings
- Countries and requirements:
  - US: iOS 17.4+, Apple Card (excluding Family participants), Apple Cash, Savings.
  - UK: iOS 18.4+, open banking with Barclays, Barclaycard, First Direct, Halifax, HSBC, Lloyds, M&S Bank, MBNA, Monzo, Nationwide, NatWest, RBS, Santander and others.
  - Source: [Apple – Get started with FinanceKit](https://developer.apple.com/financekit)
- Eligibility:
  - The FinanceKit entitlement must be requested by the Account Holder through a form, and is granted per bundle ID.
  - The app must be in the Finance category and distributed in the US or UK App Store, and must provide financial-management tools (budgeting, net worth, spending).
  - If the app offers financial products, users must be able to add them to Wallet.
  - Source: [Apple – FinanceKit](https://developer.apple.com/financekit)
- Data "synced automatically in the background", with no stated real-time guarantee. — [Apple – FinanceKit](https://developer.apple.com/financekit)
- A 2024 Computerworld piece noted that tensions with Goldman Sachs seemed to have derailed rapid expansion. — [Computerworld](https://www.computerworld.com/article/3714141/what-is-financekit-in-ios-174.html)

### Inferences
- No source found for an announced EU or Spain expansion. Apple's UK implementation depends on Apple acting as an open-banking AISP in the UK, so a Spanish rollout would need an equivalent Wallet "connected accounts" feature in Spain. Keep monitoring.

### Gaps
- No 2026 announcement found about new FinanceKit countries.

## 3. iOS Shortcuts "Transaction" automation (iOS 17+)

### Takeaway
The Shortcuts Transaction trigger fires when a Wallet card or pass is tapped. It can pass merchant, amount and card to an App Intent in your app, giving near-instant capture of Apple Pay purchases. It works with any card in Apple Wallet and is not tied to a country.

The limits matter, though:
- It only covers Apple Pay taps.
- The user has to build the automation once.
- It is unreliable: timeouts, blank values, late data and firing on declined payments are reported from October 2024 to February 2026.

### Cited Findings
- iOS 17 added the Transaction automation. It can filter by card, category or merchant, and its input exposes card, merchant and amount. — [Matthew Cassinelli](https://matthewcassinelli.com/shortcuts-automations-ios-ipados-transaction-display-stage-manager/); [iDrop News](https://www.idropnews.com/ios-17/this-new-ios-17-shortcut-will-help-you-keep-track-of-your-spending/197589/)
- BudgetBakers (Wallet app) documents a setup where the automation calls the app's "Add transaction" action and maps the Shortcut Input's Amount and Merchant fields. It warns that amounts in a foreign currency may differ. — [BudgetBakers support](https://support.budgetbakers.com/hc/en-us/articles/26593713953554)
- Other examples:
  - Effective Expenses advertises automatic import of Wallet transactions through Shortcuts and App Intents, and requires iOS 26+. — [App Store – Effective Expenses](https://apps.apple.com/app/6677000206)
  - A creator guide covers DIY expense tracking with the trigger. — [TechTiff Substack](https://techtiff.substack.com/p/apple-wallet-expense-tracker-shortcuts)
- Reliability issues reported in the Apple Developer Forums (Oct 2024 to Feb 2026, no Apple reply):
  - "Hit timeout waiting for transaction".
  - Wallet receives the transaction hours late; one case was a 12:25 purchase notified about 16:00.
  - Fires on declined transactions.
  - Some cards never trigger (Nubank; Mastercard failing while Visa works).
  - Bug reports FB14035016 and FB16379100.
  - Source: [Apple Dev Forums 765516](https://developer.apple.com/forums/thread/765516)
- Merchant and amount sometimes arrive blank or 0.0. — [Apple Dev Forums 797233](https://developer.apple.com/forums/thread/797233)

### Inferences
- In Spain, any bank card in Apple Wallet whose issuer sends Wallet transaction notifications should trigger it, because the trigger is local to Wallet. Data quality depends on the issuer, since Wallet's merchant and amount come from the issuer's notification feed.
- The user can set the automation to "Run immediately" (no confirmation; from background knowledge, unverified here). The app has to provide an App Intent (e.g., "Log transaction") with amount, merchant and card parameters, plus onboarding that walks the user through creating the automation.
- Not covered: physical card swipes, online card-number payments, transfers, Bizum and direct debits. It works best combined with PSD2 for completeness and deduplication.

### Gaps
- Could not confirm from a primary source whether Cashew, Dime, MoneyCoach or Toshl implement Transaction-trigger App Intents.
- No official Apple documentation found listing the trigger's exact output fields.

## 4. Android: NotificationListenerService, Google Wallet / Samsung Wallet, Play policy

### Takeaway
On Android an app can read Google Wallet and bank push notifications through NotificationListenerService. This gives near-instant capture after the user grants notification access in a special settings screen. It is used by indie trackers (e.g., Ginti) and, with SMS, by India-style trackers. Google Play treats it as sensitive. Expect a permissions declaration and core-functionality justification, and no harvesting of unrelated notifications.

### Cited Findings
- Ginti, an indie app launched around March 2026, reads transaction alerts on Android by detecting financial notifications. On iOS it relies on users pasting alerts because Apple does not allow background notification access. — [Indie Hackers – Ginti](https://www.indiehackers.com/product/ginti)
- TU Expense Tracker (open source, F-Droid) automatically reads bank SMS alerts and stores them locally in SQLite. — [F-Droid](https://f-droid.org/packages/com.tu.expense.manager/)
- Google Play may require the Permissions Declaration Form for high-risk or sensitive permissions. Deceptive or undeclared use can lead to app suspension or developer account termination. — [Play Console Help 10158779](https://support.google.com/googleplay/android-developer/answer/10158779?hl=en); [Play Console Help 9859456](https://support.google.com/googleplay/android-developer/answer/9859456); [Play Console Help 12564964](https://support.google.com/googleplay/android-developer/answer/12564964)
- A third-party security write-up describes notification listener access as among the most privacy-sensitive capabilities, granted through a special settings screen. It advises using it only for a core feature and not transmitting unrelated notification content. — [ptkd.com](https://ptkd.com/journal/android-notification-listener-service-security)

### Inferences
- SMS parsing (Walnut-style) does not fit Spain. Spanish banks rely on app push notifications rather than SMS for purchases, and READ_SMS is heavily restricted on Play (unverified here).
- Google Wallet in Spain shows a payment notification after a tap (merchant and amount; unverified for Spain specifically). Bank apps (BBVA, CaixaBank, Revolut, N26, etc.) send their own push notifications. Parsing both per-language and per-bank templates is fragile but nearly instant.
- Samsung Wallet: no source found on transaction notifications or APIs. Treat it like Google Wallet, i.e., notification parsing only.

### Gaps
- Exact current Google Play policy text for BIND_NOTIFICATION_LISTENER_SERVICE in finance apps. No Google policy page specific to notification access was retrieved.
- Whether Cashew or Money Lover use notification parsing was not confirmed.

## 5. Other methods: email, CSV/PDF, OCR, own card issuing, card-linking

### Takeaway
Card issuing through BaaS (Swan, Treezor) gives true real-time webhooks on authorisation, but it means the user has to switch cards, which is a heavy lift. Email, CSV/PDF and OCR import are cheap fallbacks with no real-time capture. No pricing for issuing or for Visa/Mastercard card-linking was found.

### Cited Findings
- Treezor exposes card transaction webhooks: authorisation, settlement and refund events. It offers real-time authorisation control ("Multi-Criteria Dynamic Card"). — [Treezor docs – card transactions](https://docs.treezor.com/guide/cards/transactions.html); [Treezor webhooks events](https://docs.treezor.com/guide/webhooks/events-descriptions.html)
- Swan's pricing page frames revenue around interchange sharing (e.g., about 1.5% interchange on company cards) and does not list a public per-card fee schedule. — [Swan pricing](https://www.swan.io/fr/pricing)

### Gaps
- Swan, Treezor and Marqeta minimum fees or setup costs, and Visa/Mastercard card-linking API (e.g., merchant offers programmes) access for startups. No sources were found in this session.
- Email receipt parsing (Gmail API restricted-scope security assessment cost) was not researched due to the tool-call budget.

## 6. Instant capture and the best combination; how competitors capture data

### Takeaway
Only device-side signals give near-instant capture: the iOS Transaction trigger (Apple Pay only, flaky) and Android notification listening (any notifying app). Completeness requires PSD2 AIS polling, which can be delayed by hours or days. The best setup for a startup is AIS through an aggregator as the source of truth, plus device-side instant capture, with deduplication when booked transactions arrive.

Competitors rely on aggregators or their own AISP licences:
- Emma: Yapily and Salt Edge, plus its own FCA registration.
- YNAB Europe: TrueLayer, then Plaid from January 2025.
- Fintonic: its own Banco de España AIS/PIS registration.
- BudgetBakers Wallet: adds the iOS Transaction trigger.

### Cited Findings
- Fintonic is registered with Banco de España for account information and payment initiation services. Registration number 6892 is reported only by Roams. — [Roams](https://roams.es/finanzas/entidades-financieras/fintonic/opiniones/?page=9); [Finovate](https://finovate.com/fintonic-becomes-latest-challenger-bank-to-receive-banking-license/) (Finovate mislabels this as a "banking license"); [Crassula](https://crassula.io/es/guides/licenses/aisp/)
- Emma was registered with the FCA as an AISP in 2018 and uses Yapily and Salt Edge for aggregation. — [City AM](https://www.cityam.com/?p=232355); [Yapily](https://www.yapily.com/blog/yapily-wins-best-open-banking-solution-uk-at-banking-tech-awards-2022); [Temenos/Salt Edge](https://www.temenos.com/?p=43898)
- YNAB Europe: TrueLayer from 2021, Plaid from January 2025; Spain is supported. — [YNAB support](https://support.ynab.com/en_us/direct-import-in-the-uk-and-eu-an-overview-Syae1z_A9); [YNAB what's new](https://ynab.com/whats-new/direct-import-in-the-uk-and-eu)
- BudgetBakers Wallet supports Apple Pay capture through the Shortcuts Transaction trigger. — [BudgetBakers support](https://support.budgetbakers.com/hc/en-us/articles/26593713953554)
- Actual Budget integration developers report frequent Transaction-trigger failures. — [Apple Dev Forums 765516](https://developer.apple.com/forums/thread/765516)

### Inferences
- Revolut has instant notifications for its own cards because it is the issuer. Copilot (US) uses Plaid-type aggregation, and FinanceKit for Apple Card (unverified; no source retrieved).
- Recommended architecture for a tiny Spanish startup:
  1. Enable Banking or Tink for AIS. Budget roughly €0.3–1 per active user per month, as an estimate.
  2. An iOS App Intent plus guided Transaction automation for instant Apple Pay entries.
  3. An Android NotificationListener parsing Google Wallet and major Spanish bank notifications, with a Play declaration.
  4. CSV import as a fallback.
  5. Fuzzy-match deduplication of instant entries against AIS booked transactions on amount, date ±3 days and merchant.

### Gaps
- Revolut and Copilot technical data sources not verified with sources in this session.
- Fintonic's Banco de España register entry not checked on the official register.
