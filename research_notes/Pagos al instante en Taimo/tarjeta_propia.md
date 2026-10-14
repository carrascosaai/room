# Rutas de "tarjeta propia" para Taimo: emitir tarjeta Taimo (BaaS) y modelo tipo Curve (2026)

Notas de investigación, 14 oct 2026. Nota de método: WebFetch no pudo resolver varios dominios (stripe.com, swan.io), así que muchos datos vienen de los resúmenes de búsqueda. Cada uno va con su URL. Conviene comprobar las cifras en las páginas originales antes de publicarlas.

## 1. Proveedores europeos de BaaS y emisión: encaje, webhooks en tiempo real, Apple Pay/Google Pay, costes y plazos

### Conclusión
Hay varios emisores con licencia EMI que pueden emitir una tarjeta con marca Taimo en España y añadirla a Apple Pay/Google Pay: Swan, Wallester, Treezor, Paynetics/Weavr, Marqeta (vía TransactPay) y Pecunpay (EDE española). Casi ninguno publica precios para un programa de consumo con marca blanca, así que habrá que pedir presupuesto a ventas. Stripe Issuing, el más fácil para developers, solo admite usos comerciales (empresas) en la UE. No encaja con una app de consumo.

### Hallazgos con fuente
- **Stripe Issuing (UE):** la página de soporte de Stripe dice que Issuing "solo admite casos de uso comerciales en EE. UU., Reino Unido y países de la UE". El programa de tarjetas de consumo está en private preview y es un programa de crédito con banco patrocinador (centrado en EE. UU.) — [Stripe support](https://support.stripe.com/questions/how-to-apply-for-issuing); [Stripe Issuing consumer](https://stripe.com/issuing/consumer)
- En Europa, las tarjetas de Stripe las emite Stripe Technology Europe Limited, EMI autorizada por el Banco Central de Irlanda. Issuing se lanzó en 2021 en 20 mercados europeos, España incluida — [How Issuing works](https://docs.stripe.com/issuing/how-issuing-works); [Electronic Payments International](https://www.electronicpaymentsinternational.com/news/stripe-launches-issuing-service-in-20-european-countries/)
- **Autorización en tiempo real de Stripe (es la referencia de "ver cada pago al instante"):** con cada compra, Stripe envía el evento `issuing_authorization.request` al endpoint configurado. Hay que aprobar o denegar en 2 segundos. Si no hay respuesta, se aplica la configuración de timeout. "Autopilot" (public preview) da una alternativa si tus sistemas caen — [Stripe docs real-time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations)
- **Swan (EMI francesa, Mastercard):** admite Apple Pay y Google Pay, ninguna otra wallet. Hay que certificar la integración de tarjeta digital antes de que los usuarios puedan usarlas. La guía de push provisioning no es pública por las políticas de Apple y Google — [Swan docs: digital cards](https://docs.swan.io/topics/cards/digital/)
- Swan: "el comercio pide autorización a Swan y a Mastercard. Swan te comparte la decisión mediante payment control", es decir, un hook de autorización en tiempo real — [Swan docs: card payments](https://docs.swan.io/topics/payments/cards/)
- Swan: la tarifa por tarjeta "depende de tu contrato" y figura en sus T&C. Los partners "reciben una parte del interchange" — [Swan docs](https://docs.swan.io/concept/card); [Swan card programs](https://swan.io/card-programs)
- Swan: su página de precios menciona tarifas variables (p. ej. €0,40 por transferencia SEPA) y un recargo del 2% en pagos con tarjeta en moneda no euro. El ejemplo de "el emisor se queda ~1,50%" se refiere a tarjetas de empresa, no de consumo (IFR) — [Swan pricing](https://www.swan.io/es/pricing). Una plantilla de facturación de un tercero (Lago) usa €0,10 por tarjeta emitida como ejemplo, sin fecha. No es fiable — [Lago template](https://getlago.com/resources/templates/swan)
- **Wallester (EMI estonia, Visa):** precios publicados del producto *business*: plan gratis (300 tarjetas virtuales), Premium €199/mes (3.000), Platinum €999/mes (18.000), Enterprise a medida. Tarjeta virtual extra: €0,35, €0,20 o €0,10 al mes según plan. Envío de tarjeta física: €5 estándar, €20 urgente — [Wallester pricing](https://wallester.com/gb/business/pricing); [price list](https://wallester.com/business/pricing/price-list)
- Wallester admite Apple Pay — [Wallester Apple Pay](https://wallester.com/apple-pay). Ofrece programa de marca blanca (Visa débito/crédito/prepago, app y portal de cliente en marca blanca). El precio de marca blanca no es público — [Wallester fintech](https://wallester.com/card-solutions/fintech-companies)
- **Treezor (grupo Société Générale):** opera en 25 países, España incluida. Su proceso: declaración ante regulador y esquema, integración API, pruebas y fabricación de tarjetas. No publica precios — [Treezor issuing](https://www.treezor.com/services/payment-issuing-solutions/)
- **Paynetics / Weavr:** Weavr funciona sobre la emisión de Paynetics. En su lanzamiento (hace años, sin fecha clara) Weavr afirmó que el coste de arranque bajaba a "unos cientos de libras", frente a decenas de miles en un programa prepago a medida. Es una afirmación de marketing — [Paynetics: Weavr launch](https://www.paynetics.digital/media/payments-innovation-platform-weavr-selects-launch-partners/). Paynetics tiene una oferta específica para *program managers* — [Paynetics program managers](https://www.paynetics.digital/program-managers/)
- **Marqeta (Europa):** consiguió capacidad de *program management* completa en Europa (gestiona relaciones con banco, red y regulador) al comprar TransactPay. El 26 de mayo de 2026 amplió cuentas y movimiento de dinero a 30 países más vía Banking Circle. Su TPV de programas europeos se multiplicó por 8 entre 2022 y 2025 — [BusinessWire 26 mayo 2026](https://www.businesswire.com/news/home/20260526401927/en/Marqeta-Expands-Account-and-Money-Movement-Offering-in-Europe-Building-on-Strong-Regional-Momentum). Oficina de Varsovia para program management en Europa (2024) — [Marqeta blog](https://www.marqeta.com/blog/marqetas-warsaw-office-opens-to-boost-card-program-management-in-europe)
- **Pecunpay (EDE española supervisada por el Banco de España):** emisión y adquirencia con alcance europeo y foco en fintechs y neobancos. Minsait Payments (Indra) compró el 100% en noviembre de 2023 — [Minsait/Indra PDF](https://www.indracompany.com/sites/default/files/231114_np_minsait_payments_pecunpay.pdf). Tiene acuerdo con viafintech (Paysafe) para dar acceso a su core y sus licencias (2022) — [EPI](https://www.electronicpaymentsinternational.com/news/paysafe-viafintech-pecunpay-spain)
- **Plazos y coste genérico:** el proveedor Codego (Malta) dice que montar emisión propia cuesta 12–24 meses y 0,5–2 M USD, y que con su plataforma se sale en menos de 15 días. Es marketing — [Codego](https://codegotech.com/). Cross River (banco de EE. UU., 2023): con buena planificación, un lanzamiento de tarjeta lleva unos 4–6 meses — [Cross River](https://www.crossriver.com/insights/mastering-your-card-program-launch)
- **Certificación de Apple Pay:** es un flujo de trabajo propio del emisor, con su propio calendario. Exige pruebas en producción con transacciones reales y laboratorios externos con fechas fijas — [StraitsX](https://www.straitsx.com/blog-post/getting-your-card-program-ready-for-apple-pay); [M2P checklist](https://m2pfintech.com/blog/apple-pay-issuer-readiness-checklist/)

### Inferencias
- Candidatos realistas para un programa de consumo en España con marca Taimo: Swan (API muy developer-friendly, Mastercard, Apple/Google Pay, hook de autorización), Wallester (Visa, precios públicos, marca blanca), Treezor, Paynetics/Weavr, Pecunpay (interlocutor local en español, supervisado por el Banco de España) y Marqeta (más enterprise).
- Stripe Issuing queda descartado para tarjetas de consumo en la UE en 2026, salvo cambios. Su API de autorización en 2 s sirve como modelo técnico.
- Plazo orientativo con un BaaS: 3–6 meses para la tarjeta virtual y algo más para la física y la certificación Apple/Google Pay. Es una inferencia a partir de afirmaciones de proveedores; falta confirmarlo con presupuestos reales.
- "Ver cada pago al instante" lo resuelve el hook de autorización o los webhooks de transacción del emisor: Taimo recibe cada compra en el momento de la autorización, no al liquidar.

### Huecos
- No hay precios públicos de programas de consumo en marca blanca: setup fee, mínimos mensuales, coste por tarjeta física y reparto de interchange. Ningún proveedor los publica. Hay que pedir presupuesto.
- No se encontraron precios ni capacidades confirmadas para Railsr, Solaris, Adyen Issuing (orientado a plataformas B2B), Enfuce, Modulr ni Unlimit en esta búsqueda. Solaris y Railsr pasaron por reestructuraciones conocidas antes de 2025; conviene verificar su estado en 2026.

## 2. Licencias: ¿puede Taimo ser program manager bajo la EMI de otro? KYC/AML y Banco de España

### Conclusión
Sí. El modelo normal es que la EMI o el banco del proveedor sea el emisor regulado y Taimo el *program manager* o distribuidor/agente. La entidad debe notificar o registrar a Taimo ante el Banco de España (o ante el supervisor de origen, por pasaporte). Taimo no necesita licencia propia, pero sí cumplir controles de KYC/AML, que normalmente se delegan en el KYC del proveedor.

### Hallazgos con fuente
- El RD 778/2012 exige que las entidades de dinero electrónico se inscriban en un registro especial del Banco de España antes de operar, con requisitos de capital inicial e idoneidad de socios y administradores — [BOE RD 778/2012](https://www.boe.es/eli/es/rd/2012/05/04/778/con)
- Las EDE que prestan servicios de pago deben notificar al Banco de España si quieren nombrar agentes. Una EDE puede distribuir y reembolsar dinero electrónico mediante intermediarios que actúan en su nombre, tras registrarlos en el Banco de España — [Banco de España: entidades supervisadas](https://www.bde.es/wbe/es/punto-informacion/contenidos/autorizaciones-acreditaciones/inscripcion-registros-oficiales/); [finreg360](https://finreg360.com/alerta/se-aprueba-el-desarrollo-de-la-transposicion-de-la-psd-2-en-espana/)
- El Banco de España recuerda al consumidor que debe saber qué entidad le emite realmente la tarjeta y que las EDE no están cubiertas por el Fondo de Garantía de Depósitos — [Portal Cliente Bancario BdE](https://clientebancario.bde.es/pcb/es/blog/sabes-con-quien-estas-contratando-tu-tarjeta.html)
- Ejemplo de pasaporte: Curve Europe UAB obtuvo licencia EMI del Banco de Lituania (LB002003, 22 oct 2020) para operar en el EEE. En 2021 se amplió para ejecutar pagos cubiertos por línea de crédito — [Bank of Lithuania](https://www.lb.lt/en/news/curve-europe-uab-granted-electronic-money-institution-licence); [Ellex](https://ellex.legal/fintech-star-curve-extends-its-licence-in-lithuania/)

### Inferencias
- Bajo la licencia del partner, Taimo asume: onboarding con verificación de identidad (KYC por vídeo o documento + selfie, que suele dar el BaaS o proveedores como Onfido/Veriff), monitorización AML compartida, atención al cliente, gestión de fraude y disputas (según contrato) y transparencia en marketing (identificar a la entidad emisora).
- Una licencia EMI propia en España exige capital inicial (350.000 € según la normativa EMI de la UE; no está verificado en esta búsqueda), plan de negocio y salvaguarda, y suele tardar 12 meses o más. No tiene sentido en la fase actual.

### Huecos
- No hay un coste ni un plazo publicados para registrar a un agente o distribuidor en el Banco de España. No se confirmó la cifra de capital mínimo de una EDE en una fuente primaria.
- PSD3/PSR: su estado en 2026 no se verificó en esta búsqueda.

## 3. Modelo Curve: cómo funciona, regulación, economía unitaria, problemas y si sigue permitido en 2026

### Conclusión
Curve emite su propia Mastercard (débito o prepago, con licencia EMI) y, en cada compra, carga al instante el importe a la tarjeta subyacente que elige el usuario. Funciona como "monedero escalonado" con financiación back-to-back. El modelo sigue permitido en la UE en 2026, pero los esquemas lo regulan como Staged Digital Wallet. Curve nunca fue claramente rentable de forma sostenida y fue vendido a Lloyds por unos 120 M£ (precio no confirmado oficialmente), por debajo de su valoración de 2023.

### Hallazgos con fuente
- **Mecánica:** el usuario guarda sus tarjetas en la app y Curve genera una Mastercard digital (y física si se quiere) que redirige el cobro — [onlinemarktplatz.de 2026](https://onlinemarktplatz.de/265830/curve-wallet/); [Wikipedia: Curve](https://en.wikipedia.org/wiki/Curve_(payment_card))
- **Reglas de los esquemas:** según Visa, todo monedero capaz de "back-to-back funding" ("live load" o "real-time load") se clasifica como Staged Digital Wallet (SDW). Los SDW necesitan contratos con adquirentes y comercios y no pueden tener una credencial de pago de uso general vinculada al "frente" del monedero. Los pass-through solo envían la credencial del cliente — [Visa Digital Wallet guide oct 2024](https://usa.visa.com/content/dam/VCOM/global/support-legal/documents/digital-wallet-guide-october-2024.pdf)
- Visa Core Rules (18 abr 2026): aclara la clasificación de los tipos de monedero digital y permite su uso en transacciones agénticas — [Visa Rules 18 Apr 2026](https://usa.visa.com/dam/VCOM/download/about-visa/visa-rules-public.pdf)
- Mastercard cobra una "Staged Digital-Wallet Operator Annual Network Access Fee" desde 2013, escalonada por volumen. Fuente secundaria antigua — [CardFellow](https://www.cardfellow.com/blog/staged-digital-wallet-fees). La Comisión Europea investigó las tarifas de Visa a los SDW en 2020 — [PYMNTS 2020](https://www.pymnts.com/visa/2020/european-commission-investigating-visas-staged-digital-wallet-fees/)
- **Problemas con las redes:** Curve tuvo que retirar Amex como tarjeta subyacente porque Amex dudaba de cómo gestionaba disputas, reembolsos y chargebacks (FT, ~2017–2018; fecha no confirmada en el snippet) — [PYMNTS](https://pymnts.com/?p=227400)
- **Tarifas (calendario EEA v5, 17 nov 2025):** el plan gratuito permite tarjetas ilimitadas. "Curve Fronted" (cargar a tarjeta de crédito pagos que el comercio no aceptaría con crédito) cuesta 2,5% en Pay y Pay X; en Pay Pro y Pro+ los primeros €1.000 y €3.000 al mes son gratis. El plan gratis permite 3 "Go Back in Time" cada 30 días y €250 de gasto en divisa antes de una comisión del 2,99% — [Curve EEA Subscription Schedule v5](https://cdn.buttercms.com/sRQ1ZAgTkuICNQRdaxTS); [Thomas Tadiotto nov 2025](https://www.thomastadiotto.com/en/2025/11/12/is-curve-still-worth-using/); [Be Clever With Your Cash](https://becleverwithyourcash.com/curve-has-upped-its-fees-and-dropped-its-overseas-allowances/)
- **Finanzas:** en 2023 Curve perdió 36 M£ antes de impuestos (69,1 M£ en 2022). Los ingresos fueron 26,7 M£, más de la mitad por interchange. Los auditores señalaron "incertidumbre material" sobre la continuidad. En 2024 levantó 29,8 M£ en equity y 11,6 M£ en deuda — [Sifted mar 2025](https://sifted.eu/articles/curve-results-news); [tech.eu mar 2025](https://tech.eu/2025/03/11/curve-halves-losses-as-it-puts-us-expansion-plans-on-hold/). City AM cifra la pérdida del ejercicio 2024 en 9,5 M£ con ingresos de 37 M£. Esto choca con otra filing que da 35 M£ de pérdida para otra entidad del grupo; sin conciliar — [City AM](https://www.cityam.com/curve-swings-to-9m-loss-as-uncertainty-looms-ahead-of-lloyds-takeover)
- **Venta a Lloyds:** anunciada el 19 nov 2025, con cierre previsto en el primer semestre de 2026 sujeto a aprobación regulatoria. Términos no revelados; Sky News habla de unos 120 M£ frente a 133 M£ de valoración en la Serie C de 2023. IDC Ventures (~12%) se opuso — [Lloyds RNS](https://www.investegate.co.uk/announcement/rns/lloyds-banking-group--lloy/curve-acquisition/9242567); [tech.eu 19 nov 2025](https://tech.eu/2025/11/19/curve-confirms-sale-to-lloyds/); [Payment Expert](https://paymentexpert.com/2025/09/08/lloyds-120m-curve-acquisition/); [Curve blog](https://link.curve.com/blog/curve-is-joining-lloyds-banking-group)

### Inferencias
- Economía del modelo Curve en la UE: Curve cobra interchange como emisor en la pata del comercio (≤0,2% débito y ≤0,3% crédito con el IFR). Pero al cargar la tarjeta subyacente actúa como comercio y paga la tasa de descuento (interchange + esquema + margen del adquirente). Con tarjetas de consumo de la UE, ambas patas tienen tope, así que el margen de arbitraje es casi nulo o negativo. Por eso Curve vive de suscripciones y comisiones (Fronted 2,5%, FX). Es una inferencia sin fuente directa sobre los márgenes por transacción de Curve.
- Para Taimo, replicar Curve exige ser SDW (o apoyarse en un emisor que ya lo sea), firmar adquirencia, gestionar dobles disputas (chargeback en las dos patas), riesgo de fraude y posibles bloqueos de bancos emisores (BBVA, Santander o Revolut pueden tratar el cargo como "quasi-cash" o rechazarlo). Es mucho más complejo y caro que una tarjeta propia prefinanciada, y con peor economía.
- **¿Sigue permitido en 2026?** Sí: Curve sigue operando en el EEE con la EMI lituana y las reglas de Visa de 2026 siguen contemplando los SDW. Requiere cumplir las reglas de los esquemas y pagar sus tarifas.

### Huecos
- No se encontró ninguna fuente que confirme el cierre efectivo de la compra de Lloyds en el primer semestre de 2026.
- Faltan detalles públicos de la clasificación de Curve en Mastercard y de su margen neto por transacción.

## 4. Interchange en la UE e ingresos esperables por usuario activo

### Conclusión
El IFR limita el interchange de tarjetas de consumo al 0,2% en débito y al 0,3% en crédito, y además el emisor de la EMI comparte solo una parte con el program manager. Una app gratuita puede esperar del orden de céntimos a pocas decenas de céntimos de euro al mes por usuario activo. No basta para cubrir costes sin otras fuentes de ingreso.

### Hallazgos con fuente
- IFR: tope del 0,2% del valor de la operación en débito de consumo y del 0,3% en crédito de consumo. Los Estados miembros pueden fijar topes domésticos más bajos o una tarifa fija (p. ej. hasta €0,05 por operación en débito) — [Parlamento Europeo OEIL](https://oeil.europarl.europa.eu/oeil/en/document-summary?id=1291175); [Pinsent Masons](https://www.pinsentmasons.com/out-law/news/european-commission-proposes-credit-and-debit-card-fee-cap)
- Para tarjetas no UE usadas en comercios de la UE en remoto: 1,15% en débito y 1,5% en crédito (compromiso de Visa y Mastercard con la Comisión) — [Moodie Davitt](https://moodiedavittreport.com/?p=385563)
- Más de la mitad de los ingresos de Curve en 2023 (26,7 M£) vinieron del interchange — [Sifted](https://sifted.eu/articles/curve-results-news)
- Swan reparte interchange con los partners según el volumen transaccionado — [Swan pricing](https://www.swan.io/es/pricing)

### Inferencias (cálculo ilustrativo, no es una fuente)
- Usuario con €400 al mes de gasto en tarjeta Taimo (débito o prepago): 0,2% = €0,80/mes de interchange bruto. Con un reparto del 30–70% al program manager: €0,25–0,55/mes (€3–7/año).
- A eso hay que restar los costes por tarjeta (p. ej. €0,10–0,35/mes por tarjeta virtual en Wallester; la física se paga aparte, ~€5 de envío más la fabricación), el KYC por usuario (típicamente €1–2 por verificación; no verificado aquí) y el soporte. El margen neto por usuario es casi nulo o negativo, salvo con mucho gasto por usuario o ingresos extra (suscripción premium, FX, cashback patrocinado).
- Además, el usuario tiene que recargar la tarjeta Taimo (prepago o cuenta), lo que crea fricción: la mayoría seguirá pagando con BBVA o Santander. Ver cada pago al instante solo funciona con los pagos hechos con la tarjeta Taimo.

### Huecos
- No se encontró el estado de la revisión del IFR en 2025–2026 ni porcentajes públicos de reparto de interchange de los BaaS en programas de consumo.

## 5. Financiación: capital necesario e inversores y aceleradoras en el fintech español

### Conclusión
La tarjeta propia vía BaaS es técnicamente asumible sin inversor en un piloto pequeño (sobre todo con precios públicos tipo Wallester). Un lanzamiento serio de consumo en España, con tarjeta física, Apple/Google Pay, KYC, soporte y fraude, más mínimos contractuales y adquisición de usuarios, suele requerir capital de un pre-seed o seed. El modelo Curve requiere bastante más (Curve quemó decenas de millones de libras al año).

### Hallazgos con fuente
- Codego afirma que construirlo en casa cuesta 0,5–2 M USD y 12–24 meses (marketing) — [Codego](https://codegotech.com/)
- Weavr afirmó costes de arranque de "unos cientos de libras" en su plataforma (marketing antiguo) — [Paynetics](https://www.paynetics.digital/media/payments-innovation-platform-weavr-selects-launch-partners/)
- Curve: pérdidas de 69,1 M£ (2022) y 36 M£ (2023) — [Sifted](https://sifted.eu/articles/curve-results-news)
- Fondos españoles activos en fintech (directorios comerciales, cifras sin verificar): Kibo Ventures (Seed–Serie A/B, fintech entre sus focos), Seaya (>600 M€ en 5 fondos; etapa discutida), K Fund (Seed–Serie B, tickets de 100k€ a 10M€), Samaipata (plataformas con efectos de red, 5 inversiones fintech en España). También aparecen Nauta, Inveready, Bonsai Partners y Market One — [Shizune fintech VC Spain jul 2026](https://shizune.co/investors/fintech-vc-funds-spain); [Seedtable](https://www.seedtable.com/series-c-investors-spain); [AngelMatch](https://angelmatch.io/publication/top-vc-firms-in-spain)

### Inferencias
- Orden de magnitud orientativo (inferencia, no viene de una fuente): piloto con BaaS de precio público, entre unos pocos miles y unas decenas de miles de euros (integración, KYC, tarjetas físicas para los primeros usuarios, asesoría legal). Programa de consumo con contrato propio de program manager con Swan, Treezor o Pecunpay: probablemente 50–250 k€ el primer año entre setup, mínimos, certificaciones, legal y compliance. Hay que confirmarlo con presupuestos.

### Huecos
- No se verificaron programas concretos en 2026 de BBVA Open Innovation/Spark, Santander InnoVentures, Visa Fintech Partner Connect ni Mastercard Start Path (no aparecieron en los resultados). Hay que comprobarlos en sus webs oficiales.

## 6. A quién contactar primero y en qué orden

### Conclusión (inferencia basada en lo anterior)
1. **Hablar con 2–3 BaaS a la vez** para conseguir presupuestos y requisitos reales (setup, mínimos, coste por tarjeta, reparto de interchange, Apple/Google Pay, hook de autorización, plazo en España):
   - Swan, por la mejor API y el control de autorización — [Swan card programs](https://swan.io/card-programs)
   - Wallester, por los precios públicos y la marca blanca, para un piloto barato — [Wallester fintech](https://wallester.com/card-solutions/fintech-companies)
   - Pecunpay, como EDE española con interlocución local y Banco de España — [Minsait/Pecunpay](https://www.indracompany.com/sites/default/files/231114_np_minsait_payments_pecunpay.pdf)
   - Treezor o Paynetics como alternativa — [Treezor](https://www.treezor.com/services/payment-issuing-solutions/); [Paynetics](https://www.paynetics.digital/program-managers/)
2. **Asesoría legal o regulatoria fintech en España** para confirmar la figura de agente o distribuidor ante el Banco de España y las obligaciones AML (Ley 10/2010) antes de firmar.
3. **Programas de aceleración o de esquemas** (Visa, Mastercard Start Path, BBVA, Santander), solo si el piloto valida demanda. Estos programas suelen pedir tracción.
4. **Fondos semilla** (K Fund, Kibo, Samaipata, Seaya) cuando haya métricas del piloto (usuarios activos y gasto por tarjeta).
- El modelo Curve no debería ser la primera ruta: Curve, con unos 9 años de trayectoria y cientos de millones invertidos, acabó vendiéndose por debajo de su valoración, en un mercado con interchange limitado por el IFR.

### Huecos
- No hay datos públicos de plazos reales de alta comercial con cada BaaS para un program manager español nuevo.
