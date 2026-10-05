// Convierte data/research.txt en filas para la cola de geocodificación (planea_geo).
import { readFileSync, writeFileSync } from "node:fs";
const cities = JSON.parse(readFileSync(new URL("../data/curated-cities.json", import.meta.url)));
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const geoName = (c) => cities[c][0].replace(/ \(.*\)$/, "");
const rows = [];
const seen = new Set();
for (const line of readFileSync(new URL("../data/research.txt", import.meta.url), "utf8").split("\n")) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [city, type, name, zone, note] = line.split(";");
  if (!cities[city]) throw new Error("ciudad sin datos: " + city);
  const id = `cur:${city}:${type === "zona" ? "zona-" : ""}${slug(name)}`;
  if (seen.has(id)) continue;
  seen.add(id);
  const where = geoName(city);
  const q = type === "zona" ? `${zone || name}, ${where}` : `${name}, ${where}`;
  rows.push({ id, q, fallback: zone ? `${zone}, ${where}` : null, city, type, name, zone, note });
}
for (const c of Object.keys(cities)) rows.push({ id: `city:${c}`, q: `${geoName(c)}, España` });
writeFileSync(new URL("../data/curated.json", import.meta.url), JSON.stringify(rows.filter((r) => r.type), null, 1));
const esc = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const sql = "insert into public.planea_geo (id, mode, q) values\n" + rows.map((r) => `(${esc(r.id)}, 'search', ${esc(r.q)})`).join(",\n") + "\non conflict (id) do update set q = excluded.q, done = false, tries = 0;";
writeFileSync(new URL("../data/curated-geo.sql", import.meta.url), sql);
console.log(rows.length, "filas");
