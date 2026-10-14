# Cambios de mercado, tecnología y regulación (2023-2026) que afectan a Taimo

Research date: 14 Oct 2026. About 22 searches and fetches. bde.es, actualbudget.org and dev.to could not be fetched directly (DNS errors), so some figures come from press summaries and are marked as such.

## 1. Open banking: PSD2 / PSD3-PSR / FiDA, agregadores y re-consentimiento

### Takeaway
The regulatory frame is still moving: PSD3/PSR has a provisional deal (Nov 2025) but is not in force, and FiDA has not been adopted yet. Free bank-sync infrastructure has also got worse: GoCardless Bank Account Data (formerly Nordigen), the free option indie apps used, reportedly stopped accepting new sign-ups in July 2025. For a new entrant, building on bank sync means paying an aggregator and depending on periodic re-consents. That strengthens the case for Taimo's approach of capturing payments on the device without bank credentials.

### Cited Findings
- **PSD3/PSR:** The European Parliament and the EU Council announced a provisional political agreement on PSD3 (directive) and PSR (regulation) on 27 Nov 2025. — [Hogan Lovells](https://www.hoganlovells.com/en/publications/final-texts-for-psd3-and-psr-awaited-as-european-parliament-and-council-of-eu-announce-provisional)
- On 23 Apr 2026 the Council published the final compromise texts. Formal adoption by Council and Parliament and publication in the OJEU are still pending. — [A&L Goodbody](https://www.algoodbody.com/insights-publications/psd-3-psr-final-compromise-texts-published); [Hogan Lovells](https://www.hoganlovells.com/en/publications/final-texts-for-psd3-and-psr-awaited-as-european-parliament-and-council-of-eu-announce-provisional)
- During the negotiation, the co-legislators backed a single standardised permissions dashboard aligned with FiDA. — [Capco](https://www.capco.com/intelligence/capco-intelligence/psd3-psr-the-council-of-the-eu-proposal-on-the-consent-panel-and-fraud)
- **FiDA:** A Feb 2025 rumour said the Commission had dropped FiDA from its 2025 work programme. It was not withdrawn. — [Vixio, Feb 2025](https://www.vixio.com/insights/pc-fida-lives-see-another-day-european-commission-backs-away)
- In an update dated 12 Mar 2026, HSF Kramer describes FiDA as still in the legislative process before Parliament and Council. The first trilogue was in Apr 2025. — [HSF Kramer](https://www.hsfkramer.com/notes/fsrandcorpcrime/2025-posts/eu-data-access-reg)
- Some secondary sources predicted adoption in mid-2026 with application from 2027. This is a forecast, not a confirmed fact. — [Fiskil tracker](https://www.fiskil.com/open-finance-tracker/standard/fida); [Paytechlaw](https://paytechlaw.com/en/whats-next-for-fida/)
- **90 to 180 days:** The EBA's final report on amending the SCA RTS (Apr 2022) created a mandatory SCA exemption for access through AISPs. It also extended the SCA renewal period from 90 to 180 days, applicable 7 months after OJ publication. In practice, from mid-2023 the user has to re-authenticate with their bank at least every 180 days. — [EBA](https://www.eba.europa.eu/publications-and-media/press-releases/eba-publishes-final-report-amendment-its-technical-standards)
- Plaid argued the industry wanted 365 days because 180 does not remove the friction ("180 days is not enough"). — [Plaid blog via plushcap](https://plushcap.com/content/plaid/blog/180-days-is-not-enough)
- **GoCardless Bank Account Data (ex-Nordigen):** GoCardless bought Nordigen in Jul 2022, and its free open-banking API was relaunched as Bank Account Data in Apr 2023. — [tech.eu](https://tech.eu/2022/07/01/gocardless-swipes-up-latvias-open-banking-and-data-insights-api-provider-nordigen/); [shkspr.mobi, Oct 2023](https://shkspr.mobi/blog/2023/10/free-open-banking-api-using-nordigen-gocardless/)
- According to Actual Budget's documentation, GoCardless stopped accepting new Bank Account Data accounts from July 2025, while existing accounts keep working. A DEV Community guide also says new sign-ups are disabled. I found no primary GoCardless statement. — [Actual Budget docs](https://actualbudget.org/docs/advanced/bank-sync/gocardless/); [DEV Community](https://dev.to/johnfrandsen/gocardless-bank-account-data-alternatives-what-to-use-when-signups-are-disabled-326d)
- Developer guides from 2026 cite post-acquisition price changes and free-tier rate limits as reasons to migrate to other European providers. — [DEV Community 2026](https://dev.to/johnfrandsen/nordigen-alternatives-in-2026-a-developers-guide-to-european-bank-data-apis-3pie)
- **Spanish precedent:** Fintonic holds a Banco de España licence for account information and payment initiation services. That is the regulatory route for an app that reads bank accounts. — [Fintonic, App Store ES](https://apps.apple.com/es/app/fintonic-ahorra-y-fin%C3%A1nciate/id672220319)

### Inferences
- If GoCardless's free tier is gone for new customers, a new app has to pay per connection or per user (Tink, Salt Edge, TrueLayer, Enable Banking, etc.) or obtain its own AISP licence, which is expensive for a small startup. Taimo's model (Apple Pay / Google Wallet capture with no bank credentials) avoids that cost and the 180-day re-consent cut-offs.
- The PSR consent dashboard and FiDA will probably not change the picture for consumers before 2027-2028.

### Gaps
- Current list prices for Tink, Salt Edge, TrueLayer and Plaid EU: not verified (they are usually behind a sales process).
- No primary GoCardless announcement of the sign-up closure. The date (Jul 2025) comes from third parties.
- Exact OJ publication date of the amended SCA RTS (Regulation 2022/2360, published Dec 2022, applicable 25 Jul 2023, per my prior knowledge; not verified in this session).

## 2. Apple (FinanceKit, Shortcuts "Transaction", NFC under DMA) and Google Wallet

### Takeaway
FinanceKit, the official API for reading Wallet transactions, is not available in Spain or the EU. Apple lists only the US (iOS 17.4+, Apple Card/Cash/Savings) and the UK (iOS 18.4+, through open banking). The workable route in Spain today is the Shortcuts "Transaction" automation (iOS 17+), which fires when a card is tapped in Wallet and passes the merchant and amount to an app. That is exactly the gap Taimo targets, and other apps already use it.

### Cited Findings
- **FinanceKit availability:** US on iOS 17.4+ (Apple Card, Apple Cash, Savings) and UK on iOS 18.4+ through open banking (Barclays, HSBC, Lloyds, Monzo, Nationwide, NatWest, Santander UK, etc.). Spain and the EU are not mentioned. Checked 14 Oct 2026. — [Apple Developer, FinanceKit](https://developer.apple.com/financekit)
- **FinanceKit requirements:** Apple-granted entitlement (request form; per bundle ID), app in the Finance category distributed on the App Store in the US/UK, and the app must offer financial-management tools (net worth, spending trends, budgeting). — [Apple Developer, FinanceKit](https://developer.apple.com/financekit)
- At launch, FinanceKit was US-only, and the UK expansion relies on open banking. — [Computerworld](https://www.computerworld.com/article/3714141/what-is-financekit-in-ios-174.html)
- **Shortcuts "Transaction" trigger (iOS 17, 2023):** It runs an automation when a Wallet card or pass is tapped. It can filter by card, category or merchant, and passes card, merchant and amount as input. — [Matthew Cassinelli](https://matthewcassinelli.com/shortcuts-automations-ios-ipados-transaction-display-stage-manager/); [MacStories iOS 17 review](https://www.macstories.net/stories/ios-and-ipados-17-the-macstories-review/12/); [iDropNews](https://www.idropnews.com/ios-17/this-new-ios-17-shortcut-will-help-you-keep-track-of-your-spending/197589/)
- Competing apps already use it: Effective Expenses (imports Apple Wallet transactions through Shortcuts; requires iOS 26), Walletry (Apple Pay tracking through App Intents/Shortcuts), and TravelSpend (guide to setting up the Apple Pay automation). — [Effective Expenses](https://apps.apple.com/app/6677000206); [Walletry](https://apps.apple.com/app/id6458391876); [TravelSpend help](https://help.travel-spend.com/shortcuts--automation/ignQHsp85RQDsig2QwVcdX/set-up-apple-pay-automation/7tL8XfjBceg4D7mQeiSK2V)
- Known failure point: if mobile data is disabled for the Wallet app, the automation fails. — [techtiff substack](https://techtiff.substack.com/p/apple-wallet-expense-tracker-shortcuts)
- **NFC opened under EU rules:** The Commission closed its antitrust case in Jul 2024 after Apple committed to opening NFC free of charge to third parties in the EEA and letting users choose a default payment app. With iOS 18.1 (Oct 2024), the NFC & SE APIs also reached the US, UK, Canada, Australia, Japan and others, subject to a commercial agreement with Apple and fees outside the EEA. — [PhoneArena](https://phonearena.com/news/apple-allows-third-party-developers-to-offer-contactless-transactions-ios-18.1_id161446); [TechRadar](https://www.techradar.com/phones/iphone/ios-181-will-open-up-apple-pay-on-your-iphone-but-that-could-be-a-mixed-blessing)
- Alternative wallets: Vipps (Norway, Dec 2024) was the first; PayPal (Germany) and Curve (EU, May 2025) followed. — [9to5Mac](https://9to5mac.com/2024/12/09/vipps-nfc-wallet-iphone/); [Payments Industry Intelligence](https://paymentsindustryintelligence.com/?p=56323); [Tom's Guide](https://www.tomsguide.com/phones/iphones/the-eu-just-forced-apple-to-open-up-the-iphones-tap-to-pay-feature-now-paypal-is-moving-in)

### Inferences
- Without FinanceKit in the EU, the Shortcuts automation is the only official, credential-free way to capture Apple Pay payments in Spain. It is replicable, though: several apps already do it. The differentiation has to come from setup UX, automatic categorisation and shared expenses, not from the capture method alone.
- If Apple extends FinanceKit to the EU, perhaps through open banking as in the UK, there would be a direct API, but Taimo would have to meet the Finance-category and entitlement requirements. Watch WWDC.
- Payments made through alternative NFC wallets (Curve, PayPal) probably do not fire the Wallet "Transaction" trigger. That is a coverage risk.

### Gaps
- **Google Wallet/Android:** I found no sources on Wallet's notification API. The usual technique (reading notifications with NotificationListenerService) and Play Store policy on it remain unverified.
- No public Spain-specific announcement of FinanceKit for the EU (as of Oct 2026).
- Exact availability of Curve/PayPal NFC in Spain: not confirmed.

## 3. Notable events: shutdowns, acquisitions and model changes

### Takeaway
Big players' consolidations and model changes have left users stranded: Mint closed (2024) and moved users to Credit Karma without budgets; Tricount, owned by bunq, dropped Premium and some features in its new app and now pushes the bunq card; Splitwise limits free use to about 3 expenses per day. This creates switching moments that a small entrant can capture.

### Cited Findings
- **Mint:** Intuit announced in Nov 2023 that Mint would close on 1 Jan 2024 and move users to Credit Karma, which "does not offer the ability to set monthly and category budgets". — [CNBC, 7 Nov 2023](https://www.cnbc.com/2023/11/07/budgeting-app-mint-is-shutting-down-users-are-disappointed.html); [PCWorld](https://www.pcworld.com/article/2125596/the-popular-mint-budgeting-tool-is-shutting-down.html)
- WalletHub puts the final closure on 23 Mar 2024. This is a single source. — [WalletHub](https://wallethub.com/edu/b/what-happened-to-mint/151868)
- **Tricount/bunq:** bunq bought Tricount in May 2022, becoming "the EU's second-largest neobank" by users. — [TechCrunch, 3 May 2022](https://techcrunch.com/2022/05/03/bunq-to-acquire-group-expenses-app-tricount/)
- The new Tricount app is free for everyone and drops Premium. It removes export, custom categories and per-expense exchange rates, and at launch leaves out statistics and saved custom splits. It integrates the bunq card, which adds payments automatically. Premium subscribers were offered 6 months of a bunq plan (€59.94). Launch date not confirmed. — [Tricount, "What happened with Premium"](https://tricount.com/en/what-happened-with-premium); [Tricount help](https://help.tricount.com/articles/what-happened-with-tricount-premium)
- **Splitwise:** User reviews from late 2023 to early 2025 describe a free-tier cap of about 3 expenses per day (one says 4), with 10-second ads. Pro pricing is inconsistent across sources ($5/month, £3.99/month) and is not published on the website. — [Yellow Slice](https://www.yellowslice.in/blog/splitwise-app-review-ux-ui-improvements); [Trustpilot](https://ie.trustpilot.com/review/splitwise.com?page=2)
- **Fintonic (Spain):** Its model is to charge financial institutions when the user takes out a product (loans, insurance from 40+ insurers); it says it never charges the user. — [App Store ES](https://apps.apple.com/es/app/fintonic-ahorra-y-fin%C3%A1nciate/id672220319); [Forbes ES](https://forbes.es/?p=10383)
- Forbes raised a possible conflict of interest between advising and selling the products of partner institutions. The company replied that a product committee filters them. — [Forbes ES](https://forbes.es/?p=10383)
- Marketing4eCommerce notes that the model came under pressure once banks built their own personal-finance management tools. — [Marketing4eCommerce](https://marketing4ecommerce.net/que-es-fintonic-ronda/)
- **Spendee/BudgetBakers:** I found no evidence of a shutdown or acquisition in 2025. CB Insights lists Spendee as "alive" (undated). — [CB Insights](https://www.cbinsights.com/company/spendee)
- Mooch (a budgeting app) was acquired by SUMA in Oct 2024. — [CB Insights](https://www.cbinsights.com/compare/budgetbakers-vs-mooch-1)

### Inferences
- Tricount losing its multi-currency features (custom exchange rate per expense) and export leaves room for Taimo's multi-currency for travellers.
- The bunq/Tricount integration (card payments added automatically to the group) is the closest competitor to Taimo's auto-capture hook, but only for bunq customers.

### Gaps
- No AEPD (Spanish data protection authority) sanction or formal controversy involving Fintonic found.
- Spendee price changes and Splitwise's official pricing not verified.
- No reliable data on other personal-finance app shutdowns in Spain 2024-2026.

## 4. Consumer trends in Spain and the EU

### Takeaway
Spain is still cash-heavy in shops (57% use it as their main means of payment in 2025), but mobile is growing fast and Bizum is mass-market (30.6M users, 1,237M transactions in 2025). Taimo's ideal user already pays by mobile or card and splits expenses through Bizum.

### Cited Findings
- **Bizum 2025:** 30.6M users; 1,237M transactions (+13.2% vs 2024); €67,751M volume (+53.3%); 3.4M transactions/day; daily record of 5.3M on 28 Nov 2025 (Black Friday); online purchases +82.1% to 105.6M. 2026 forecast: 32.5M users and >1,400M transactions. — [Infobae/EP, 19 Jan 2026](https://www.infobae.com/espana/agencias/2026/01/19/el-volumen-de-operaciones-con-bizum-crecio-un-53-en-2025-y-se-situo-en-67751-millones/); [ESdiario](https://www.esdiario.com/economia/260119/177353/bizum-supera-1-237-millones-operaciones-2025-13-2.html)
- In 2024 Bizum grew 17% to about 1,100M transactions. — [El Observador, 21 Jan 2025](https://www.elobservador.com.uy/espana/empresas-y-negocios/bizum-crece-un-17-y-alcanza-los-1100-millones-operaciones-2024-n5980670)
- CaixaBank: 9.25M customers registered on Bizum at end-2025 (>30% share). — [Forbes ES](https://forbes.es/economia/900984/caixabank-alcanza-los-925-millones-de-clientes-registrados-en-bizum-en-2025/)
- **Banco de España, cash-habits study 2025 (12 Nov 2025):** 57% use cash as their main means of payment in physical shops (59% in 2024); 55% use it daily (57%); card is second at 27% (30% in 2024). For payments between individuals, cash is at 57% (63% in 2024) and Bizum rises from 33% to 37%. — [BdE press release presbe2025_110](https://www.bde.es/f/webbe/GAP/Secciones/SalaPrensa/NotasInformativas/25/presbe2025_110.pdf) (via [Forbes ES](https://forbes.es/economia/826763/el-uso-del-efectivo-en-comercios-cae-al-57-en-2025-dos-puntos-menos-segun-banco-de-espana/) and [Diario de León](https://www.diariodeleon.es/economia/251229/2070805/generacion-bizum.html))
- According to Forbes, mobile-device use rose to 15% (from 11%). Another figure (16%) appears in the press; the sources conflict. — [Forbes ES](https://forbes.es/economia/826763/el-uso-del-efectivo-en-comercios-cae-al-57-en-2025-dos-puntos-menos-segun-banco-de-espana/)
- **ECB SPACE 2024 (euro area, published 19 Dec 2024):** cash was used in 52% of point-of-sale transactions (59% in 2022). By value, card 45%, cash 39%, mobile apps 7% (4% in 2022). — [ECB press release](https://www.ecb.europa.eu/press/pr/date/2024/html/ecb.pr241219~172b929461.pt.html); [fintech.global](https://fintech.global/2025/01/07/ecb-report-highlights-steady-increase-in-digital-payment-adoption-across-europe/)
- Mobile above 10% of point-of-sale transactions in the Netherlands, Finland and Ireland, and below 5% in seven countries (Spain not identified). — [Social Justice Ireland](https://socialjustice.ie/node/7185)
- 62% of Europeans value cash for privacy (SPACE). — [Paperjam](https://en.paperjam.lu/article/cash-is-king-for-privacy-why-62-of-europeans-refuse-to-let-go)
- **Gen Z Spain:** A small study from Comillas University (83 responses) finds medium-high financial literacy (4.27/6). — [Comillas repository](https://repositorio.comillas.edu/xmlui/handle/11531/98632)
- BNP Paribas, quoted in a Spanish outlet: 36% of 16-27-year-olds prefer 100% digital banking (country unclear). — [sincomisiones.org](https://sincomisiones.org/blog/ahorro-y-criptos-gestion-dinero-generacion-z)

### Inferences
- With roughly 57% still paying in cash in shops, automatic Wallet capture covers only part of spending. Fast manual entry, or voice entry, of cash spending is still necessary.
- Bizum is the default way to settle debts between friends in Spain, so a "pay with Bizum" button or link in shared expenses is a strong local fit.

### Gaps
- Apple Pay/Google Pay penetration in Spain (no official figure found; Statista is paywalled).
- Spanish data on interest in budgeting apps, subscription fatigue, and distrust of sharing bank passwords: no reliable survey found in this session. Not found: Ditrendia/IAB 2025.
- ECB SPACE figures for Spain specifically.

## 5. Privacy and attitudes towards apps that sell financial products or data

### Takeaway
GDPR plus the PSD2 framework requires explicit consent and a licence to read accounts. In Spain, the best-known free model (Fintonic) is paid for by selling financial products, which has attracted conflict-of-interest criticism. A "no bank passwords, no selling your data or products" message is a credible differentiator, although I found no quantitative Spanish survey that measures this distrust.

### Cited Findings
- Fintonic says its access is read-only, that it holds a Banco de España AIS/PIS licence, and that data collected is "not linked to your identity" (self-declared on the App Store). — [App Store ES](https://apps.apple.com/es/app/fintonic-ahorra-y-fin%C3%A1nciate/id672220319)
- Conflict-of-interest criticism of Fintonic's advice-and-sell model. — [Forbes ES](https://forbes.es/?p=10383)
- Privacy as a reason to keep cash: 62% of Europeans (SPACE 2024). — [Paperjam](https://en.paperjam.lu/article/cash-is-king-for-privacy-why-62-of-europeans-refuse-to-let-go)
- Cases of sanctions in finance: the AEPD fined Generali and ING €5.6M (data protection). — [Forbes ES](https://forbes.es/economia/708541/proteccion-de-datos-multa-con-56-millones-a-generali-e-ing/)
- FinanceKit requires apps that offer financial products to let users connect those accounts to Wallet. Apple frames the API as user-controlled access. — [Apple Developer](https://developer.apple.com/financekit)

### Inferences
- Processing data on the device (Shortcuts input, no bank credentials) reduces the GDPR surface and supports the trust message. It does not exempt Taimo from GDPR if it syncs data to a server or shares groups.

### Gaps
- No Spanish or EU survey found with percentages on distrust of giving bank credentials to apps, or of apps that sell financial products.
- No AEPD resolutions found against personal-finance apps.
