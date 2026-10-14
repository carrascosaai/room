# Older adults and less digitally confident users: what Taimo needs (accessibility, trust, scams, family, cash)

Research date: 2026-10-14. Several primary-source sites (bde.es, monzo.com, nngroup.com, elperiodic.com) could not be fetched from this environment (DNS failure), so some figures come from search snippets of those pages or from secondary press. Items marked **[training knowledge]** are well-established facts I could not re-verify live this session. The URL given is the canonical source to check.

## 1. Usability findings for older adults in mobile banking and finance apps (2020–2026)

### Takeaway
The evidence base is mostly small qualitative studies and reviews. They agree on the same pain points: small text, information overload, complex navigation, and **fear of irreversible operations**. The fixes that recur are larger text and targets, simpler screens with fewer steps, error prevention and confirmation, and human help close at hand. Spain's 2022 "Soy mayor, no idiota" campaign turned this into a political issue, but the resulting bank protocol was voluntary and produced mainly branch-hour changes.

### Cited Findings
- A Swedish qualitative study (2024, 5 participants aged 71–82, think-aloud tasks on a prototype banking app) found that banking apps struggle with **small text, information overload and navigation**. It concluded that existing design guidelines are a strong enough base for accessible apps. — [Jönköping University, "Designing FinTech Applications for Older Adults" (2024)](https://ju.se/samarbeta/event-och-konferenser/event/xjobbsmassan/digital-showroom-2024/designing-fintech-applications-for-older-adults.html)
- A Brazilian study (4 older adults, System Usability Scale) reported **complex navigation, small fonts and fear of performing irreversible operations** in mobile banking. — [Revista RBEDRPP / UNEMAT](https://periodicos.unemat.br/index.php/rbedrpp/article/download/14539/10057/53487)
- A literature review of 2019–2024 sources found that **larger touch targets, simplified interfaces and better customer support** improve mobile-banking usability for the elderly. — [MUST conference paper, "Suitability of Mobile Banking Interfaces for the Elderly Users"](https://www.conference.must.ac.ke/index.php/mustic/article/view/175)
- An Iranian study (abstract reports 1,200 older adults in usability testing and 135 usability issues from heuristic evaluation) recommends simplified interfaces, cultural relevance and **better error prevention**. I only saw the abstract. — [Health Promotion Perspectives, hpp-44884](https://hpp.tbzmed.ac.ir/FullHtml/hpp-44884)
- A Thai thesis proposes specific button heights (90–270 px) plus font, contrast and content-writing guidance for elderly users of banking apps. I could not verify its method. — [SWU thesis](https://ir-ithesis.swu.ac.th/handle/123456789/644)
- A scoping review of 96 mHealth usability studies with older adults found that satisfaction (n=74) and learnability (n=60) were measured most often and memorability least (n=13). Studies rarely check whether seniors **remember** how to use an app between sessions. — [PMC9717549](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9717549/)
- NN/g's newer research with users aged 65+ reports "3 major shifts" since its study 20 years earlier, and says digital literacy in this group is rising. The specifics could not be fetched. — [NN/g video "Changes in How Older Adults Use Computers"](https://www.nngroup.com/videos/changes-seniors-computers/)
- Spain context: the "Soy mayor, no idiota" campaign (Carlos San Juan, 600,000+ signatures, early 2022) led to a banking-sector protocol in Feb 2022. Its measures were extended teller hours (9–14h) with priority for older customers, preferential phone support at no extra cost, a commitment to accessible ATMs, **apps and websites**, financial and digital training workshops, and a review every six months. — [RTVC](https://rtvc.es/los-bancos-firman-un-protocolo-para-mejorar-la-atencion-a-los-mayores/); [Valencia Plaza](https://valenciaplaza.com/valenciaplaza/la-banca-se-compromete-con-carlos-san-juan-a-garantizar-la-mejor-atencion-a-los-mayores)
- One year on, San Juan said the voluntary protocol had "only translated into extended opening hours" so far, and asked the Government to keep its promises. — [Valencia Plaza](https://valenciaplaza.com/valenciaplaza/carlos-san-juan-pide-gobierno-no-olvide-mayores-cumpla-promesa); [Onda Vasca](https://www.ondavasca.com/los-mayores-exigen-al-gobierno-espanol-que-se-cumpla-lo-pactado/)
- Digital adoption is high overall. In 2025, 96.3% of Spaniards aged 16–74 had used the internet in the last 3 months (INE, published 20 Nov 2025). — [INE TICH 2025](https://ine.es/dyngs/Prensa/TICH2025.htm?print=1). Among internet users, e-banking use rose from 50% (2015) to 77.6% (2025). — [Funcas Nota OFT 5/2026](https://www.funcas.es/wp-content/uploads/2026/02/Nota-OFT-5-2026.pdf)

### Inferences
- For Taimo, the main barrier is **fear and comprehension**, not access to a smartphone. Most 65–74s are online, but they fear irreversible mistakes. Design requirements:
  - every destructive action (delete expense, delete group, leave group, settle debt) is undoable for N seconds or recoverable from a "papelera"
  - a confirmation screen in plain words that states the amount and the person
  - no swipe-only or long-press-only actions; each has a visible button alternative
- Provide a **"Modo sencillo / Vista fácil"** toggle (also offered during onboarding). It should have:
  - fewer tabs, 3–4 big actions ("Apuntar gasto", "Ver este mes", "Mis recibos", "Pedir ayuda")
  - text 1.3x to 2x the default size and honouring the OS Dynamic Type / font scale
  - targets of at least 48dp (well above the WCAG 2.2 minimum of 24 CSS px)
  - high-contrast theme
  - no jargon such as "settle", "split", "balance". Use "Quién debe a quién" instead.
- Memorability matters: keep layouts stable between releases in simple mode, keep icon and label pairs (never icon-only), and add a persistent "¿Cómo se hace?" help entry. This matches the WCAG 2.2 "Consistent Help" criterion.
- Onboarding should allow **assisted setup**: a family member configures the app on the parent's phone, or sets it up remotely via an invite link.

### Gaps
- I could not fetch NN/g's full article. The "3 shifts" and any numbers on font size or target size are unverified.
- No AARP, Age UK or Banco de España quantitative usability study specific to finance apps (2023–2026) surfaced. I found no published compliance evaluation of the 2022 banking protocol for 2024–2025.
- I found no study that directly tested plain-language rewrites or voice input for older users of finance apps.
- I could not get the INE 65–74 breakdown for internet or e-banking use in 2025 from search results. It is in the INE annex tables.

## 2. Scams targeting older people in Spain/EU, and app features that help (trusted contact, warnings, cooling-off)

### Takeaway
Online fraud is Spain's dominant cybercrime (414,133 "estafas informáticas" recorded in 2024). Older people are hit by bank impersonation (SMS and call spoofing) and by the "hijo en apuros" WhatsApp-plus-Bizum scam. Fintechs have answered with **friction at the moment of payment** and **social verification**:
- Monzo Trusted Contacts: a friend has to OK large transfers.
- Revolut: in-app "are you on a call?" alerts.
- BBVA: verified calls inside the app.
- Starling: Connected Card, capped spending for helpers.
- EverSafe and Carefull (US): read-only monitoring with alerts to "trusted advocates".

### Cited Findings
**Spain scam data**
- In 2024, Spain recorded 465,838 cybercrimes (19% of all crime). **Estafas informáticas were 414,133**, down 3.1% from 2023, and cybercrime overall fell 1.4%. In Q1 2024, cyber-scams had risen 14.3% year on year (110,268). — [Escudo Digital, citing Ministerio del Interior Balance de Criminalidad](https://www.escudodigital.com/interior/ciberestafas-delito-mas-aumenta-espana-toda-criminalidad.html). The Q4 2025 balance exists but I did not read it: [Interior, Balance Q4 2025 PDF](https://estadisticasdecriminalidad.ses.mir.es/publico/portalestadistico/dam/jcr:7d3776cd-9ca4-4c02-8ca4-96b2571dbee4/Balance%20de%20Criminalidad%20Cuarto%20Trimestre%202025.pdf)
- How "hijo en apuros" works: the scammer writes from a new number ("se me ha roto/mojado el móvil"), asks the victim to save the new contact, and then asks urgently for money (a fine, a new phone) via transfer or Bizum. — [Valencianews](https://valencianews.es/tendencias/mama-se-me-ha-roto-el-movil-asi-funciona-estafa-del-hijo-en-apuros-sms-y-whatsapp/); [65ymás](https://www.65ymas.com/ciberseguridad/estafa-familiar-en-apuros-vuelve-con-fuerza-hacer-si-caes-en-trampa_81258_102.html); [Infobae 2024](https://www.infobae.com/espana/2024/05/14/me-acaban-de-robar-500-euros-alertan-de-la-estafa-de-whatsapp-que-suplanta-a-tus-familiares-para-robar-dinero-con-bizum/)
- Official advice from the Generalitat Valenciana: verify by calling the relative on their usual number. — [Concienciat GVA, "Las 5 estafas más comunes de Bizum"](https://concienciat.gva.es/sabias_que/las-5-estafas-mas-comunes-de-bizum/)
- One blog claims "500+ arrests and €5M+ stolen" for the hijo-en-apuros scam. It cites no official source, so **treat as unreliable**. — [digitalperito.es](https://digitalperito.es/blog/estafa-hijo-apuros-whatsapp-espana-2026-como-actuar/)
- Abuse by people the elderly victim trusts (relatives or carers with access to the phone, PIN or cards) is also reported. — [La Voz de Ibiza](https://lavozdeibiza.com/sociedad/el-peligro-detras-de-bizum-que-pone-en-alerta-a-las-personas-mayores-miles-de-euros-pueden-desaparecer-sin-que-lo-adviertan/)
- Banco de España has warned that spoofed SMS can appear **in the same thread as genuine bank SMS**, and that call-ID spoofing imitates bank numbers. — [BdE guía de consejos para prevenir el fraude (PDF)](https://clientebancario.bde.es/f/webcb/RCL/ActualidadEducacionFinanciera/Iniciativas/GuiaConsejosprevenirfraudeoperacionesbancariasaccesible.pdf)
- Press reports that in BdE's latest complaints report, complaints about fraudulent card and transfer use overtook mortgages as the top source of bank–customer disputes. This is secondary and its dating looks inconsistent, so verify against the Memoria de Reclamaciones. — [Merca2](https://www.merca2.es/2026/07/22/advertencia-fraude-bancario-espana-2025-2421778/)
- Spain's anti-scam plan (Ministerio para la Transformación Digital) targets CLI spoofing and smishing. Operators now block spoofed calls and SMS, and one report says nearly 50M calls and 2M SMS were blocked "since March". — [Plan antiestafas press release (PDF)](https://digital.gob.es/dam/es/portalmtdfp/comunicacion/notas-de-prensa/NdP-plan-antiestafas.pdf); [El Periòdic](https://www.elperiodic.com/avalancha-estafas-espana-bloquea-casi-millones-llamadas-millones-fraudulentos-desde-marzo_1032348). The headline numbers come from the search snippet only, since the page could not be fetched.

**Features in other apps**
- **Monzo Trusted Contacts (UK):** the customer picks up to 3 friends or family who also use Monzo. When a transfer or savings withdrawal goes above the customer's daily allowance, the trusted contact is asked to check it. The contact sees **limited information** about the payment, with the customer's consent. If the contact flags it, Monzo tells the customer the contact doesn't think it looks safe. It launched around 2023 alongside "Call Status" and "Secret Questions". — [Monzo Help, Trusted Contacts](https://monzo.com/help/Account%20Security/trustedcontacts); [Monzo blog, trio of security tools](https://monzo.com/blog/introducing-our-industry-first-security-tools); [Finovate](https://finovate.com/monzo-unveils-unique-fraud-controls/)
- **Monzo third-party access:** separately from the above, a partner, relative or friend can get **read-only access** to help look after the account. In Ireland, a "Trusted Contact" is someone Monzo can call if it is worried about the customer's wellbeing, with no account access. — [Monzo, third-party access](https://monzo.com/supporting-customers/third-party-access); [Monzo IE help](https://monzo.com/ie/help/getting-extra-support/help-third-party)
- **Starling Connected Card (UK, launched April 2020):** a second card for a trusted helper. Money is held in a separate "space" capped at £200 and set by the holder in the app. The card is PIN-protected and works **in-store only**: no ATM, online, mobile wallet or gambling. The helper cannot see the account. — [Starling press release](https://starlingbank.com/news/starling-bank-launches-connected-card); [Money to the Masses](https://moneytothemasses.com/banking/starling-bank-review-the-best-place-to-put-your-money/amp)
- **Revolut:** if you open the app while on a phone call, it shows an in-app alert, in red if the call is not from Revolut. It also covers third-party calling apps. One Spanish article says it was not yet available in Spain at the time. — [Xataka Móvil](https://www.xatakamovil.com/aplicaciones/estamos-hartos-estafas-llamadas-que-bancos-mueven-ficha-operadores-revolut-ha-ido-alla); [Yahoo/RBI](https://finance.yahoo.com/news/revolut-rolls-app-alert-tackle-113435024.html)
- **BBVA (Spain):** with "verified calls", the customer gets an in-app notification when BBVA is really calling and can check in the app's Security section whether a call is legitimate. BBVA states it never contacts customers by SMS, email or call to make them carry out or cancel an operation. — [BBVA](https://www.bbva.com/es/innovacion/bbva-refuerza-la-seguridad-ante-fraudes-con-llamadas-verificadas-en-la-app/)
- **CaixaBank:** warns about messages asking customers to uninstall the official app and install another one. — [Diari de Tarragona](https://www.diaridetarragona.com/espana/250815/caixabank-alerta-nueva-estafa.html)
- **EverSafe (US):**
  - builds a baseline from the user's history and alerts on unusual withdrawals, missing deposits, spending changes and late bill payments, by email, SMS, phone or app
  - members can add "Trusted Advocates" (family, caregivers, professionals) at no extra cost
  - by default, advocates receive alerts **without transaction details**; seeing balances and transactions needs an extra, explicit grant
  - no money movement is possible
  - Source: [EverSafe FAQ](https://www.eversafe.com/faq); [EverSafe](https://eversafe.com/index7.html) (vendor claims)
- **Carefull (US):** monitors bank and card accounts for 20+ "financial mistakes" and alerts caregivers by email or SMS. The parent can also use the app. — [AARP](https://www.aarp.org/personal-technology/tools-to-avoid-elder-financial-abuse/)

### Inferences
Taimo is not a bank and cannot block payments. It can still add friction, education and social verification:
1. **"Persona de confianza"**: an opt-in, revocable family link. The trusted person gets alerts on chosen triggers: a large expense logged, a new recurring payment, a pension not received, or no activity for X days. Use **tiered visibility** as EverSafe does: alerts only by default, totals as an option, full detail only with an explicit grant. Show a permanent "who can see my data" panel.
2. **"Antes de pagar, comprueba"**: a checklist the user can open from a big button or the widget, written for the hijo-en-apuros and bank-impersonation patterns. For example: "¿Te escribe desde un número nuevo? Llama a su número de siempre", "Tu banco nunca te pide hacer una transferencia para 'proteger' tu dinero", "¿Hay prisa? Es una señal de estafa". It should include a one-tap "Llamar a mi persona de confianza".
3. **Pattern prompts inside Taimo**: when a user logs or imports an unusually large or first-time Bizum or transfer to a new name, show a soft "¿Lo has comprobado por teléfono?" prompt. Never block the action.
4. **Taimo never asks for bank credentials, codes or calls.** Say this in the app, as BBVA does. If Taimo connects bank accounts via PSD2 aggregation, the consent flow must be visibly inside the official bank screens.
5. Avoid SMS links in Taimo's own communications. Scammers mimic exactly those threads.

### Gaps
- I found no official 2024–2026 Spanish statistic that breaks down scam victims by age (Interior's Balance does not split estafas by victim age in what I saw). Any "X% of victims are over 65" claim needs a source such as the Interior *Informe sobre la cibercriminalidad* or a Fiscalía memoria, which I did not reach.
- I found no 2025 INCIBE/OSI figures specific to the hijo-en-apuros scam.
- I found no Spanish bank or app offering a Monzo-style trusted-contact approval. That is inference from absence in search results, not proof.
- I could not verify whether Revolut's call alert is now live in Spain.

## 3. Cash: how much seniors in Spain still use it, and the need to log cash quickly

### Takeaway
Cash is still the main payment method for most older Spaniards (about 76–78% of over-65s in recent Banco de España studies). For them, a finance app that only reads bank data misses most of their day-to-day spending. Fast cash logging is therefore a core feature, not an extra.

### Cited Findings
- BdE *Estudio sobre hábitos en el uso del efectivo* (2023 edition, Boletín Económico 2024/T1):
  - cash is the most usual payment method for **76% of over-65s**
  - **15.2% of over-65s use only cash** for purchases, vs 7.8% of the total population
  - Source: [BdE Boletín Económico 2024/T1 (PDF)](https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/InformesBoletinesRevistas/BoletinEconomico/24/T1/Fich/be2401-art01.pdf)
- 2024 edition: cash was the main means of payment in traditional shops for almost 60% of the population and **78% of over-65s**. — [BdE Cliente Bancario blog](https://clientebancario.bde.es/pcb/es/blog/que-papel-tiene-el-efectivo-hoy-en-dia-en-nuestros-pagos.html)
- 2025 edition (BdE press release 2025/110): cash as main means fell overall from 59% to 57%. Among people over 64, only 4% expect to pay less in cash. — [BdE nota informativa 2025 (PDF)](https://www.bde.es/f/webbe/GAP/Secciones/SalaPrensa/NotasInformativas/25/presbe2025_110.pdf). These figures come from a search snippet, since the PDF could not be fetched.
- Since 2024, people over 65 and people with disabilities are exempt from fees for withdrawing cash at the bank counter. — [Consumo](https://portal-cec.consumo.gob.es/en/comunicacion/noticias/2024/mayores-de-65-anos-y-personas-con-discapacidad-exentos-de-pagar); [BdE Cliente Bancario](https://clientebancario.bde.es/pcb/es/blog/mayores-y-discapacitados-no-pagaran-comisiones-por-sacar-dinero-en-su-banco.html)

### Inferences
- Cash logging needs:
  - one big-button flow ("Apunté en efectivo" → amount keypad → optional category → done) in 2–3 taps
  - voice ("He gastado 12 euros en la farmacia"), which matches Taimo's existing Siri feature
  - a home-screen widget
- Support **cash withdrawals as a "wallet"**: log "Saqué 200 € del cajero", then subtract cash spends from it, and optionally reconcile with "¿Cuánto te queda en el monedero?" at week end. That avoids double counting the withdrawal and the spends.
- Predefined senior-relevant categories: farmacia, mercado/frutería, panadería, peluquería, lotería, donativos, nietos/regalos, taxi.
- Use a large-number keypad with a euro sign and coin shortcuts (0.50 / 1 / 2 / 5 / 10 / 20 / 50).

### Gaps
- I could not open the 2024 and 2025 EHUE PDFs, so the 78% (2024) and 4% (2025) figures rest on search snippets of BdE pages.
- I found no study on how seniors would prefer to log cash (voice vs typing).

## 4. Family features: helping parents remotely, shared view with consent, pensions, recurring bills, pharmacy

### Takeaway
Established models are read-only or alert-only helper access (Monzo, EverSafe), capped proxy spending (Starling), and caregiver monitoring (Carefull). All of them rest on **explicit, revocable consent and graded visibility**. I found no Spain-specific product doing this in a personal-finance app, so this is a gap Taimo could fill.

### Cited Findings
- Graded visibility: EverSafe advocates get alerts by default, and seeing balances and transactions needs an extra designation. — [EverSafe FAQ](https://www.eversafe.com/faq)
- Read-only family access to a bank account exists at Monzo (UK and IE). — [Monzo third-party access](https://monzo.com/supporting-customers/third-party-access)
- Caregiver alerts on "mistakes" such as late bill payments and unusual charges come from Carefull and EverSafe. — [AARP](https://www.aarp.org/personal-technology/tools-to-avoid-elder-financial-abuse/)
- Risk of abuse by people close to the user (relatives using the elder's phone, PIN or Bizum). — [La Voz de Ibiza](https://lavozdeibiza.com/sociedad/el-peligro-detras-de-bizum-que-pone-en-alerta-a-las-personas-mayores-miles-de-euros-pueden-desaparecer-sin-que-lo-adviertan/)

### Inferences
- **"Ayudar a un familiar"** mode in Taimo:
  - The parent invites the child, or the child sends an invite that the parent must accept on their own phone.
  - The parent chooses a level: (a) alerts only, (b) monthly summary, (c) full view.
  - The helper cannot edit by default. "Can add cash expenses for me" is a separate permission, useful when the child shops for the parent.
  - Every access is logged and visible to the parent, and revocable with one button.
  - Design for the abuse risk too: no silent access, and periodic "Sigues compartiendo con X. ¿Quieres seguir?" reminders.
- **Fixed-income view**: a "Mi pensión" income card on the usual pay date (pensions in Spain are paid around the 25th; verify per bank). Show "Lo que me queda hasta la próxima pensión", which means pension minus upcoming fixed bills. Flag the extra-payment months (June and November) when there are 14 payments [training knowledge].
- **Recurring bills (recibos)**: templates for luz, agua, gas, comunidad, IBI, teléfono/internet, seguro de decesos, seguro de hogar, plus expected-amount alerts ("Tu recibo de luz es un 40% más alto que el mes pasado"). Taimo already has subscription alerts, so extend them to domiciliaciones.
- **Pharmacy and health**: a "Farmacia" category, with a monthly copago total and an optional reminder of the annual copago cap rules [training knowledge, verify].
- A shared "Gastos de mamá" group, for siblings splitting a parent's care costs (residencia, cuidadora, medicinas), fits Taimo's existing group and split features.

### Gaps
- I found no evidence of what share of Spanish seniors already get help from family with banking apps (a 2023–2026 survey would help).
- I found no data on monthly pharmacy spending by Spanish pensioners.
- I did not verify the legal constraints under GDPR for a helper viewing another adult's financial data. Inference: consent from the data subject is the lawful basis, and it must be revocable. Health-related inferences, such as pharmacy categories, may be special-category data, so this needs legal review.

## 5. Accessibility standards: WCAG 2.2 AA and the European Accessibility Act

### Takeaway
The EAA (Directive 2019/882), which Spain transposed with **Ley 11/2023**, has applied since **28 June 2025** to "consumer banking services" and the websites and apps that deliver them. Commentators read that as payment services, credit and certain investment services, and some say pure deposit-taking is excluded. A free budgeting and expense-splitting app that does not provide payment or credit services is **probably outside the EAA's scope**. It would come into scope if it adds payment initiation or e-money, unless the company is a microenterprise. Meeting WCAG 2.2 AA (via EN 301 549) is still the right target.

### Cited Findings
- EAA enforcement started 28 June 2025. It covers financial services and digital channels, including online banking, mobile banking apps and online onboarding. — [Travers Smith](https://www.traverssmith.com/knowledge/knowledge-container/a-week-to-go-the-european-accessibility-act-and-its-impact-on-the-financial-services-industry/); [accessible.org](https://accessible.org/eaa-banking-financial-services/)
- "Consumer banking services" include credit agreements, payment services, payment accounts and e-money, and certain MiFID investment services. Commentators say **pure deposit business is not in scope**. — [HLC](https://hlc.com/en/publications/the-european-accessibility-act-what-should-financial-services-firms-be-focusing-on-as-the-june-2025); [PwC Switzerland](https://www.pwc.ch/en/insights/regulation/new-rules-the-eu-accessibility-act.html)
- The technical baseline is EN 301 549, which references WCAG 2.1 AA for web and mobile. Microenterprises providing services may be exempt. — [accessible.org](https://accessible.org/eaa-banking-financial-services/); [PwC](https://www.pwc.ch/en/insights/regulation/new-rules-the-eu-accessibility-act.html)
- Spain: Ley 11/2023 (in force 10 May 2023) transposes the EAA in its Título I. Product and service obligations apply from 28 June 2025, and Fieldfisher lists banking among the affected sectors. — [Fieldfisher](https://www.fieldfisher.com/ca-es/locations/espana/actualidad/accesibilidad-obligatoria-claves-de-la-transposicion-accesibility-act); [CMS](https://cms.law/en/esp/publication/la-trasposicion-de-la-directiva-ue-2019-882-relativa-a-los-requisitos-minimos-de-accesibilidad-de-determinados-productos-y-servicios)
- **[training knowledge]** EAA Annex I, Section IV, for consumer banking services requires information that is understandable "without exceeding a level of complexity superior to level B2 (upper intermediate) of the Common European Framework of Reference for Languages". This is a concrete plain-language anchor. — [Directive (EU) 2019/882, EUR-Lex](https://eur-lex.europa.eu/eli/dir/2019/882/oj)
- **[training knowledge]** The microenterprise exemption for services covers fewer than 10 employees and annual turnover or balance sheet of €2M or less (Art. 4(5) and Art. 3(23)). — [EUR-Lex 2019/882](https://eur-lex.europa.eu/eli/dir/2019/882/oj)
- **[training knowledge]** WCAG 2.2 (W3C Recommendation, Oct 2023) adds AA criteria directly relevant here:
  - 2.5.8 Target Size (Minimum): at least 24×24 CSS px
  - 2.5.7 Dragging Movements: a single-pointer alternative to drag
  - 3.2.6 Consistent Help
  - 3.3.7 Redundant Entry
  - 3.3.8 Accessible Authentication (Minimum): no cognitive test such as remembering or transcribing codes without assistance
  - Also relevant from earlier versions: 1.4.3 contrast at least 4.5:1, 1.4.4 resize text to 200%, and 1.4.10 reflow
  - Source: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)

### Inferences
- Taimo's legal exposure under the EAA depends on its business model. A budgeting or splitting tool with no payment or credit service is likely out of scope. Adding "pay your share" through a payment service or e-money would likely bring that flow into scope, unless the operator is a microenterprise (Taimo's "pagar la deuda en un toque" / "paga tu parte por QR" features should be checked against this). Get legal confirmation. This is my interpretation, not settled guidance.
- Regardless of scope, adopt **WCAG 2.2 AA plus extras for older users**:
  - 48dp targets
  - full support for OS font scaling up to 200% without truncating amounts
  - reflow at large sizes
  - contrast of at least 4.5:1 (7:1 in high-contrast mode)
  - screen reader labels that read amounts and signs correctly in each of the 20 languages
  - no time-outs on confirmation screens
  - biometric or passkey login instead of codes (3.3.8)
  - plain language at about CEFR B1–B2 in all 20 locales, with a glossary for financial terms
- An accessibility statement in the app and on the website is good practice and low cost. It is required for in-scope services under the EAA (Annex V information).

### Gaps
- I did not re-read Article 2 and the Annex of Directive 2019/882 live. The scope reading relies on law-firm commentary and training knowledge, so confirm against EUR-Lex and Ley 11/2023 before any compliance claim.
- I did not check whether any Spanish authority (Ministerio de Derechos Sociales or a designated market-surveillance body) has published EAA guidance or enforcement on fintech apps since June 2025.
