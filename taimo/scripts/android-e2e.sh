#!/usr/bin/env bash
# Prueba de punta a punta en un emulador Android (la lanza GitHub Actions):
# instala el APK, da el permiso de notificaciones, abre la app, simula avisos
# de pago y comprueba que Taimo los apunta, que ignora lo que no es un pago y
# que la app no se cierra en ningún momento.
# Uso: android-e2e.sh ruta/al/taimo.apk carpeta-de-resultados
set -uo pipefail
APK="$1"
OUT="${2:-e2e-out}"
PKG=app.taimo
LISTENER="$PKG/app.taimo.capture.TaimoNotificationListener"
mkdir -p "$OUT"
fail=0
ok() { echo "✅ $1"; }
ko() { echo "::error::❌ $1"; fail=1; }

adb install -r "$APK" || { echo "::error::No se pudo instalar el APK"; exit 1; }
adb shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS 2>/dev/null || true
adb shell cmd notification allow_listener "$LISTENER" || ko "No se pudo dar el acceso a notificaciones"
adb logcat -c

# 1) La app arranca y sigue viva.
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 25
adb exec-out screencap -p > "$OUT/1-arranque.png"
if adb shell pidof "$PKG" >/dev/null; then ok "La app arranca"; else ko "La app no sigue abierta tras arrancar"; fi

# 2) El lector de avisos está conectado.
if adb shell dumpsys notification | grep -q "app.taimo.capture.TaimoNotificationListener"; then
  ok "El lector de avisos está activo"
else
  ko "El lector de avisos no aparece en dumpsys notification"
fi

# adb shell junta los argumentos en una sola línea: hay que entrecomillar para el móvil.
post() { adb shell "cmd notification post -S bigtext -t '$2' '$1' '$3'" >/dev/null; }
# Avisos propios de Taimo: «⚡ 12,40 EUR logged in Taimo» (inglés en el emulador) o «apuntados en Taimo».
TAIMO_SAYS="logged in Taimo\|apuntados en Taimo"
taimo_says() { adb shell dumpsys notification --noredact | grep -c "$TAIMO_SAYS" || true; }

# 3) Un aviso de pago se apunta (Taimo publica «⚡ … apuntados/logged in Taimo»).
before=$(taimo_says)
post pago1 "BBVA" "Pago con tarjeta ****1234 de 12,40 EUR en MERCADONA"
sleep 6
after=$(taimo_says)
if [ "$after" -gt "$before" ]; then ok "Un pago con tarjeta se detecta al instante"; else ko "El pago de prueba no se ha detectado"; fi

# 4) Un SMS del banco con saldo: coge el importe del pago, no el saldo.
post pago2 "Santander" "Compra con tarjeta *5678 de 8,90 EUR en BURGER KING. Saldo disponible 1.234,56 EUR"
sleep 6
if adb shell dumpsys notification --noredact | grep -q "8,90 EUR \(logged\|apuntados\)"; then ok "Coge el importe del pago y no el saldo"; else ko "No se ha detectado el SMS del banco con saldo"; fi

# 5) Lo que no es un pago no se apunta (dinero recibido, códigos).
before=$(taimo_says)
post nopago1 "Bizum" "Has recibido 20,00 EUR de Ana"
post nopago2 "BBVA" "Tu código de verificación es 123456"
sleep 6
after=$(taimo_says)
if [ "$after" -eq "$before" ]; then ok "Ignora dinero recibido y códigos"; else ko "Ha apuntado algo que no era un pago"; fi

# 6) Al volver a la app, los pagos se convierten en gastos sin cerrarse.
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 10
adb exec-out screencap -p > "$OUT/2-con-pagos.png"
if adb shell pidof "$PKG" >/dev/null; then ok "La app sigue abierta tras recibir los pagos"; else ko "La app se ha cerrado al procesar los pagos"; fi

# 7) Ningún cierre inesperado en todo el rato.
adb logcat -d > "$OUT/logcat.txt"
if grep -E "FATAL EXCEPTION|AndroidRuntime: (FATAL|Process: $PKG)" "$OUT/logcat.txt" | grep -q .; then
  ko "La app se ha cerrado sola (ver logcat.txt)"
  grep -A30 "FATAL EXCEPTION" "$OUT/logcat.txt" | head -60
else
  ok "Sin cierres inesperados"
fi
adb shell dumpsys notification --noredact > "$OUT/notificaciones.txt"

exit $fail
