# Open banking (PSD2 AIS) and bank partnerships: how close to real time can Taimo see card payments? (Spain/EU, October 2026)

Research note, written 14 Oct 2026. Several primary sites (EUR-Lex, Redsys API market, BBVA API Market, Yapily, openbankingtracker, HSF Kramer) could not be fetched from this environment because of DNS errors. Findings about them come from search-result snippets and are flagged. Anything not backed by a URL is under Inferences or Gaps.

## 1. Do Spanish banks' PSD2 AIS APIs show pending card transactions, how fast, and how often can you poll?

### Takeaway
Most Spanish banks expose AIS through the Redsys PSD2 hub, which uses the Berlin Group standard. That standard defines a "pending" list, but banks only have to provide "booked". So whether a card authorisation shows up within minutes or only once it posts (often 1–3 days later) depends on the bank, and no bank publishes this. Without the user present, access is legally capped at 4 refreshes per account per day. No Spanish bank offers AIS push or webhooks.

### Cited Findings
- **Redsys API spec.** The Redsys PSD2 XS2A AIS spec (v1.1.0) returns transaction reports split into "booked" and "pending" lists. The allowed `bookingStatus` values are booked, pending, information and both, and **only "booked" is mandatory for ASPSPs**. A `linkedAccounts` field lets a bank point to a separate account that holds pending card transactions. This comes from a search snippet; the page could not be fetched. — [Redsys PSD2 XS2A swagger](https://market.apis-i.redsys.es/psd2/xs2a/ibm_apim/swaggerjson/YXBpLTExMGRjNTNjOjEuMS4w)
- **BBVA.** BBVA's PSD2 AIS is offered through the Redsys PSD2 HUB to authorised AISPs with customer consent (snippet). — [BBVA API Market – Accounts PSD2](https://www.bbvaapimarket.com/en/banking-apis/es-account-information-psd2/)
- **Other Redsys banks.** Redsys hosts nodes for individual Spanish banks, for example Selfbank. — [Redsys – Selfbank node](https://market.apis-i.redsys.es/psd2/xs2a/nodos/selfbank)
- **Sabadell** runs its own PSD2 portal. — [Banco Sabadell PSD2](https://www.bancsabadell.com/bsnacional/en/psd2/)
- **Redsys share of the market.** Yapily describes Redsys as the hub that gave TPPs a standardised Berlin Group interface to Spanish banks. The claim that more than 90% of Spanish banks use Redsys appears only on low-authority sites and is unverified. — [Yapily – Open banking in Spain](https://www.yapily.com/blog/open-banking-spain-instant-payments); [PaymentBrief – Spain](https://paymentbrief.com/markets/spain/)
- **Aggregator refresh cadence.** A developer guide says Tink's background refresh runs up to 4 times per day on connected accounts. This is secondary. — [openbankingtracker – EU APIs](https://www.openbankingtracker.com/open-banking-apis-europe)
- **Reliability.** Third-party status monitoring logged several Tink Spain incidents in July–August 2026 for Spanish rural and cooperative banks (Caja Rural group, Cajasiete and others) on the manual refresh flow. — [IsDown – Tink Spain incident](https://isdown.app/status/tink-spain/incidents/644139-banco-cooperativo-caixa-popular-caixa-rural-benicarlo-caixa-rural-les-coves-caixa-vinaros-caja-rural-caja-viva-cajasiete-crc-global-caja-ruralnostra-ruralvia-outage)
- **The 4-per-day limit.** RTS on SCA & CSC, Delegated Regulation (EU) 2018/389, Art. 36(5): when the user is not actively requesting, an AISP may access account data **at most 4 times in 24 hours**, unless the AISP and the bank agree to more. When the user is present (opens the app and triggers a refresh), there is no such cap. This is a well-known provision, but EUR-Lex could not be fetched to quote it here. — [EUR-Lex 32018R0389](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018R0389)
- **Webhooks under PSD2.** Berlin Group's successor framework (openFinance API v2, autumn 2023) first released only PSD2-compliance services. Subscription-based push notifications were only "being explored" (2020 announcement). No confirmed AIS event-subscription spec was found. — [banking.vision](https://banking.vision/openfinance-api-der-berlin-group/); [The Paypers](https://thepaypers.com/fintech/news/berlin-group-starts-new-openfinance-api-framework)

### Inferences
- **What "real time" means in practice.** The best achievable latency is roughly as follows. With the user present, a refresh on app open takes seconds and shows pending items if the bank exposes them. With the user absent, data is about 6 hours old at worst, because of the 4-per-day cap. If the bank shows only booked items, a card payment appears when it posts, often 1–3 days later. Any "webhook" an aggregator offers is triggered by its own scheduled poll, not by the bank.
- **Neobanks.** Card-centric banks such as Revolut and N26 are more likely to include pending card transactions. Their AIS APIs are their own (not Redsys), because they are licensed in Lithuania and Germany. This is unverified.
- **Pending items change.** Pending card transactions often have no stable transaction ID and their amount can change when they settle (FX, tips, hotel holds). Taimo would need logic to match and replace them.

### Gaps
- No per-bank documentation was found on which of BBVA, Santander, CaixaBank, Sabadell, ING, Openbank, Bankinter, Unicaja, Kutxabank, Revolut and N26 return `pending` card transactions in PSD2 AIS, or how many minutes or hours they take to appear. This needs testing with the Redsys sandbox or an aggregator sandbox (for example Enable Banking's free restricted production mode on the team's own accounts).
- No primary source was found on whether the Redsys hub negotiates frequencies above 4 per day.

## 2. Aggregators serving Spain: webhooks, near-real-time updates, pricing, startup plans

### Takeaway
GoCardless Bank Account Data, the former free option, closed to new signups in July 2025. Enable Banking is the cheapest legal route to start: free restricted production on your own linked accounts, with paid production quoted by volume and subject to a monthly minimum. Tink, Salt Edge, Yapily and TrueLayer are sales-led. Their "webhooks" tell you when their scheduled refresh finds new data, so none beats the bank's own data freshness.

### Cited Findings
- **GoCardless Bank Account Data** (formerly Nordigen) stopped accepting new accounts around July 2025, and existing users keep working. — [Actual Budget docs – GoCardless](https://actualbudget.org/docs/advanced/bank-sync/gocardless/); [DEV – GoCardless BAD alternatives](https://dev.to/johnfrandsen/gocardless-bank-account-data-alternatives-what-to-use-when-signups-are-disabled-326d); [openbankingtracker – free APIs](https://www.openbankingtracker.com/guides/free-open-banking-apis)
- **Enable Banking: free scope.** The terms say use of the Control Panel and API under those terms is free; use beyond that needs a separate agreement. The free scope is a sandbox plus restricted production for accounts you link yourself. Public production requires a contract and KYB. — [Enable Banking terms](https://enablebanking.com/terms/); [rfp.wiki – Enable Banking](https://www.rfp.wiki/financial-services-banking-fintech/open-banking-platforms/enable-banking)
- **Enable Banking: paid pricing.** Cost depends on the number of accounts accessed and payments made per month, with a monthly minimum invoice. — [Enable Banking FAQ](https://enablebanking.com/docs/faq/)
- **Enable Banking: webhooks.** There are payment-status webhooks, with a `payment_auth_status` field added in August 2024. No AIS transaction webhook was confirmed. — [Enable Banking changelog Aug 2024](https://enablebanking.com/blog/2024/09/04/changelog-august-2024)
- **Tink, Salt Edge, Moneyhub** usually require a sales conversation for pricing. — [openbankingcompare 2026](https://www.openbankingcompare.com/blog/best-open-banking-api-providers-for-developers-2026)
- **Tink** prices by product, market and volume. — [Softwr – Tink](https://www.softwr.com/software/tink)
- **Yapily** has Starter, Growth and Enterprise tiers, combining a base fee with usage. One source says there is no free production tier. — [itechguides](https://www.itechguides.com/compare/yapily-payments-vs-tink/); [Yapily – Tink alternatives](https://www.yapily.com/blog/tink-alternatives-6-open-banking-platforms-compared)
- **Salt Edge** pricing is mainly usage-based. — [Finexer – Salt Edge pricing](https://blog.finexer.com/salt-edge-pricing/)
- **Webhook claims** (from competitor comparisons): Salt Edge has webhooks for transaction updates; Tink covers transaction and account data updates; Yapily covers payment status and balance updates. — [Yapily – Tink alternatives](https://www.yapily.com/blog/tink-alternatives-6-open-banking-platforms-compared); [openbankingtracker – aggregation](https://www.openbankingtracker.com/banking-data-aggregation)
- **Plaid** (as a pattern) sends transaction webhooks when it detects new or updated transactions after its own refresh. — [Plaid transactions webhooks](https://plaid.com/docs/transactions/webhooks/index.html.md)
- **Afterbanks** was a Spanish aggregator that connected to all banks operating in Spain (2018). Crassula says it is now called Arcopay; this is unverified. — [El Referente 2018](https://elreferente.es/?p=17963); [Crassula – AISP España](https://crassula.io/es/guides/licenses/aisp/)
- **Unnax** says it holds a triple Banco de España licence (AISP, PISP, EMI). This is the company's own claim. — [Crassula – AISP España](https://crassula.io/es/guides/licenses/aisp/)
- **Fintonic** obtained PSD2 AISP and PISP status. The date is not given in the results. — [Finovate](https://finovate.com/fintonic-becomes-latest-challenger-bank-to-receive-banking-license/)

### Inferences
- **Coverage.** Every serious aggregator covers the Redsys banks plus Revolut and N26. The difference between them is reliability, not latency.
- **Shortlist for a free app.** Enable Banking (free to prototype; you pay per active account), and Tink or Salt Edge or Yapily for negotiated startup deals.
- **Costs.** Typical per-connected-account monthly costs are not published. Ask for quotes.

### Gaps
- No public 2026 per-user prices for Tink, Salt Edge, Yapily, TrueLayer, Finverse, Kontomatik or Arcopay. TrueLayer's current Spain AIS coverage was not verified.
- No primary documentation was fetched on Tink or Salt Edge refresh frequency or webhook event names.

## 3. Licensing: become an AISP with Banco de España, or work through a licensed provider

### Takeaway
An AISP-only registration with Banco de España needs no initial capital, only professional indemnity (PI) insurance. The law gives 3 months from a complete file; in practice it is several months to over a year. Consent is reauthenticated every 180 days (since 25 July 2023). For an early-stage free app, the realistic path is to use a licensed aggregator's licence (agent or licence-as-a-service model).

### Cited Findings
- **Registration authority.** Banco de España registers AISPs under Real Decreto-ley 19/2018. AISP-only requires no initial capital but does require PI insurance. One guide gives typical premiums of €5k–30k per year for €250k–1M of cover (commercial source, unverified). — [Crassula – AISP en España 2026](https://crassula.io/es/guides/licenses/aisp/); [Molina Law Boutique – AISP](https://www.molinalawboutique.es/aisp)
- **Timeline.** One source says 3 months statutory and 4–7 months in practice at Banco de España. Another says 9–15 months at Banco de España, but that figure is for full payment institutions. — [Crassula – AISP](https://crassula.io/es/guides/licenses/aisp/); [Crassula – Entidad de Pago](https://crassula.io/es/guides/licenses/payment-institution/)
- **Consent renewal.** Delegated Regulation (EU) 2022/2360 extended SCA renewal for AIS access from 90 to **180 days**. It made the exemption mandatory for banks when access goes through an AISP (SCA still required on first access) and applies from 25 July 2023. — [Regulation Tomorrow](https://www.regulationtomorrow.com/2022/08/commission-delegated-regulation-amending-the-rts-as-regards-the-90-day-exemption-for-account-access/); [Financial Institutions News](https://www.financialinstitutionsnews.com/2022/12/05/sca-amendments-to-apply-from-25-july-2023/); [EBA Q&A 2023_6820](https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2023_6820)

### Inferences
- **Cost of going direct.** Beyond insurance, direct AISP status adds eIDAS QWAC/QSealC certificates, a compliance function, GDPR and security policies, and per-bank onboarding (Redsys plus each non-Redsys bank). That probably means €50k+ and 6–12 months. This is an estimate, not sourced.
- **Agent model.** Aggregators such as Tink, Enable Banking and Salt Edge let unlicensed apps operate under the aggregator's licence (agent or "licence-as-a-service" contract), so Taimo would not need its own registration at launch.

### Gaps
- No official Banco de España AISP fee schedule or minimum PI amounts were found. The EBA guidelines on PI insurance for AISPs set a formula, but that was not fetched.

## 4. Direct partnerships (BBVA, Santander, CaixaBank, Revolut, Bizum): push or real-time notifications?

### Takeaway
No public evidence was found that any Spanish bank, Revolut or Bizum offers third-party apps push or real-time notifications of a customer's card transactions. BBVA's API Market sends PSD2 AIS through Redsys. Real-time card feeds exist only for a card issuer's own programme, which is outside PSD2.

### Cited Findings
- **BBVA** PSD2 AIS runs through the Redsys hub. — [BBVA API Market](https://www.bbvaapimarket.com/en/banking-apis/es-account-information-psd2/)
- **Berlin Group push notifications** were only "explored", not specified, as of the latest found sources. — [The Paypers](https://thepaypers.com/fintech/news/berlin-group-starts-new-openfinance-api-framework)
- **EPC SPAA scheme.** The scheme (premium, beyond-PSD2 access with fees paid by data users to banks) is still in a pilot or operational-preparation phase. The 10 June 2026 SPAA MSG agenda covers convergence assessment, fall-back business conditions and a draft V2.0 rulebook. No live participant list or real-time data service was found. — [EPC SPAA MSG agenda 10 Jun 2026](https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2026-06/SPAA%20MSG%20008-26%20v1.0%20Agenda%2044th%20Meeting%20of%20the%20SPAA%20MSG%20-%2010%20June%202026.pdf); [ERPB – SPAA status update](https://ecb.europa.eu/paym/groups/erpb/shared/pdf/22nd-ERPB-meeting/SEPA_Payment_Account_Access_Scheme_Status_Update.pdf)

### Inferences
- **What a partnership could unlock.** A commercial deal (for example via BBVA API Market sales, CaixaBank's or Santander's open-innovation teams, or SPAA when it is live) is the only theoretical path to bank-pushed events. It is unlikely for a small free app.
- **The real real-time alternatives** sit on the user's device, not with the bank: reading bank push notifications on Android, Apple Wallet / FinanceKit on iOS (where available in the EU), or Taimo issuing its own card. These are outside this note's scope.

### Gaps
- No contact routes or terms were found for event or webhook products at BBVA, Santander, CaixaBank, Revolut or Bizum. Bizum's third-party APIs are for payments, not data feeds (not verified in this session).

## 5. Regulation that could change this: PSD3/PSR, FIDA, SPAA, Spain

### Takeaway
PSD3 and PSR were politically agreed on 27 Nov 2025. Final texts were published by the Council on 23 Apr 2026 and approved by ECON on 5 May 2026. As of Oct 2026 they are awaiting formal adoption and Official Journal publication (expected Q4 2026), and the PSR applies about 21 months later (around H2 2028). FIDA is stalled with no trilogues scheduled (Sept 2026). Nothing confirmed mandates real-time AIS or webhooks.

### Cited Findings
- **PSD3/PSR timeline.** Provisional agreement 27 Nov 2025; Council final compromise texts 23 Apr 2026; ECON approval 5 May 2026. Not yet in the Official Journal as of 7 Oct 2026; formal adoption expected by Dec 2026. The PSR generally applies 21 months after entry into force, and Verification of Payee after 27 months. — [Avanto – PSD3/PSR status Aug 2026](https://avanto.team/insights/psd3-psr-status); [Open Banking Tracker – PSD3 readiness](https://www.openbankingtracker.com/guides/psd3-psr-readiness); [Matheson](https://www.matheson.com/insights/psd3-and-psr-published-whats-changing-for-eu-payment-services/); [HSF Kramer 2026](https://www.hsfkramer.com/notes/fsrandcorpcrime/2026-posts/the-new-eu-payments-rulebook-psd3-psr)
- **What changes.** The PSR is a directly applicable rulebook; PSD3 covers licensing. Themes include fraud prevention (IBAN–name check) and **improved open banking access**. — [Matheson](https://www.matheson.com/insights/psd3-and-psr-published-whats-changing-for-eu-payment-services/)
- **FIDA.** As of 10 Sep 2026, no further trilogues are scheduled and talks are not continuing under the Irish presidency. Whether FIDA will be pursued in this Commission term is uncertain, although the Commission still supports open finance. — [WKO – FiDA](https://www.wko.at/information-consulting/finanzdienstleister/fida-financial-data-access)
- **FIDA history.** A Council working document dated 6 Apr 2026 carries a Commission non-paper on options to finalise FiDA. Reports of withdrawal date from Feb 2025, but the proposal was not withdrawn. — [Council WK 5041/2026](https://data.consilium.europa.eu/doc/document/WK-5041-2026-INIT/en/pdf); [The Paypers](https://thepaypers.com/fintech/news/european-commission-to-reportedly-cancel-fida-bill); [Linklaters](https://financialregulation.linklaters.com/post/102jzyo/its-complicated-the-eus-on-again-off-again-relationship-with-open-finance)
- **SPAA** is not yet live at scale (see section 4). — [EPC agenda Jun 2026](https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2026-06/SPAA%20MSG%20008-26%20v1.0%20Agenda%2044th%20Meeting%20of%20the%20SPAA%20MSG%20-%2010%20June%202026.pdf)

### Inferences
- **What the PSR text contains.** From the 2023 proposal and trilogue coverage (not re-verified against the final text here), the PSR includes:
  - a user "permission dashboard" at banks
  - a ban on obstacles in dedicated interfaces
  - performance parity between the bank's own app and its API
  - a dedicated interface that keeps no-fee access for PSD2 data

  This improves reliability but not real-time push. The 4-per-day and 180-day rules are expected to stay or be relaxed slightly, and they would not apply before around 2028.
- **No regulatory change gives real-time card data before 2028.** Paid SPAA "premium" access is the only foreseeable route to richer or faster data.

### Gaps
- The final PSR article numbers and wording on AIS frequency, the dashboard and SCA renewal were not verified. The source pages could not be fetched.
- No Spain-specific initiative (Banco de España or Ministerio de Economía) on real-time account data was found.

## 6. Trust: will Spanish users connect their bank accounts?

### Takeaway
Spaniards say they are willing to share data in exchange for benefits (70%, the highest in Europe in PwC 2025), but fewer than 10% have actually used open banking services. Traditional banks remain the most trusted custodians of the data.

### Cited Findings
- **PwC Payments & Open Banking Survey 2025** (more than 5,500 interviews in 11 European countries): Spain shows the highest willingness to share data in exchange for benefits, at 70%. Trust in traditional banks as data providers is 55%, up 37 points from 2018. — [PwC España](https://www.pwc.es/es/financiero/payments-open-banking-survey.html); [PwC nota de prensa 2025](https://www.pwc.es/es/sala-prensa/notas-prensa/2025/espana-cabeza-europa-adopcion-medios-pago-digitales.html)
- **Adoption.** Fewer than 10% of Spanish consumers have tried open banking services, while more than 60% say they are interested (Oct 2025). — [Computing.es](https://www.computing.es/mundo-digital/la-confianza-clave-para-que-el-open-banking-despegue-en-espana/)
- **Credit context (Ubimia, Aug 2026, commercial).** 80–90% of credit applicants authorise temporary bank data access. Top concerns are privacy (40%), liability for errors and fraud. — [Dircom / Ubimia](https://www.dircom.org/2026/08/31/8-de-cada-10-solicitantes-comparte-sus-datos-bancarios-para-conseguir-mejores-condiciones/)
- **Older data (Deloitte, pre-2025).** 66% had never used an aggregator. — [Deloitte – Banca abierta](https://www.deloitte.com/es/es/services/consulting/analysis/banca-abierta.html)

### Inferences
- **How apps address this.** The usual approaches are:
  - explaining that access is read-only and regulated (Banco de España-supervised partner)
  - consent through the user's own bank's SCA
  - a clear benefit up front
  - easy revocation
  - making bank connection optional, with manual or on-device entry as an alternative

### Gaps
- No Spain-specific survey on personal-finance-app (as opposed to lending) account-linking conversion rates was found.
