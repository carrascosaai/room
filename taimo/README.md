# Taimo

Pagas con el móvil y Taimo lo apunta solo. Te dice cuánto te queda en cada categoría y reparte los gastos con tu
pareja o tu piso. Sin conectar el banco, con los datos en tu móvil.

App para iPhone y Android hecha con [Expo](https://expo.dev) (React Native + TypeScript, Expo Router).

## Qué hace esta primera versión

- **Bienvenida y presupuestos**: nombre y límite mensual por categoría (supermercado, comer fuera, ocio, deporte…).
- **Inicio**: lo que te queda este mes, **cuánto puedes gastar al día** hasta fin de mes, barras por categoría y
  últimos gastos.
- **Registro automático con Apple Pay**: un Atajo de iOS (disparador «Transacción» de Wallet) abre
  `taimo://capture?amount=…&merchant=…&card=…`. Taimo apunta el gasto, adivina la categoría por el comercio, evita
  duplicados y te dice cuánto te queda. Guía paso a paso dentro de la app (Ajustes → Registro automático).
- **Añadir gasto a mano** en dos toques, con categoría sugerida. Si corriges la categoría de un comercio, Taimo lo
  recuerda para la próxima vez.
- **Grupos (pareja, piso, viaje)**: gasto compartido con quién pagó y entre quién se reparte. **A tu presupuesto solo
  cuenta tu parte**, aunque hayas pagado tú todo. Calcula quién debe a quién y cómo quedar en paz.
- **Estadísticas**: total del mes, gasto por día, por categoría y últimos 6 meses.
- **Privacidad**: todo se guarda en el móvil (AsyncStorage). No hay servidor todavía.

## Cómo probarla

```bash
npm install
npm start          # abre Expo; escanea el QR con la app Expo Go en el móvil
npm run web        # o pruébala en el navegador
npm test           # pruebas de la lógica (presupuestos, repartos, capturas)
npm run typecheck
```

Para simular un pago con Apple Pay en el navegador: abre
`http://localhost:8081/capture?amount=12,50&merchant=Mercadona`.

## Estructura

```
src/
  app/            pantallas (Expo Router: cada archivo es una ruta)
    (tabs)/       Inicio, Grupos, Estadísticas, Ajustes
    add.tsx       añadir / editar gasto
    capture.tsx   destino del Atajo de Apple Pay
    automation.tsx guía para activar el registro automático
    group/[id].tsx detalle de un grupo
  domain/         lógica pura y probada: dinero, categorías, presupuestos, grupos, capturas
  store/          estado de la app y guardado en el móvil
  ui/             tema (colores del Figma) y componentes
tests/            pruebas con Vitest
```

## Pendiente (siguientes pasos)

1. **Probar el Atajo en un iPhone real** con tarjetas españolas: nombres exactos de las variables, si hace falta
   «Codificar URL» para comercios con espacios, y si se dispara dos veces.
2. **App Intent nativo** para que el Atajo apunte el gasto sin abrir Taimo (ahora abre la app un momento).
3. **Grupos sincronizados**: invitar por enlace y que cada miembro vea el grupo en su móvil (Supabase, plan gratuito).
4. **Android**: lector de notificaciones de Google Wallet y del banco (requiere módulo nativo y declaración en
   Google Play).
5. Notificación local después de cada compra, exportar/importar CSV, iconos y pantalla de carga con la marca.
