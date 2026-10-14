# Shared-expense / bill-splitting apps: competition for Taimo (state as of Oct 2026)

Method note: the web fetch tool could not reach most primary pages (play.google.com, tricount.com, together.bunq.com, genbeta.com, kimola.com, vendor blogs all failed DNS). The findings below come from search-result snippets of those pages. Many comparison pages are written by competing splitting apps (hipposplit, splitterup, spliit.pro, partytab, getfinny, etc.), so treat their prices and rankings as approximate and possibly slanted. I could not reach Reddit threads directly. User quotes come mostly from Trustpilot and review summaries.

## Q1. Competitor profiles: business model, size, markets, features, recent changes

### Takeaway
The market splits into four groups. (1) Standalone ledger apps: Splitwise (US/global, freemium with a daily cap since late 2023), Tricount (Europe/Spain, bunq-owned, free, used to push the bunq card), Settle Up, Splid, Spliit, Kittysplit. (2) Single-purpose receipt itemizers: Tab and a wave of AI receipt apps launched 2025-2026. (3) Bank and wallet group features: Revolut Group Bills, Venmo Groups, PayPal pools, bunq, BBVA/imagin in Spain, Bizum (planned). (4) Shared-card payment startups: Cino. No source shows one product that combines automatic personal budgeting from card/wallet payments with multi-currency group ledgers and one-tap settlement outside a single bank's walled garden. That is the gap Taimo targets.

### Cited Findings

**Splitwise (US-founded, strongest in US/India/English-speaking markets)**
- Late-2023 change: free users were limited to a few expenses per day, with a 10-second cooldown between entries. The move pushed users toward Pro, which adds unlimited expenses, currency conversion and receipt scanning — [IT Voice](https://www.itvoice.in/splitwise-has-introduced-restrictions-on-the-number-of-free-expenses-users-can-add)
- Trustpilot reviews from Nov-Dec 2023 describe a cap of 3 expenses/day (one reviewer saw 4). Reported in search summaries of [Trustpilot (DK)](https://dk.trustpilot.com/review/splitwise.com?page=3) and [Trustpilot (IE)](https://ie.trustpilot.com/review/splitwise.com?page=2)
- Current cap (2026): third-party blogs cite Splitwise's help center as allowing up to 4 expenses per day for free users. Other blogs report 3-5. Ads and a cooldown remain on the free plan — [split-circle](https://split-circle.com/en/blog/splitwise-free-vs-pro); [usefairsplit](https://usefairsplit.com/blog/splitwise-pricing/); [areweeven](https://www.areweeven.com/blog/splitwise-free-vs-pro-2026)
- Pro price conflicts across sources: US App Store $4.99/mo and $39.99/yr; others report $49.99/yr or $59.99/yr ($7.99/mo). Splitwise says prices vary by country and channel — [split-circle](https://split-circle.com/en/blog/splitwise-free-vs-pro); [splitt-app](https://splitt-app.com/blog/splitwise-premium-price-worth-it.html); [spliit.pro](https://spliit.pro/blog/splitwise-free-vs-pro-worth-paying/)
- Pro unlocks: no cap, no ads, receipt scanning (and itemization), currency conversion, search, charts — [hipposplit](https://hipposplit.com/blog/splitwise-review/); [splitterup](https://splitterup.app/blog/splitwise-pro-worth-it)
- Recurring expenses and custom/percentage/shares splits (which covers couples' 60/40) exist in Splitwise. This is general product knowledge, not verified from a source in this session; see Gaps.

**Tricount (Belgium-founded; bunq acquisition May 2022; strongest in Spain, France, Benelux, Germany)**
- bunq announced the acquisition in 2022. The deal added about 5.4M users, and coverage said it made bunq the EU's second-largest neobank by users — [TechCrunch 2022](https://techcrunch.com/2022/05/03/bunq-to-acquire-group-expenses-app-tricount/); [FinTech Futures](https://www.fintechfutures.com/challenger-banks/dutch-challenger-bunq-becomes-eu-s-second-largest-neobank-with-tricount-acquisition); [Tricount blog](https://blog.tricount.com/en/tricount-joins-forces-with-bunq)
- The new app went to beta on 14 May 2024 and rolled out to all iOS users on 1 July 2024 (Android public beta the same day). Existing users were auto-migrated — [Tricount blog](https://tricount.com/blog/with-the-new-tricount-app-tracking-group-expenses-is-now-easier-than-ever)
- The headline 2024 feature is a free, bunq-issued prepaid "Free Credit Card". Every payment made with it is added automatically to the tricount you choose — [Tricount free card page](https://tricount.com/free-credit-card); [bunq on X, Jul 2024](https://x.com/bunq/status/1808967542670516647)
- Removals in the new app: tricount Premium was deprecated. CSV/PDF export, Personal mode and statistics were lost (statistics "planned to return later"). The web version was discontinued as "outdated", which drew user complaints. Source: the bunq community FAQ, via search snippet — [together.bunq.com "What happened to tricount Premium?"](https://together.bunq.com/d/60279-what-happened-with-tricount-premium); [tricount FAQs](https://together.bunq.com/d/59049-tricount-faqs)
- Ads: the Google Play listing says the app "contains ads", but marketing copy calls it "100% free with no ads or limits" (APKMirror v12.2.1, Oct 2025). The sources conflict — [Google Play](https://play.google.com/store/apps/details?id=com.tribab.tricount.android&hl=en_GB); [APKMirror 12.2.1](https://www.apkmirror.com/apk/bunq/tricount-split-group-bills/tricount-split-settle-bills-12-2-1-release/). An older Silicon Canals piece (before the relaunch) described it as free with ads plus a subscription for stats and CSV export — [Silicon Canals](https://siliconcanals.com/?p=75688)
- bunq upsell: on a Monzo community thread, users said the bunq integration is "very present in the app" and promotes cards, and that it is "not exactly unobtrusive" — [Monzo community](https://community.monzo.com/t/new-tool-for-bill-splitting-tricount-from-bunq/194497)
- 2025 reviews: expenses "sometimes not syncing", "disappear and re-appear", and the app is "not usable if you have 2+ people on a project". One reviewer blamed the change of owner. Source: a Google Play review snippet — [Google Play](https://play.google.com/store/apps/details?id=com.tribab.tricount.android&hl=en_GB)
- Size: 16M+ Android downloads, 4.8/5 from 188K+ ratings, and a 17M-user marketing claim — [Spark/MWM](https://spark.mwm.ai/us/apps/tricount-split-settle-bills/349866256). iOS: 4.85-4.88 from about 6.5K-10K ratings (US store) — [AppBrain](https://www.appbrain.com/appstore/tricount-split-settle-bills/ios-349866256); [AppGoblin](https://appgoblin.info/apps/349866256)
- Comparison blogs describe it as free and ad-free, good for one-off trips, multi-currency, with basic receipt OCR. It works offline and without registration — [splitfast](https://splitfast.io/blog/splitwise-alternatives); [empruntis (FR)](https://www.empruntis.com/rachat-credits/simulation-rachat-credits/reste-a-vivre/applications-partage-frais/)
- Release cadence: v12.x through 2025. v12.7.0 notes say only "minor bugs fixed and general performance improved" — [APKMirror](https://www.apkmirror.com/apk/bunq/tricount-split-settle-bills-12-7-0-release/)

**Settle Up (Czech; global)**
- Runs on iOS, Android and the web (also Microsoft Store). Read-only share links let anyone check balances in a browser. It minimizes the number of transfers — [splitfast](https://splitfast.io/blog/splitwise-alternatives); [LoveMoney](https://lovemoney.com/news/85624/best-free-bill-splitting-apps-tricount-splid-settle-up-acasa-splitwise)
- Free with ads. Premium removes ads and adds receipt photos, recurring transactions, categories and Excel export. Premium price conflicts: $3.99/mo, about $3.49/mo or $18.99/yr, and older figures of $0.99/mo or $11/yr — [dolio](https://dolio.org/compare/splitwise-alternatives); [criaplanner](https://criaplanner.com/guides/splitwise-alternatives); [getfinny](https://getfinny.app/blog/best-splitwise-alternatives-2026)

**Splid (Germany; Europe)**
- Offline-first, no accounts. Groups sync by code, which "gets messy for large groups". No real receipt intelligence — [splitfast](https://splitfast.io/blog/splitwise-alternatives)
- One-time unlock (not a subscription), priced at about $3.99-$5 depending on source, for unlimited groups and export — [dolio](https://dolio.org/compare/splitwise-alternatives); [partytab](https://partytab.app/blog/best-splitwise-alternatives)

**Spliit (open source, web-first)**
- Free, MIT-licensed, self-hostable, with no premium tier. Funded by donations through Open Collective — [GitHub spliit-app/spliit](https://github.com/spliit-app/spliit); [Open Collective](https://opencollective.com/spliit)
- AlternativeTo lists it as the top Splitwise alternative. AI receipt scanning from a photo is listed as beta in some sources — [AlternativeTo](https://alternativeto.net/software/splitwise/?p=4); [splitfast](https://splitfast.io/blog/splitwise-alternatives)

**Tab (US; receipt itemization)**
- A single-purpose restaurant bill splitter: you photograph the bill and each person taps the items they had. It does not handle general group ledgers — [splitfast](https://splitfast.io/blog/splitwise-alternatives); [AlternativeTo](https://alternativeto.net/software/splitwise/?p=4)

**Kittysplit, Splittr**
- Kittysplit is described as "best for one-off events like a dinner or party". No pricing data was found. Splittr did not appear in any results — [dolio / comparison search](https://dolio.org/compare/splitwise-alternatives)

**AI receipt-splitting newcomers (2025-2026)**
- Bill – AI Bill Splitting (first release 16 Jan 2025; OCR assigns items to people) — [mwm.ai](https://mwm.ai/apps/bill-ai-bill-splitting/6740485275)
- splitbill.cc (web, Dec 2025) — [PeerPush](https://peerpush.com/p/splitbillcc-or-ai-powered-bill-splitting)
- Groobil (31 Jan 2026; split equally or by item) — [Product Hunt](https://www.producthunt.com/products/groobil/launches/groobil-ai-powered-bill-splitting)
- BillBoss (1 Feb 2026; reads receipts, screenshots and typed entries; splits tax and tip) — [mwm.ai](https://mwm.ai/apps/billboss-split-bills-with-ai/6758069744)
- Checkify (iOS-only; AI reads items, tax and tip, then sends Venmo requests), Splittz, Check Please! AI Bill Splitter, SplitScan (Gemini; for two people) — [App Store Checkify](https://apps.apple.com/app/id6755905554); [Splittz](https://apps.apple.com/app/id6753856271); [Check Please!](https://apps.apple.com/app/id6757352579); [SplitScan](https://alternativeto.net/software/splitscan-scan-and-split-bills/about)
- Many small ledger apps market themselves as "Splitwise with no daily limit": HippoSplit, SplitterUp, PartyTab, Finny, SplitFast, Splitwin, GoodShare, SplitMyExpenses — [getfinny](https://getfinny.app/blog/best-splitwise-alternatives-2026); [goodshare](https://goodshare.app/blog/goodshare-vs-splitwise/); [splitmyexpenses](https://www.splitmyexpenses.com/articles/best-splitwise-alternatives)

**Cino (Estonia/UK; shared virtual card)**
- Cino links each person's bank account to one virtual group card, used through Apple Pay or Google Pay, so the bill is split at the moment of payment. It raised a €3.5M seed round (led by Balderton) in March 2025 to launch in the UK, which had a waitlist — [The Next Web, Mar 2025](https://thenextweb.com/news/cino-app-splits-bills-at-payment-raises-funding); [Invest in Estonia](https://investinestonia.com/estonian-fintech-startup-cino-raises-e3-5m-for-its-group-payment-app/); [tech.eu Oct 2024](https://tech.eu/2024/10/31/cino-makes-bill-splitting-drama-a-thing-of-the-past/); [App Store](https://apps.apple.com/us/app/-/id6443988744)

**Revolut Group Bills (Europe-wide incl. Spain)**
- Groups of 2-20 people. You can add transactions to split with exact amounts, and settle in-app with instant transfers between Revolut users. Setup: Payments > New > Group — [Finextra](https://www.finextra.com/pressarticle/83753/revolut-introdcues-group-bills); [Revolut help](https://help.revolut.com/en-AU/help/app-features/splitting-expenses-with-group-bills/)
- Non-Revolut users can join, but it "works best if most of the group uses Revolut" — [Wise](https://wise.com/ie/blog/split-bill-revolut-ireland)
- There is no automated recurring bill; the community asks for scheduled requests — [Revolut community](https://community.revolut.com/t/schedule-money-request-and-shared-bills-in-revolut-groups-and-contacts/223887)
- Pockets help organize payments. The launch year is unclear in the sources — [PYMNTS](https://pymnts.com/?p=947101)

**Venmo / PayPal (US; PayPal pools also in ES/DE/IT/UK)**
- Venmo Groups launched on 14 Nov 2023. It tracks, splits and settles ongoing expenses, with up to 20 groups per user — [TechCrunch 2023](https://techcrunch.com/2023/11/14/venmo-gets-a-new-way-to-split-expenses-among-groups-like-clubs-teams-trip-buddies-and-more)
- PayPal Money Pools ran 2017 to Nov 2021 (shut globally) and returned as a pooling feature in Nov 2024 in the US, Germany, UK, Italy and Spain, citing "high customer demand". The pool collects money upfront, i.e. a shared kitty — [TechCrunch 2024](https://techcrunch.com/2024/11/14/paypals-new-feature-will-let-you-easily-split-expenses-with-family-and-friends/)

**Spain-specific: Bizum, BBVA, CaixaBank**
- Bizum is preparing a relaunch of its own app focused on managing expenses, with groups for splitting payments among friends, after a pilot. The Genbeta article is undated in the snippet, so the launch status is unconfirmed — [Genbeta](https://www.genbeta.com/actualidad/bizum-trabaja-nueva-app-que-permitira-compartir-gastos-grupos-amigos)
- The BBVA app lets you create groups to share or split expenses, but only inside the BBVA app. CaixaBank (Jul 2023) lets customers split a direct-debit bill via Bizum in one click. imagin&Split (CaixaBank) creates groups, computes who owes what, and pays or requests via Bizum — [BBVA](https://www.bbva.es/gl/general/app-compartir-gastos.html); [CaixaBank PDF](https://www.caixabank.com/docs/comunicacion/76798.pdf); [roams.es](https://roams.es/actualidad/finanzas/app-dividir-gastos-cena-viaje-piso-compartido/)

**Lydia / Sumeria (France)**
- After restructuring, Lydia refocused on P2P transfers, collaborative cagnottes (kitties) and simple payments. Banking moved to a separate app, Sumeria. Lydia is seen as a P2P payment app rather than a splitting ledger. French guides recommend tracking in Tricount and settling via Lydia (manual combination; no integration found) — [Meilleurtaux](https://banque.meilleurtaux.com/banque-en-ligne/banque-mobile/lydia.html); [empruntis](https://www.empruntis.com/rachat-credits/simulation-rachat-credits/reste-a-vivre/applications-partage-frais/)

### Inferences
- Tricount is the incumbent in Spain and Europe (free, no cap, offline, no sign-up needed), but bunq's 2024 rewrite removed the web version, export, personal mode and stats. Sync bugs and the card upsell have created churn risk among exactly the users Taimo targets. Tricount's "card payments auto-added to group" is the closest feature to Taimo's thesis, but it requires a bunq card. Taimo's angle is the user's existing card, Apple Pay or Google Wallet.
- Splitwise's daily cap is the single biggest reason "Splitwise alternative" content exists. Dozens of indie apps compete on "no limits", so "free and unlimited" is now table stakes, not a differentiator.
- Bank features (Revolut, BBVA, bunq, Venmo) settle instantly but lock users into one institution. Standalone ledgers work across banks but settle outside the app. One-tap cross-bank settlement in Spain (Bizum, or PSD2 payment initiation) is the open gap. Bizum building its own group app is the main strategic threat in Spain.
- Itemized AI receipt splitting is commoditizing fast: many single-purpose apps launched in 2025-26. It is expected inside a general ledger, not a moat on its own.

### Gaps
- Splitwise download/user counts and ratings were not retrieved (Play Store unreachable). Settle Up, Splid, Spliit and Kittysplit size signals were also not found.
- No verified sources in this session for: Splitwise's percentage/shares split or recurring expenses; Settle Up's or Tricount's live versus manual exchange rates; whether Tricount stats or export have returned since 2024; Tricount's current ad status (sources conflict); whether the Tricount web viewer returned.
- Splittr: no information found. Kittysplit: no pricing or feature detail beyond "one-off events".
- bunq shared/joint accounts: no source retrieved.
- Bizum group feature: launch status and date unverified.
- Tab's current status (still active?) and pricing not verified.

## Q2. Top complaints and top wished-for features (with user quotes)

### Takeaway
Complaints cluster around paywalls and caps (Splitwise), regressions after an acquisition (Tricount: lost web, export and stats; sync bugs), ads and upsells, and walled-garden bank features. Wishes cluster around no limits, receipt itemization, live multi-currency, recurring expenses, web access for non-users, and integrated settlement.

### Cited Findings
**Quotes and complaint evidence**
- Splitwise: "limits free users to three expenses per day, which renders the app useless for occasional users"; "new limit implemented with no warning or communication to customers"; "nag screens about the 'Pro' version that you have to sit through" (Trustpilot, Nov-Dec 2023) — [Trustpilot DK p3](https://dk.trustpilot.com/review/splitwise.com?page=3); [Trustpilot NL-BE p3/p4](https://nl-be.trustpilot.com/review/splitwise.com?page=4); [Trustpilot IE p2](https://ie.trustpilot.com/review/splitwise.com?page=2). Reviewers also called it a "bait-and-switch", and the backlash spread to X — [IT Voice](https://www.itvoice.in/splitwise-has-introduced-restrictions-on-the-number-of-free-expenses-users-can-add)
- On Reddit, the daily cap is "the loudest complaint by far", followed by ads and features "quietly moved behind the paywall". Travelers are hit hardest, because one trip day can generate many expenses. These are summaries by vendor blogs, not direct Reddit quotes — [hipposplit](https://hipposplit.com/blog/splitwise-review/); [spliit.pro](https://spliit.pro/blog/splitwise-free-vs-pro-worth-paying/)
- Review-analysis reports on Splitwise App Store and Google Play reviews are titled "Free Version Limitations Cause Discontent" and "Criticism for Changes in Pricing and Limitations" — [Kimola GP](https://kimola.com/reports/splitwise-feedback-analysis-unlock-user-sentiments-google-play-154450); [Kimola GP 2](https://kimola.com/reports/splitwise-app-feedback-report-uncover-user-insights-google-play-en-144452); [Kimola App Store IN](https://kimola.com/reports/explore-why-splitwise-users-are-drifting-away-get-insights-now-app-store-in-155789)
- Tricount (2025, Google Play): "expenses sometimes not syncing", "disappear and re-appear", "not usable if you have 2+ people"; owner change blamed — [Google Play](https://play.google.com/store/apps/details?id=com.tribab.tricount.android&hl=en_GB). Web version removal drew complaints — [bunq community](https://together.bunq.com/d/60279-what-happened-with-tricount-premium). bunq promotion is "very present", "not exactly unobtrusive" — [Monzo community](https://community.monzo.com/t/new-tool-for-bill-splitting-tricount-from-bunq/194497)
- Splid: code-based sync is messy for big groups; no receipt intelligence — [splitfast](https://splitfast.io/blog/splitwise-alternatives)
- Revolut: works best only if everyone is on Revolut; no recurring bills — [Wise](https://wise.com/ie/blog/split-bill-revolut-ireland); [Revolut community](https://community.revolut.com/t/schedule-money-request-and-shared-bills-in-revolut-groups-and-contacts/223887)
- BBVA groups are usable only inside the BBVA app — [BBVA](https://www.bbva.es/gl/general/app-compartir-gastos.html)

**Top 10 complaints (ranked by how often they appear across the sources above; ranking is my synthesis)**
1. Daily expense cap and cooldown on free tier (Splitwise)
2. Core features moved behind paywall: receipt scanning, currency conversion, search, charts (Splitwise); Premium features removed (Tricount)
3. Intrusive ads and Pro nag screens (Splitwise; Settle Up free; Tricount listing)
4. Changes rolled out without notice (Splitwise 2023; Tricount 2024 rewrite)
5. Sync bugs: expenses disappearing or duplicating in multi-user groups (Tricount 2025)
6. Loss of web access (Tricount discontinued its web app)
7. Loss of export, statistics and personal mode (Tricount)
8. Bank or card upsell inside the splitting app (Tricount and bunq)
9. Walled gardens: bank group features need everyone on the same bank (Revolut, BBVA, Venmo-US only)
10. Clunky group joining and sync for large groups (Splid codes); no recurring automation (Revolut)

**Top 10 wished-for features (synthesized from what competitors market against and what users ask for)**
1. Unlimited free expenses with no cooldown — [getfinny](https://getfinny.app/blog/best-splitwise-alternatives-2026); [partytab](https://partytab.app/blog/best-splitwise-alternatives)
2. Photo receipt scanning with per-item assignment, including tax and tip — [Groobil](https://www.producthunt.com/products/groobil/launches/groobil-ai-powered-bill-splitting); [BillBoss](https://mwm.ai/apps/billboss-split-bills-with-ai/6758069744)
3. Free multi-currency with conversion (paywalled in Splitwise) — [IT Voice](https://www.itvoice.in/splitwise-has-introduced-restrictions-on-the-number-of-free-expenses-users-can-add)
4. Settle inside the app with real payments (Revolut, Venmo, Checkify-to-Venmo, imagin&Split via Bizum) — [Revolut help](https://help.revolut.com/en-AU/help/app-features/splitting-expenses-with-group-bills/); [roams.es](https://roams.es/actualidad/finanzas/app-dividir-gastos-cena-viaje-piso-compartido/)
5. Automatic capture of expenses from card payments (Tricount bunq card; Cino group card) — [Tricount card](https://tricount.com/free-credit-card); [TNW](https://thenextweb.com/news/cino-app-splits-bills-at-payment-raises-funding)
6. Web or browser view for people without the app (Settle Up read-only links; Spliit web) — [splitfast](https://splitfast.io/blog/splitwise-alternatives)
7. Recurring expenses or scheduled requests (rent, subscriptions) — [Revolut community](https://community.revolut.com/t/schedule-money-request-and-shared-bills-in-revolut-groups-and-contacts/223887)
8. Shared kitty or pot collected upfront (PayPal pools, Lydia cagnottes) — [TechCrunch 2024](https://techcrunch.com/2024/11/14/paypals-new-feature-will-let-you-easily-split-expenses-with-family-and-friends/)
9. Export and statistics (lost in Tricount) — [bunq community](https://together.bunq.com/d/60279-what-happened-with-tricount-premium)
10. Offline use, no forced sign-up (Splid, Tricount) — [splitfast](https://splitfast.io/blog/splitwise-alternatives); [empruntis](https://www.empruntis.com/rachat-credits/simulation-rachat-credits/reste-a-vivre/applications-partage-frais/)

### Inferences
- Taimo's proposition already covers wishes 2-8: auto-capture from card and wallet, receipt itemization, multi-currency, one-tap payment, shared pot, plus personal budgets. The risk is copying Splitwise's monetization mistakes. Any paywall on core splitting (number of entries, currency, receipts) is a proven backlash trigger.
- Couples' uneven ratios (60/40) as a saved default per group is not clearly documented in any competitor in the sources found. It is a possible differentiator (unverified).

### Gaps
- No direct Reddit quotes (r/Splitwise, r/solotravel, r/spain) could be retrieved. Reddit was not reachable through search.
- No Spanish-language App Store or Play reviews for Tricount were retrieved.
- Frequency rankings are qualitative, not counted.

## Q3. How these apps grow (virality)

### Takeaway
Growth is driven by invite links and no-sign-up group joining: every group creator recruits 2-20 people. Web views for non-users (Settle Up, Spliit, formerly Tricount web) lower the barrier. Banks use group features to acquire customers (bunq bought Tricount's users; Revolut and Venmo push instant settlement between their own users).

### Cited Findings
- bunq bought Tricount mainly for its user base (about 5.4M users at acquisition) and then pushed its card inside the app — [FinTech Futures](https://www.fintechfutures.com/challenger-banks/dutch-challenger-bunq-becomes-eu-s-second-largest-neobank-with-tricount-acquisition); [Tricount card](https://tricount.com/free-credit-card)
- Tricount can be used without registration — [empruntis](https://www.empruntis.com/rachat-credits/simulation-rachat-credits/reste-a-vivre/applications-partage-frais/)
- Settle Up offers read-only browser share links so anyone can check balances without the app — [splitfast](https://splitfast.io/blog/splitwise-alternatives)
- Revolut Group Bills lets non-Revolut users join, but works best when most members are on Revolut. Instant settlement only works between Revolut users, which nudges sign-ups — [Wise](https://wise.com/ie/blog/split-bill-revolut-ireland); [Finextra](https://www.finextra.com/pressarticle/83753/revolut-introdcues-group-bills)
- Cino needs every group member to link a bank account, so each payment recruits the whole table — [TNW](https://thenextweb.com/news/cino-app-splits-bills-at-payment-raises-funding)
- SEO and "alternative" content: dozens of indie apps grow by writing "Splitwise alternative / no daily limit" blog posts — [getfinny](https://getfinny.app/blog/best-splitwise-alternatives-2026); [splitterup](https://splitterup.app/blog/splitwise-alternative); [AlternativeTo](https://alternativeto.net/software/splitwise/?p=4)

### Inferences
- For Taimo: (a) a group invite link that opens a web view with no install; (b) a payment request (Bizum or payment link) that any debtor can pay without the app; (c) the itemized receipt shared in WhatsApp as the viral moment. Tricount's removal of its web app leaves a gap in Spain for a lightweight web view for guests.

### Gaps
- No quantitative K-factor or invite-conversion data was found for any app.
