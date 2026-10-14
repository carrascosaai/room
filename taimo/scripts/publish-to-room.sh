#!/usr/bin/env bash
# Exporta la web de Taimo y la deja en public/taimo de Room (Next.js), que la
# sirve en https://<dominio de Room>/taimo. Ahí se abren los enlaces de pago.
set -euo pipefail
cd "$(dirname "$0")/.."
export EXPO_PUBLIC_BASE_PATH=/taimo
npx expo export --platform web --output-dir dist-room
rm -rf ../public/taimo
mv dist-room ../public/taimo
# Textos legales (privacidad, términos) en /taimo/legal/, si ya están completos.
python3 scripts/legal-to-html.py ../public/taimo/legal
echo "Listo: public/taimo"
