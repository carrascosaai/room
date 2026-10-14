# Card-linking / real-time card transaction APIs (Visa, Mastercard, Amex, Fidel, CLO companies): viability for Taimo in Spain/EU (2026)

Research context: done on 2026-10-14. Note on method: direct page fetches to fidelapi.com, developer.visa.com and developer.mastercard.com were blocked from this environment (DNS/proxy 403). The findings below come from search-engine extracts of those official pages plus press coverage. Every claim has a URL, but some details (for example exact country lists) should be re-checked on the live pages before any decision.

## 1. Which providers give real-time (authorization/clearing) webhooks for enrolled cards: latency and data fields

### Takeaway
Only two products in this space send the transactions of a consumer's card to a third-party app as a near-real-time stream: **Fidel API Transaction Stream**, which runs on Visa Offers Platform, and **Mastercard Transaction Notifications**. Both are consent-based and send webhooks within seconds of authorization. Everything else (Fidel Select Transactions, Kard, Cardlytics, Triple and other card-linked-offer platforms) sends only transactions at participating merchants.

### Cited Findings
**Fidel API: Transaction Stream**
- Fidel's product page says Transaction Stream gives "payment events from all transactions made on any enrolled card in real time". The docs narrow this to "supported transactions made with linked cards". — [Fidel Transaction Stream](https://fidelapi.com/products/transaction-stream); [Fidel Stream docs](https://fidelapi.com/docs/stream)
- Once a card is enrolled and verified, every payment event from that card (authorization, clearing, refund) is sent to the developer's server in real time by webhook. — [Fidel Stream docs](https://fidelapi.com/docs/stream)
- Fidel tokenizes the card and does not store sensitive card data. The network starts sending transactions only after the user's access to the card is verified. — [Fidel Stream docs](https://fidelapi.com/docs/stream); [Fidel FAQ: card details required](https://fidelapi.com/faq/cards-select)
- Transaction fields include brand name, brand descriptor, date and time, auth code, merchant category code and amount. — [Fidel Stream docs](https://fidelapi.com/docs/stream)
- Transaction Stream launched in November 2021 and is "built on top of the Visa Offers Platform". In Transaction Stream programs the `amexApprovalCode` and `mastercardAuthCode` fields are not used; only the Visa auth code is filled in. This suggests the stream is in practice **Visa-only**. — [BusinessWire launch PR](https://www.businesswire.com/news/home/20211116005216/en/Fidel-API-Launches-Transaction-Stream-API-to-Power-the-Next-Generation-of-Spend-Management-Solutions); [Fidel Stream docs](https://fidelapi.com/docs/stream)
- Launch use cases: commercial spend management (real-time spend visibility for HR and finance teams) and consumer apps ("Developers building consumer applications for expense management can make real-time decisions on a card purchase"). — [The Fintech Times](https://thefintechtimes.com/fidel-apis-visa-built-transaction-stream-api-to-streamline-spend-management-solutions/); [PYMNTS](https://www.pymnts.com/news/b2b-payments/2021/fidel-connects-developers-card-data-new-api/)

**Visa Offers Platform (VOP), the Visa base layer**
- "For cardholders who have consented to take part in the Customer's program, VOP can access the VisaNet authorization and settlement stream to qualify transactions and send the relevant notifications to the Customer in near real-time." The API also lets the client start and stop data for each cardholder according to their consent. — [Visa Developer: VOP](https://developer.visa.com/capabilities/vop)

**Mastercard Transaction Notifications**
- Third-party apps must first take the cardholder through Mastercard's "Consent & Consumer Authentication" flow. They then register the card and a webhook, and "your webhook receives a notification instantly when the customer makes a purchase on their linked card", including **merchant name and amount**. — [Mastercard TN: How it works](https://developer.mastercard.com/transaction-notifications/documentation/how-it-works); [Mastercard TN docs](https://developer.mastercard.com/transaction-notifications/documentation/)
- Mastercard's product page lists **budgeting** and expense management among the use cases, alongside fraud awareness and loyalty. — [Mastercard TN product page](https://developer.mastercard.com/product/transaction-notifications)
- The data may be used only "for the approved purpose of providing transaction notifications and not for any other purposes without the cardholder's explicit consent". — [Mastercard Consent Management docs](https://developer.mastercard.com/consent-management/documentation/)

**Visa Transaction Controls (VTC) / VCES**
- VTC notifications are delivered to the *issuer's* notification provider. Issuers must enroll in the VTC on-behalf-of Alert Delivery Service. A fintech founder on Visa's developer forum said VTC "seems to only be for issuer banks", and the thread has no official answer. — [Visa VTC how-to](https://developer.visa.com/capabilities/vctc/docs-how-to); [Visa Developer Community thread](https://community.developer.visa.com/t5/Use-Cases/Receive-transaction-info-from-Merchants-without-Merchant-ID/m-p/14342)

### Inferences
- Latency: both providers say "real time", "near real-time" or "instantly". No provider publishes a figure in seconds. Because the events come from the authorization message, a delay of seconds is plausible, but it is not documented.
- VTC/VCES is an issuer product and is not a route for a third-party app.

### Gaps
- No published latency SLA from Fidel, Visa or Mastercard.
- The full Mastercard TN payload schema (MCC, location, currency) could not be retrieved.

## 2. Can any card (any Spanish issuer) be enrolled, and are webhooks for all transactions or only participating merchants?

### Takeaway
**This is the critical blocker.** The only "all transactions" products found are Fidel Transaction Stream and Mastercard TN. Fidel's documentation says Transaction Stream supports **only cards issued in Canada, the United Kingdom and the United States**, so Spanish cards (BBVA, Santander, CaixaBank, ING ES, and probably Revolut cards issued from Lithuania) are excluded. Mastercard TN lists "North America, EU" but is described as running with "a select few customers". Every card-linked-offer product sees only participating merchants.

### Cited Findings
- Fidel docs: "For Transaction Stream programs, only cards issued in CANADA, UNITED_KINGDOM, UNITED_STATES are supported." — [Fidel Stream docs](https://fidelapi.com/docs/stream) (search extract; re-verify on the live page)
- Fidel has a separate set of terms titled "Terms of Service for Transaction Stream – UK & Europe", which refers to connecting users' cards with an "Expense Management Platform" and to a monthly cardholder verification fee. A matching North America version also exists. — [Fidel ToS Transaction Stream UK & Europe](https://fidelapi.com/legal/terms-transaction-stream-uk-europe); [Fidel ToS North America](https://fidelapi.com/legal/terms-transaction-stream-north-america)
- Fidel's overall card-linking footprint (mainly Select Transactions) is listed as US, UK, Ireland, Canada, Sweden, Norway and Finland. Spain is not listed. — [docs.fidel.uk (search extract)](https://docs.fidel.uk); [paymentproviders.io: Fidel](https://paymentproviders.io/providers/fidel-api)
- Fidel Select Transactions gives "enriched transaction data from **participating stores** with linked cards". It is a loyalty/offers product that needs merchant (MID) onboarding. — [Fidel Select docs](https://docs.fidelapi.com/docs/select); [Fidel Select transactions](https://fidelapi.com/docs/select/transactions/)
- Fidel FAQ (about 1.5 years old): for Select, Visa and Amex authorizations are supported, Mastercard authorizations are not, and clearing is supported for all three networks. — [Fidel FAQ](https://www.fidelapi.com/faq); [Fidel FAQ: transactions](https://fidelapi.com/faq/transactions)
- Digital wallets: Fidel can track Apple Pay/Google Pay spend "as long as the full PAN from the front of the card is enrolled". If a virtual card number is enrolled instead, spend cannot be tracked. — [Fidel FAQ](https://www.fidelapi.com/faq)
- Mastercard Consent Management lists Transaction Notifications as a card-based consent type available in "North America, EU". The TN support FAQ says the service "is currently running with a select few customers". — [Mastercard Consent Management use cases](https://developer.mastercard.com/consent-management/documentation/use-cases); [Mastercard TN support](https://developer.mastercard.com/transaction-notifications/documentation/support/)
- Mastercard says TN targets "issuers and co-brand partners that already have consent models in place", as well as third-party apps that go through the consent flow. — [Mastercard TN product page](https://developer.mastercard.com/product/transaction-notifications)
- Kard: offers are matched when the card is used "at a relevant merchant". Its partners are mostly US fintechs and issuers (Varo, Tilt). — [Kard merchant offers](https://www.getkard.com/docs/merchant-offers); [Kard vs Cardlytics 2026](https://www.getkard.com/blog/cardlytics-vs-kard-comparing-card-linked-offer-platforms-in-2026)
- Cardlytics: offers are redeemed by using linked cards "at participating retailers", and its network covers the US and UK. — [Cardlytics platform docs](https://platform.cardlytics.com/advertisers/docs/welcome); [Cardlytics marketing](https://www.cardlytics.com/marketing-solutions)
- The European CLO platform Reward was acquired by Rezolve Ai. — [Wikipedia: Gavin Dein](https://en.wikipedia.org/wiki/Gavin_Dein)

### Inferences
- With Fidel Transaction Stream, a Taimo user in Spain could not enroll a Spanish-issued card today. Even where it is available, it would cover Visa only, so roughly half of Spanish cards (Mastercard) would be missed.
- Card-linked-offer companies (Kard, Cardlytics, Triple, Fidel Select) cannot meet the "any payment" requirement by design, because they see only merchants in their offer network.
- Mastercard TN is the only product found that combines EU availability, all purchases and a budgeting use case. It is gated ("select few customers"), so access would depend on Mastercard accepting Taimo as a partner.
- Apple Pay and Google Pay payments are tokenized (DPAN). Card-linking on the physical PAN catches them only if the network maps the token back to the PAN. Fidel says it does, but only when the physical PAN is enrolled.

### Gaps
- Whether Fidel Transaction Stream "UK & Europe" covers any EEA country in 2026, or only the UK. The terms suggest a European footprint, but the docs list only CA, UK and US.
- Whether Mastercard TN accepts cards from all EU issuers or only from participating issuers.
- Amex: no evidence found of an Amex API that streams all transactions to third parties. Amex market share in Spain is in any case small (my inference).

## 3. Are use cases restricted to loyalty/rewards? Precedents for budgeting or expense tracking in the EU

### Takeaway
No. The network rules do not limit these products to loyalty. Fidel Transaction Stream was launched for spend management and consumer expense apps, and Mastercard TN lists budgeting. Data use is limited to the purpose the cardholder consented to. I found **no public case study of a consumer budgeting app in the EU (or Spain)** built on card-linking.

### Cited Findings
- Transaction Stream use cases explicitly include consumer expense-management apps and "personal alerts and insights the moment a card transaction happens". — [The Paypers](https://thepaypers.com/fintech/news/fidel-launches-transaction-stream-api); [BusinessWire](https://www.businesswire.com/news/home/20211116005216/en/Fidel-API-Launches-Transaction-Stream-API-to-Power-the-Next-Generation-of-Spend-Management-Solutions)
- Visa's partner directory lists Fidel for "real-time transaction data for expense management and digital receipts". — [Visa Partner directory: Fidel](https://partner.visa.com/site/partner-directory/fidel-api.html)
- Mastercard TN: budgeting and expense management are listed use cases, and data use is limited to the approved purpose. — [Mastercard TN product page](https://developer.mastercard.com/product/transaction-notifications); [Mastercard Consent Management](https://developer.mastercard.com/consent-management/documentation/)
- No budgeting-app case study on Fidel Transaction Stream was found. — [The Paypers search result](https://thepaypers.com/fintech/news/fidel-launches-transaction-stream-api) (absence noted)

### Inferences
- The UK precedents (Curve, Snoop, Plum, Bud) do not use card-linking for expense tracking. Curve is its own card issuer, and Snoop, Plum and Bud use open banking (AIS). This is from general knowledge; no source was retrieved in this session.
- The 2021 Fidel/Visa press materials point to B2B spend management (employee expenses) as the main commercial fit. Consumer use was mentioned, but no named consumer clients were found.

### Gaps
- No named EU consumer app using Mastercard TN or Visa VOP for budgeting was found.

## 4. Consent and compliance (PCI DSS, GDPR, SCA, network approvals), costs, timelines, company requirements

### Takeaway
Collecting the PAN through the provider's SDK (iframe or native) keeps Taimo largely out of PCI scope. Consent is mandatory and is managed by the network: Mastercard runs its own Consent & Consumer Authentication flow, and Fidel verifies card ownership before the stream starts. Pricing is **not public**: it is custom, with a per-card monthly verification fee in Fidel's UK & Europe terms. No public timeline or minimum company requirements were found.

### Cited Findings
- The Fidel Web SDK v4 is an iframe. Card data goes "directly to Fidel's secure vault without exposing your servers", which "dramatically reduces your PCI-DSS compliance scope". Mobile SDKs (iOS, Android, React Native) are also PCI-compliant. — [Fidel Web SDK v4](https://docs.fidelapi.com/docs/select/sdks/web/v4); [DEV.to: Fidel card-linking](https://dev.to/fidel/creating-a-card-linking-program-with-the-fidel-apis-53c7)
- Fidel: the network sends transactions only after the user's access to the card has been verified. — [Fidel Stream docs](https://fidelapi.com/docs/stream)
- Mastercard: third parties must complete Consent & Consumer Authentication before integrating TN. — [Mastercard TN: How it works](https://developer.mastercard.com/transaction-notifications/documentation/how-it-works)
- Fidel UK & Europe Transaction Stream terms include a per-month cardholder verification fee (amount not visible in the extract). — [Fidel ToS UK & Europe](https://fidelapi.com/legal/terms-transaction-stream-uk-europe)
- Pricing is "custom", and no public price list was found. — [TrustRadius: Fidel pricing](https://www.trustradius.com/products/fidel-api/pricing); [paymentproviders.io](https://paymentproviders.io/providers/fidel-api)

### Inferences
- GDPR: Taimo would be a controller of transaction data and Fidel or Mastercard a processor or joint controller. Taimo would need explicit consent, a DPIA (continuous financial monitoring), a privacy notice and a data processing agreement with the provider.
- PSD2: card-linking is not AIS (no bank account access), so an AISP licence is probably not required. This is a reasonable reading but was not confirmed by a source in this session and needs legal review.
- SCA: card enrollment is not a payment, so PSD2 SCA does not apply directly. The network's own card-ownership verification (Fidel verification, Mastercard consumer authentication) plays a similar role.

### Gaps
- Actual costs (setup, per card, per transaction), minimum volumes, and approval timelines.
- Whether the networks require a minimum company size, audited financials or a funding stage.

## 5. Who to contact, and whether investors are typically required

### Takeaway
Practical contacts are **Fidel sales** (to ask about Transaction Stream for Spain/EEA), the **Mastercard developer/TN team** (to ask about EU access to Transaction Notifications), and Visa via its partner programs. Mastercard Start Path generally expects funded (Seed/Series A+), revenue-generating startups. Visa Fintech Partner Connect is a marketplace aimed at Visa's client banks, not a way for startups to get data access.

### Cited Findings
- Visa Fintech Partner Connect launched in Europe in November 2020 to connect Visa clients (financial institutions and merchants) with fintech partners. — [Visa press release (mynewsdesk)](https://www.mynewsdesk.com/uk/visa/pressreleases/visa-fintech-partner-connect-launches-in-europe-to-enable-next-generation-of-digital-payment-experiences-3050041); [PYMNTS](https://www.pymnts.com/visa/2020/visa-unveils-fintech-partnership-program-in-europe/)
- Mastercard Start Path: aggregators say startups need Seed/Series A or later institutional funding, a live product and revenue. Sources disagree on details. — [Causo guide 2026](https://hub.causo.ai/guides/how-to-apply-to-mastercard-start-path-2026); [prodevs.io](https://prodevs.io/accelerators/mastercard-start-path)
- Fidel and Visa said they would "partner to expand the solution ... to new global markets". — [IBS Intelligence](https://ibsintelligence.com/ibsi-news/visa-to-help-accelerate-the-expansion-of-fidel-apis-new-solution/)

### Inferences
- Investors are not formally required to use Fidel. Network partner programs, and getting prioritized for a gated product like Mastercard TN, favor funded companies with traction.

### Gaps
- No official Start Path eligibility page could be retrieved. No named sales contacts are public, beyond the contact forms on fidelapi.com and developer.mastercard.com.

## 6. Alternative network-level products (token lifecycle notifications, Click to Pay, etc.)

### Takeaway
No network product was found that lets a third-party consumer app receive all card transactions by enrolling a PAN, other than the two above. Token lifecycle and transaction notifications (VTS/MDES) go to token requestors (wallets, merchants) and issuers. VTC goes to issuers. Mastercard's open-finance products are open banking (AIS), not card-linking.

### Cited Findings
- VTC alerts are delivered through an issuer-enrolled Alert Delivery Service. — [Visa VTC how-to](https://developer.visa.com/capabilities/vctc/docs-how-to)
- Mastercard's PFM/budgeting product in open finance is aggregated account data (Finicity in the US, Open Finance Europe/Aiia), which is a different product from TN. — [Mastercard Open Finance PFM](https://developer.mastercard.com/open-finance-us/documentation/usecases/personal-finance-management/); [Mastercard Open Finance Europe](https://developer.mastercard.com/open-finance-europe/documentation/unlicensed/aiia-pay/event-notifications/)

### Inferences
- Token notifications (VTS/MDES) would cover only payments made with a token that Taimo itself requested (for example, a card added to Taimo as a wallet). They would not cover payments the user makes with Apple Pay or a physical card. This product is not useful for Taimo's goal.
- Overall verdict (inference): for Spain/EU in 2026, the card-linked route for **all** payments is **not viable off the shelf**. Fidel Transaction Stream does not support Spanish cards, card-linked-offer companies cover only participating merchants, and Mastercard TN is EU-listed but gated to a few customers and covers Mastercard only. A realistic fallback is open banking (PSD2 AIS) via an aggregator, combined with on-device signals such as Apple Wallet transaction notifications or Shortcuts automations and Android notification listening.

### Gaps
- Whether Visa offers any consented "all-transaction" feed in Europe outside Fidel. VOP's regional availability section could not be read.
