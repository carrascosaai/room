// Igual que app.json, pero permite publicar la web en una subcarpeta
// (p. ej. EXPO_PUBLIC_BASE_PATH=/taimo para servirla dentro de Room).
module.exports = ({ config }) => {
  const base = process.env.EXPO_PUBLIC_BASE_PATH;
  return base ? { ...config, experiments: { ...config.experiments, baseUrl: base } } : config;
};
