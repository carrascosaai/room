const UJ = `<rect width="60" height="60" fill="#012169"/><path d="M0 0l60 60M60 0L0 60" stroke="#fff" stroke-width="12"/><path d="M0 0l60 60M60 0L0 60" stroke="#c8102e" stroke-width="4"/><path d="M30 0v60M0 30h60" stroke="#fff" stroke-width="18"/><path d="M30 0v60M0 30h60" stroke="#c8102e" stroke-width="10"/>`;
const star = (x, y, r, f) => { let p = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * .45 : r; p.push((x + rr * Math.cos(a)).toFixed(1) + "," + (y + rr * Math.sin(a)).toFixed(1)); } return `<polygon points="${p.join(" ")}" fill="${f}"/>`; };
window.FLAGS = {
  ie: `<rect width="20" height="60" fill="#169b62"/><rect x="20" width="20" height="60" fill="#fff"/><rect x="40" width="20" height="60" fill="#ff883e"/>`,
  gb: UJ,
  eng: `<rect width="60" height="60" fill="#fff"/><path d="M30 0v60M0 30h60" stroke="#ce1124" stroke-width="12"/>`,
  sco: `<rect width="60" height="60" fill="#005eb8"/><path d="M0 0l60 60M60 0L0 60" stroke="#fff" stroke-width="10"/>`,
  wal: `<rect width="60" height="30" fill="#fff"/><rect y="30" width="60" height="30" fill="#00b140"/><path d="M14 38c4-6 10-8 16-7l6-7 3 4 6-3-2 6 5 2-6 3c1 5-2 9-7 10l3 6-6-2-4 5-2-6c-5 0-9-3-12-7z" fill="#d30731"/>`,
  us: `<rect width="60" height="60" fill="#fff"/>${[0,2,4,6,8,10,12].map(i=>`<rect y="${i*4.62}" width="60" height="4.62" fill="#b22234"/>`).join("")}<rect width="30" height="32.3" fill="#3c3b6e"/>`,
  au: `<rect width="60" height="60" fill="#012169"/><g transform="scale(.5)">${UJ}</g>${star(15,46,6,"#fff")}${star(45,14,3,"#fff")}${star(38,28,3,"#fff")}${star(52,26,3,"#fff")}${star(45,48,3.5,"#fff")}`,
  nz: `<rect width="60" height="60" fill="#012169"/><g transform="scale(.5)">${UJ}</g>${star(45,14,3.5,"#c8102e")}${star(37,29,3.5,"#c8102e")}${star(52,27,3,"#c8102e")}${star(45,47,4,"#c8102e")}`,
  ca: `<rect width="60" height="60" fill="#fff"/><rect width="15" height="60" fill="#d52b1e"/><rect x="45" width="15" height="60" fill="#d52b1e"/><path d="M30 14l3 6 4-2-1 9 5-5 1 3 5-1-2 6 2 1-9 7 1 3-8-1v8h-2v-8l-8 1 1-3-9-7 2-1-2-6 5 1 1-3 5 5-1-9 4 2z" fill="#d52b1e"/>`,
};
window.flag = (c, s) => `<svg viewBox="0 0 60 60" width="${s}" height="${s}" style="border-radius:50%;box-shadow:0 4px 14px rgb(0 0 0/.15);background:#fff"><clipPath id="c${c}${s}"><circle cx="30" cy="30" r="30"/></clipPath><g clip-path="url(#c${c}${s})">${window.FLAGS[c]}</g></svg>`;
