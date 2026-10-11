# Plan de experimentos de captación (30 días)

Objetivo: **conseguir los primeros usuarios reales que obtienen valor**, no visitas. Presupuesto total: **≤300 €** (dentro de los <1.000 €). Un solo fundador. Sin código: landing con una herramienta sin código o la plantilla `../validation/landing.html`, formulario, hoja de ofertas y newsletter.

## 1. Propuesta de valor (una frase y tres pruebas)

> **"Cada semana, prácticas y graduate programs reales de ingeniería en empresas industriales de España y Europa, con lo que piden de verdad: si es solo para prácticas obligatorias, idioma, fechas y enlace oficial."**

- Solo ofertas reales con enlace oficial y fecha "vista activa".
- Requisitos publicados con ✅/❌/❔. Nunca "eres elegible".
- Guía en español de *Pflichtpraktikum* y convenios para estudiantes españoles.

Variante B (para probar en la semana 2): **"Que no se te pase el plazo: calendario de convocatorias de prácticas y graduate programs industriales en Europa."**

## 2. Landing

Partir de `../validation/landing.html` y adaptarla:
- Titular: la propuesta de valor.
- 3 bloques: ofertas reales verificadas; requisitos ✅/❌/❔; calendario.
- Un ejemplo real de `../phase2_market/data/offers.csv`, con la fecha de consulta.
- CTA "Recibir el próximo envío" → formulario de `../phase2_customers/04_formulario_registro.md`.
- Aviso: "piloto; no enviamos candidaturas; no cobramos".

Sin cifras no medidas.

## 3. Lista inicial de usuarios potenciales

Ver [lista_inicial.csv](lista_inicial.csv): **organizaciones y roles públicos** (asociaciones, delegaciones, COIE/ORI, coordinadores de prácticas). No contiene datos personales.

El objetivo es pedir **permiso de difusión**, no extraer correos.

## 4. Sistema de registro y medición

| Elemento | Herramienta (gratis) | Qué registra |
|---|---|---|
| Enlaces con UTM | Un enlace por canal y mensaje (`?utm_source=aerraaiti&utm_campaign=s1`) | Visitas por canal |
| Analítica sin cookies | Cloudflare Web Analytics u otra equivalente | Visitas, origen |
| Formulario | Tally / Google Forms | Registro + "¿cómo nos conociste?" (control de UTM) |
| Newsletter | Plataforma con capa gratuita | Aperturas y clics por enlace de oferta |
| Encuesta de 1 pregunta en cada envío | Enlaces "Sí, encontré algo relevante" / "No" | **Usuarios que encuentran una oferta relevante** |
| Hoja de métricas | [panel_metricas.csv](panel_metricas.csv) | Embudo semanal por canal |

## 5. Definiciones de métricas (embudo)

| Métrica | Definición | Qué distingue |
|---|---|---|
| Visitas | Sesiones en la landing por canal | Atención, no interés |
| Registros | Formulario completo con consentimiento y titulación de ingeniería | Interés declarado |
| Activación | Registrado que **abre el primer envío y hace clic en ≥1 oferta** | Primer uso |
| Valor real | Usuario que responde "Sí, encontré algo relevante" **o** dice haber solicitado una oferta del envío | **Usuario que obtiene valor** |
| Retorno semanal | Usuarios activados que abren ≥2 de los últimos 3 envíos y hacen clic en ≥1 | Uso repetido |
| Recomendaciones | Registros con "me lo pasó un amigo" + referidos explícitos | Boca a boca |
| Coste por usuario con valor | Gasto del canal ÷ usuarios con valor real del canal | Comparación entre canales |

**Cómo comprobar que vuelven:**
- La newsletter semanal es el "producto".
- El retorno se mide por **clics en ofertas de envíos sucesivos**, no por aperturas: las aperturas están infladas por la privacidad del correo.
- En la semana 4, mini-encuesta: "¿Qué hiciste con las ofertas?" (solicité / guardé / nada).

## 6. Experimentos semanales

| Semana | Experimento | Canales | Hipótesis (umbral para seguir) | Presupuesto máx. |
|---|---|---|---|---|
| 1 | **E1. Red cercana + entrevistas** | 10a (referidos), 2 (2–3 grupos donde el fundador ya está) | ≥30 registros de ingeniería; ≥10 entrevistas agendadas (phase2_customers) | 0 € |
| 1–2 | **E2. Asociaciones** | 1 (AERRAAITI, IAESTE local, ESN, BEST si existe) | ≥2 asociaciones aceptan difundir; ≥40 registros atribuibles | 0 € |
| 2 | **E3. Mensaje A vs B** | Mismo canal y mismo día, dos enlaces | La variante ganadora tiene ≥1,5× la tasa de registro | 0 € |
| 2–3 | **E4. Delegaciones y embajadores** | 2 + 8 (3 embajadores en 3 escuelas) | ≥15 registros por embajador | ≤90 € (vales de 30 €) |
| 2–4 | **E5. COIE/ORI y profesores** | 3 | ≥1 servicio difunde el recurso por un canal permitido | 0 € |
| 3 | **E6. Contenido orgánico** | 4 + 5: 3 publicaciones de LinkedIn y 3 vídeos cortos ("qué es un Pflichtpraktikum", "3 convocatorias que abren este mes") | ≥20 registros atribuibles en total | 0 € |
| 3–4 | **E7. Anuncio pequeño** (solo si se cumple la condición de la sección 8) | 4b o 5b: 1 campaña de 5–7 días | Coste por usuario con valor ≤ 5 € | ≤150 € |
| 4 | **E8. Página SEO** | 7: "Prácticas de ingeniería en Alemania desde España: Pflichtpraktikum, convenio y convocatorias" | Indexada; impresiones en Search Console (sin objetivo de registros a 30 días) | 0 € |
| 2–4 | **E9. Empresas (para el modelo B/D)** | 10b: 30 pymes (ver `../phase2_business_model/experimentos_pago.md`, X2) | ≥3 pilotos gratuitos aceptados | 0 € |

## 7. Presupuesto

Ver [presupuesto.csv](presupuesto.csv): máximo 300 €.
- Obligatorio: 20 €.
- Opcional: 280 €.
- Recurrente: 0–2 €/mes.

## 8. Cuándo probar anuncios (E7)

Solo si se cumplen todas estas condiciones:
1. La landing convierte ≥10 % de las visitas cualificadas (canales orgánicos).
2. ≥30 % de los activados obtiene valor real en el primer envío.
3. Hay ≥40 ofertas relevantes verificadas para enviar (`../phase2_technical`).

Si no, el anuncio solo compraría visitas.

## 9. Criterios para detener canales

Ver [criterios_parada.md](criterios_parada.md).
