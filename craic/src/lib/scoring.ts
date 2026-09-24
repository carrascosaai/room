// Comparación palabra a palabra entre la frase objetivo y lo que se entendió.
// Sirve para la práctica de pronunciación («dilo tú»).

const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, "can not"],
  [/\bwon't\b/g, "will not"],
  [/\bshan't\b/g, "shall not"],
  [/\bcannot\b/g, "can not"],
  [/n't\b/g, " not"],
  [/\bi'm\b/g, "i am"],
  [/'re\b/g, " are"],
  [/'ve\b/g, " have"],
  [/'ll\b/g, " will"],
  [/'d\b/g, " would"],
  [/\b(it|that|there|what|he|she|where|who|here)'s\b/g, "$1 is"],
  [/\blet's\b/g, "let us"],
  [/\bgonna\b/g, "going to"],
  [/\bwanna\b/g, "want to"],
];

const NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

export function tokenize(text: string): string[] {
  let t = (text ?? "").toLowerCase().replace(/[’‘`]/g, "'");
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  return t
    // Acentos fuera (é → e), así «été» y «ete» cuentan igual.
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Elisiones del francés: «j'ai» → «j ai», «qu'il» → «qu il».
    .replace(/\b(qu|[a-z])'/g, "$1 ")
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, "").replace(/'s$/, ""))
    .map((w) => (/^\d+$/.test(w) && Number(w) < NUMBERS.length ? NUMBERS[Number(w)] : w))
    .filter(Boolean);
}

export interface WordResult {
  word: string;
  ok: boolean;
}

export interface SpeechScore {
  words: WordResult[];
  /** 0..100 */
  score: number;
  /** Palabras que dijiste de más (no estaban en la frase) */
  extra: string[];
}

/** Alineación por subsecuencia común más larga (LCS). */
export function scoreSpeech(target: string, heard: string): SpeechScore {
  const a = tokenize(target);
  const b = tokenize(heard);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const words: WordResult[] = [];
  const extra: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      words.push({ word: a[i], ok: true });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      words.push({ word: a[i], ok: false });
      i++;
    } else {
      extra.push(b[j]);
      j++;
    }
  }
  while (i < a.length) words.push({ word: a[i++], ok: false });
  while (j < b.length) extra.push(b[j++]);
  const hits = words.filter((w) => w.ok).length;
  // Penaliza un poco las palabras de más
  const score = a.length ? Math.round((100 * hits) / (a.length + extra.length * 0.5)) : 0;
  return { words, score: Math.max(0, Math.min(100, score)), extra };
}

export function scoreLabel(score: number): string {
  if (score >= 95) return "¡Perfecto!";
  if (score >= 80) return "¡Muy bien!";
  if (score >= 60) return "Casi. Prueba otra vez.";
  return "Escúchalo y repite despacio.";
}
