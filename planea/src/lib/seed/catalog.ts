/**
 * ─────────────────────────────────────────────────────────────
 *  DATOS DEMO — ficticios.
 *  Ningún local, evento, persona ni opinión de este archivo es real.
 *  Todo lo marcado con isDemo=true se sustituye por datos reales
 *  cargándolos en Supabase (ver README → "Datos reales").
 * ─────────────────────────────────────────────────────────────
 */
import type { CategorySlug, OpeningHours, Vibe } from "../types";

export const HOURS = {
  disco: { 4: ["00:30", "06:30"], 5: ["00:30", "06:30"], 6: ["00:30", "07:00"] },
  discoUni: { 3: ["00:00", "06:00"], 4: ["00:00", "06:00"], 5: ["00:30", "06:30"], 6: ["00:30", "07:00"] },
  copas: { 0: ["17:00", "01:30"], 3: ["18:00", "02:00"], 4: ["18:00", "02:30"], 5: ["17:00", "03:30"], 6: ["16:00", "03:30"] },
  terraza: { 0: ["16:00", "01:00"], 1: ["17:00", "00:30"], 2: ["17:00", "00:30"], 3: ["17:00", "01:30"], 4: ["17:00", "02:00"], 5: ["16:00", "03:00"], 6: ["13:00", "03:00"] },
  pub: { 0: ["18:00", "01:30"], 1: ["19:00", "01:30"], 2: ["19:00", "01:30"], 3: ["19:00", "02:30"], 4: ["19:00", "03:00"], 5: ["18:00", "03:30"], 6: ["17:00", "03:30"] },
  sala: { 3: ["21:00", "02:00"], 4: ["21:00", "03:00"], 5: ["21:00", "04:00"], 6: ["20:30", "04:00"] },
  cena: { 0: ["13:30", "23:30"], 2: ["20:00", "00:00"], 3: ["20:00", "00:00"], 4: ["20:00", "00:30"], 5: ["20:00", "01:00"], 6: ["13:30", "01:00"] },
} satisfies Record<string, OpeningHours>;

export type HoursPreset = keyof typeof HOURS;

export interface VenueSpec {
  name: string;
  category: CategorySlug;
  hood: string;
  /** Desplazamiento aproximado respecto al centro de la ciudad (ficticio). */
  d: [number, number];
  price: [level: number, from: number];
  age: [number, number];
  music: string[];
  vibe: Vibe;
  hours: HoursPreset;
  tags: string[];
  /** Interés base de la demo (personas interesadas acumuladas). */
  heat: number;
  rating: number;
}

const V = (
  name: string,
  category: CategorySlug,
  hood: string,
  d: [number, number],
  price: [number, number],
  age: [number, number],
  music: string[],
  vibe: Vibe,
  hours: HoursPreset,
  tags: string[],
  heat: number,
  rating: number,
): VenueSpec => ({ name, category, hood, d, price, age, music, vibe, hours, tags, heat, rating });

export const VENUES_BY_CITY: Record<string, VenueSpec[]> = {
  cordoba: [
    V("Sala Órbita", "discotecas", "Vial Norte", [0.006, -0.004], [3, 12], [18, 25], ["Reggaeton", "Comercial", "EDM"], "fiesta", "disco", ["Pista grande", "Reservados"], 247, 4.2),
    V("La Coctelera del Patio", "copas", "Centro", [-0.002, 0.003], [2, 7], [20, 30], ["Pop", "Indie"], "tranquilo", "copas", ["Patio cordobés", "Cócteles"], 128, 4.6),
    V("Azotea Mezquita", "copas", "Judería", [-0.005, 0.001], [3, 9], [22, 35], ["Chill", "House"], "tranquilo", "terraza", ["Terraza", "Vistas"], 164, 4.5),
    V("Pub El Faro", "pubs", "Ciudad Jardín", [-0.001, -0.009], [1, 4], [18, 24], ["Rock", "Pop español"], "fiesta", "pub", ["Futbolín", "Barato"], 96, 4.0),
    V("Teatro Neón", "conciertos", "Centro", [0.002, 0.001], [2, 10], [18, 35], ["Indie", "Rock", "Electrónica"], "fiesta", "sala", ["Directo", "Aforo 600"], 89, 4.4),
    V("Kiosko Universitario", "discotecas", "Rabanales", [0.012, 0.02], [1, 5], [18, 23], ["Reggaeton", "Trap", "Remember"], "fiesta", "discoUni", ["Fiestas uni", "Barra libre"], 132, 3.7),
    V("Taberna La Corredera", "restaurantes", "La Corredera", [0.0, 0.006], [2, 15], [20, 40], [], "tranquilo", "cena", ["Tapas", "Salmorejo"], 74, 4.7),
    V("Bodega Nocturna", "pubs", "San Lorenzo", [0.006, 0.007], [2, 5], [21, 32], ["Flamenco fusión", "Rumba"], "fiesta", "pub", ["Rumba en vivo"], 81, 4.3),
  ],
  sevilla: [
    V("Sala Giralda Club", "discotecas", "Nervión", [0.0, 0.02], [3, 15], [18, 26], ["Reggaeton", "Comercial"], "fiesta", "disco", ["Pista grande", "Photocall"], 312, 4.1),
    V("Terraza Guadalquivir", "copas", "Triana", [-0.003, -0.008], [3, 9], [22, 35], ["House", "Chill"], "tranquilo", "terraza", ["Terraza", "Vistas al río"], 205, 4.5),
    V("La Alameda Social", "pubs", "Alameda", [0.012, 0.001], [1, 4], [19, 30], ["Indie", "Pop", "Funk"], "fiesta", "pub", ["Ambiente alternativo"], 176, 4.4),
    V("Cocteleria Azahar", "copas", "Centro", [0.003, 0.004], [3, 10], [24, 38], ["Jazz", "Soul"], "tranquilo", "copas", ["Coctelería de autor"], 98, 4.8),
    V("Sala Cartuja Live", "conciertos", "La Cartuja", [0.02, -0.006], [2, 12], [18, 35], ["Indie", "Rock", "Urbano"], "fiesta", "sala", ["Directo", "Aforo 1.200"], 154, 4.3),
    V("Fábrica de Tapas", "restaurantes", "Los Remedios", [-0.012, -0.004], [2, 18], [20, 45], [], "tranquilo", "cena", ["Tapas", "Terraza"], 87, 4.6),
    V("Club Reina Mercedes", "discotecas", "Reina Mercedes", [-0.018, 0.006], [1, 6], [18, 23], ["Reggaeton", "Trap"], "fiesta", "discoUni", ["Fiestas uni"], 188, 3.8),
    V("Bar La Rumbera", "pubs", "Triana", [-0.002, -0.011], [1, 3], [20, 35], ["Rumba", "Sevillanas"], "fiesta", "pub", ["Rumba en vivo", "Barato"], 143, 4.5),
  ],
  malaga: [
    V("Sala Malagueta", "discotecas", "La Malagueta", [-0.002, 0.012], [3, 15], [19, 28], ["House", "Techno", "Comercial"], "fiesta", "disco", ["Pista grande"], 266, 4.2),
    V("Rooftop Atarazanas", "copas", "Centro Histórico", [0.001, -0.002], [3, 11], [23, 38], ["Chill", "Deep house"], "tranquilo", "terraza", ["Terraza", "Vistas"], 211, 4.6),
    V("Soho Club Social", "pubs", "Soho", [-0.004, -0.004], [1, 4], [19, 30], ["Indie", "Electrónica"], "fiesta", "pub", ["Arte urbano"], 133, 4.3),
    V("Chiringuito Pedregalejo", "copas", "Pedregalejo", [0.0, 0.04], [2, 6], [20, 40], ["Pop", "Reggae"], "tranquilo", "terraza", ["Playa", "Atardecer"], 182, 4.4),
    V("Teatro Sur Live", "conciertos", "Centro", [0.004, 0.0], [2, 12], [18, 40], ["Indie", "Flamenco", "Jazz"], "fiesta", "sala", ["Directo"], 101, 4.5),
    V("Club Teatinos", "discotecas", "Teatinos", [0.015, -0.04], [1, 6], [18, 23], ["Reggaeton", "Remember"], "fiesta", "discoUni", ["Fiestas uni"], 156, 3.6),
    V("El Espeto Dorado", "restaurantes", "El Palo", [-0.002, 0.05], [2, 16], [20, 50], [], "tranquilo", "cena", ["Pescaíto", "Terraza"], 78, 4.7),
  ],
  granada: [
    V("Sala Alhambra Club", "discotecas", "Centro", [0.0, 0.002], [2, 10], [18, 25], ["Reggaeton", "Comercial"], "fiesta", "disco", ["Pista grande"], 221, 4.0),
    V("Pub Pedro Antonio", "pubs", "Pedro Antonio", [-0.007, -0.006], [1, 3], [18, 24], ["Pop español", "Reggaeton"], "fiesta", "pub", ["Chupitos", "Barato"], 198, 3.9),
    V("Mirador del Realejo", "copas", "Realejo", [-0.003, 0.006], [2, 7], [21, 35], ["Indie", "Chill"], "tranquilo", "terraza", ["Terraza", "Vistas a la Alhambra"], 143, 4.7),
    V("La Tetería Nocturna", "copas", "Albaicín", [0.004, 0.003], [1, 4], [19, 32], ["Chill", "Flamenco"], "tranquilo", "copas", ["Teterías", "Cachimbas"], 87, 4.4),
    V("Sala Elvira Live", "conciertos", "Elvira", [0.002, -0.001], [2, 8], [18, 30], ["Rock", "Indie", "Punk"], "fiesta", "sala", ["Directo"], 112, 4.4),
    V("Club Fuentenueva", "discotecas", "Fuentenueva", [0.003, -0.012], [1, 5], [18, 23], ["Trap", "Reggaeton", "Remember"], "fiesta", "discoUni", ["Fiestas uni", "Erasmus"], 176, 3.8),
    V("Tapas El Ventanal", "restaurantes", "Navas", [-0.002, 0.0], [1, 3], [18, 40], [], "tranquilo", "cena", ["Tapa gratis con la caña"], 134, 4.6),
  ],
  madrid: [
    V("Sala Órbita Madrid", "discotecas", "Gran Vía", [0.003, -0.002], [3, 18], [20, 30], ["Techno", "House"], "fiesta", "disco", ["Sonido top", "Cola larga"], 402, 4.3),
    V("Malasaña Social Club", "pubs", "Malasaña", [0.009, -0.0], [2, 5], [20, 32], ["Indie", "Brit pop", "Funk"], "fiesta", "pub", ["Ambiente alternativo"], 287, 4.5),
    V("Azotea Callao", "copas", "Sol", [0.004, -0.003], [3, 12], [24, 40], ["Deep house", "Chill"], "tranquilo", "terraza", ["Terraza", "Vistas"], 256, 4.4),
    V("Cocteleria Chueca 8", "copas", "Chueca", [0.006, 0.003], [3, 11], [23, 38], ["Pop", "Disco"], "fiesta", "copas", ["Cócteles", "LGTBIQ+ friendly"], 211, 4.6),
    V("Sala Lavapiés Live", "conciertos", "Lavapiés", [-0.008, 0.001], [2, 10], [18, 35], ["Indie", "Hip hop", "Electrónica"], "fiesta", "sala", ["Directo"], 176, 4.4),
    V("Club Moncloa", "discotecas", "Moncloa", [0.018, -0.016], [1, 8], [18, 23], ["Reggaeton", "Comercial", "Remember"], "fiesta", "discoUni", ["Fiestas uni"], 334, 3.7),
    V("Taberna La Latina", "restaurantes", "La Latina", [-0.006, -0.004], [2, 20], [22, 45], [], "tranquilo", "cena", ["Vermut", "Tapas"], 143, 4.6),
    V("El Garaje de Huertas", "pubs", "Huertas", [-0.002, 0.002], [1, 4], [19, 28], ["Rock", "Pop español"], "fiesta", "pub", ["Futbolín", "Barato"], 198, 4.1),
  ],
  barcelona: [
    V("Sala Mar Bella", "discotecas", "Poblenou", [0.005, 0.03], [3, 18], [20, 30], ["Techno", "House"], "fiesta", "disco", ["Sonido top"], 365, 4.3),
    V("Born Cocktail Lab", "copas", "El Born", [-0.002, 0.012], [3, 12], [24, 38], ["Jazz", "Soul"], "tranquilo", "copas", ["Coctelería de autor"], 234, 4.7),
    V("Gràcia Vermuteria", "pubs", "Gràcia", [0.015, -0.006], [1, 4], [20, 35], ["Indie", "Rumba catalana"], "tranquilo", "pub", ["Plaza", "Vermut"], 198, 4.5),
    V("Terrat Eixample", "copas", "Eixample", [0.006, -0.001], [3, 12], [24, 40], ["Deep house", "Chill"], "tranquilo", "terraza", ["Terraza", "Vistas"], 222, 4.4),
    V("Sala Raval Live", "conciertos", "Raval", [-0.006, 0.0], [2, 10], [18, 35], ["Indie", "Electrónica", "Rock"], "fiesta", "sala", ["Directo"], 187, 4.4),
    V("Club Diagonal Uni", "discotecas", "Les Corts", [0.0, -0.04], [1, 8], [18, 23], ["Reggaeton", "Comercial"], "fiesta", "discoUni", ["Fiestas uni", "Erasmus"], 276, 3.8),
    V("Barceloneta Tapes", "restaurantes", "Barceloneta", [-0.008, 0.02], [2, 20], [20, 45], [], "tranquilo", "cena", ["Tapas", "Playa"], 156, 4.5),
  ],
  valencia: [
    V("Sala Turia", "discotecas", "Cánovas", [-0.004, 0.006], [3, 15], [19, 28], ["Reggaeton", "Comercial", "House"], "fiesta", "disco", ["Pista grande"], 254, 4.1),
    V("Ruzafa Social", "pubs", "Ruzafa", [-0.009, 0.001], [1, 4], [20, 32], ["Indie", "Funk", "Disco"], "fiesta", "pub", ["Ambiente alternativo"], 213, 4.5),
    V("El Carmen Cocktails", "copas", "El Carmen", [0.006, -0.004], [2, 8], [22, 36], ["Pop", "Soul"], "tranquilo", "copas", ["Cócteles", "Terraza"], 165, 4.6),
    V("Terraza Malvarrosa", "copas", "Malvarrosa", [0.0, 0.05], [2, 7], [20, 40], ["Reggae", "Chill"], "tranquilo", "terraza", ["Playa", "Atardecer"], 176, 4.3),
    V("Sala Benimaclet Live", "conciertos", "Benimaclet", [0.014, 0.012], [1, 8], [18, 32], ["Indie", "Punk", "Rap"], "fiesta", "sala", ["Directo", "Ambiente uni"], 121, 4.4),
    V("Club Blasco Ibáñez", "discotecas", "Blasco Ibáñez", [0.009, 0.017], [1, 6], [18, 23], ["Reggaeton", "Remember"], "fiesta", "discoUni", ["Fiestas uni"], 199, 3.7),
    V("Arrocería Nocturna", "restaurantes", "Ruzafa", [-0.01, 0.003], [2, 18], [20, 50], [], "tranquilo", "cena", ["Paella de noche"], 96, 4.6),
  ],
  salamanca: [
    V("Sala Plaza Mayor", "discotecas", "Plaza Mayor", [0.001, 0.001], [2, 10], [18, 25], ["Reggaeton", "Comercial"], "fiesta", "disco", ["Pista grande"], 231, 4.0),
    V("Pub Van Dyck", "pubs", "Van Dyck", [0.008, 0.004], [1, 3], [18, 25], ["Pop español", "Remember"], "fiesta", "pub", ["Chupitos", "Barato"], 187, 4.1),
    V("Coctelería Gran Vía", "copas", "Gran Vía", [-0.001, 0.003], [2, 7], [21, 32], ["Pop", "Indie"], "tranquilo", "copas", ["Cócteles"], 121, 4.5),
    V("Club Universidad", "discotecas", "Bordadores", [-0.002, -0.003], [1, 5], [18, 23], ["Reggaeton", "Trap", "Remember"], "fiesta", "discoUni", ["Fiestas uni", "Erasmus"], 278, 3.9),
    V("La Bodega del Tormes", "pubs", "Barrio del Oeste", [-0.006, -0.004], [1, 3], [20, 35], ["Rock", "Rumba"], "tranquilo", "pub", ["Tapas", "Rock"], 98, 4.4),
    V("Sala Clavel Live", "conciertos", "Centro", [0.003, -0.001], [1, 8], [18, 30], ["Indie", "Rock"], "fiesta", "sala", ["Directo"], 87, 4.3),
  ],
  alicante: [
    V("Sala Postiguet", "discotecas", "Puerto", [-0.002, 0.004], [3, 12], [19, 28], ["Comercial", "House"], "fiesta", "disco", ["Junto al mar"], 176, 4.0),
    V("El Barrio Social", "pubs", "El Barrio", [0.002, 0.002], [1, 4], [19, 30], ["Pop", "Indie"], "fiesta", "pub", ["Casco antiguo"], 143, 4.3),
    V("Terraza Explanada", "copas", "Explanada", [-0.001, 0.0], [2, 8], [22, 40], ["Chill"], "tranquilo", "terraza", ["Terraza", "Paseo marítimo"], 112, 4.4),
    V("Sala Benacantil Live", "conciertos", "Centro", [0.003, -0.002], [2, 10], [18, 35], ["Indie", "Rock"], "fiesta", "sala", ["Directo"], 76, 4.3),
  ],
  cadiz: [
    V("Sala Punta San Felipe", "discotecas", "Punta San Felipe", [0.007, 0.003], [2, 10], [18, 28], ["Reggaeton", "Comercial"], "fiesta", "disco", ["Junto al mar"], 154, 4.0),
    V("Bar La Viña Chica", "pubs", "La Viña", [-0.002, -0.006], [1, 3], [20, 40], ["Rumba", "Carnaval"], "fiesta", "pub", ["Ambiente carnavalero"], 132, 4.6),
    V("Terraza La Caleta", "copas", "La Caleta", [-0.001, -0.009], [2, 7], [20, 40], ["Chill", "Reggae"], "tranquilo", "terraza", ["Atardecer", "Playa"], 121, 4.5),
    V("Freiduría Nocturna", "restaurantes", "Mercado", [0.001, -0.002], [1, 10], [18, 50], [], "tranquilo", "cena", ["Pescaíto"], 88, 4.7),
  ],
  marbella: [
    V("Club Puerto Banús Nights", "discotecas", "Puerto Banús", [-0.002, -0.06], [4, 25], [21, 35], ["House", "Comercial"], "fiesta", "disco", ["Reservados", "Dress code"], 210, 4.1),
    V("Beach Club Las Dunas", "copas", "Milla de Oro", [-0.004, -0.03], [4, 15], [23, 40], ["Deep house", "Chill"], "tranquilo", "terraza", ["Playa", "Atardecer"], 176, 4.4),
    V("Casco Antiguo Pub", "pubs", "Casco Antiguo", [0.001, 0.0], [2, 5], [20, 35], ["Pop", "Rock"], "fiesta", "pub", ["Plaza de los Naranjos"], 98, 4.2),
    V("Taberna del Puerto", "restaurantes", "Puerto Deportivo", [-0.003, 0.002], [3, 25], [22, 50], [], "tranquilo", "cena", ["Pescado", "Terraza"], 67, 4.5),
  ],
};

/** Bandas, DJs y fiestas ficticias para los eventos demo. */
export const DEMO_ARTISTS = [
  "Los Satélites", "Marea Baja", "Neón Sur", "Carmesí", "Las Bicicletas", "Fuego Lento", "Telégrafo",
  "Mala Racha", "Tormenta Seca", "Las Persianas", "Club Perdido", "Lunes Eterno", "Brisa Norte", "Polaroid 98",
];
export const DEMO_DJS = ["DJ Nébula", "DJ Kairos", "DJ Lúa", "DJ Marte", "DJ Coral", "DJ Vértigo", "DJ Saeta", "DJ Kiwi"];
export const UNI_THEMES = ["Fiesta de la Toga", "Noche Erasmus", "Fin de Exámenes", "Fiesta Neón Uni", "Paso del Ecuador", "Fiesta de Novatos"];
export const FESTIVAL_NAMES = ["Festival Luz de Otoño", "Festival Ribera Sound", "Mercado Nocturno & Música", "Festival Calle Viva"];

/** Perfiles ficticios usados como autores del contenido demo. */
export const DEMO_PEOPLE: { name: string; emoji: string }[] = [
  { name: "Lucía M.", emoji: "🦋" }, { name: "Dani R.", emoji: "🎧" }, { name: "Marta G.", emoji: "🌻" },
  { name: "Álex P.", emoji: "🛹" }, { name: "Irene S.", emoji: "🍓" }, { name: "Pablo T.", emoji: "🎸" },
  { name: "Carmen L.", emoji: "💃" }, { name: "Hugo F.", emoji: "🐙" }, { name: "Sara V.", emoji: "🌙" },
  { name: "Javi N.", emoji: "🏄" }, { name: "Noa B.", emoji: "🪐" }, { name: "Raúl C.", emoji: "🦊" },
  { name: "Paula D.", emoji: "🌶️" }, { name: "Mario E.", emoji: "🎲" }, { name: "Elena K.", emoji: "🍋" },
  { name: "Adri O.", emoji: "🐢" },
];
