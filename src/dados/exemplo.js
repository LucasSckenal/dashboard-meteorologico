// Dados de EXEMPLO para quando a API não responde. Cada dia é sempre igual (semente pela data), com o jeito de um dia de
// primavera em São Paulo: aberto, ventoso, chuvoso ou nublado. Nada aqui foi medido.

function aleatorio(texto) {
  let s = 2166136261;
  for (const c of texto) s = Math.imul(s ^ c.charCodeAt(0), 16777619);
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TIPOS = {
  aberto: { nuvem: 0.1, min: 17, max: 31, vento: 9, dir: 45, chuva: 0 },
  ventoso: { nuvem: 0.3, min: 15, max: 27, vento: 24, dir: 190, chuva: 0 },
  chuva: { nuvem: 0.75, min: 16, max: 24, vento: 14, dir: 330, chuva: 1 },
  nublado: { nuvem: 0.6, min: 16, max: 25, vento: 11, dir: 100, chuva: 0 },
};

const um = (v) => Math.round(v * 10) / 10;

/** As 24 horas de um dia (0 a 23) no formato das medidas. */
export function diaDeExemplo(iso) {
  const r = aleatorio(iso);
  const sorteio = r();
  const tipo = TIPOS[sorteio < 0.38 ? "aberto" : sorteio < 0.62 ? "ventoso" : sorteio < 0.82 ? "chuva" : "nublado"];
  const min = tipo.min + (r() - 0.5) * 3, max = tipo.max + (r() - 0.5) * 3;
  const falha = r() < 0.5 ? Math.floor(r() * 24) : -1; // às vezes o sensor de ar perde uma hora
  const [a, m, d] = iso.split("-").map(Number);

  return Array.from({ length: 24 }, (_, h) => {
    const sol = Math.max(0, Math.sin((Math.PI * (h - 6)) / 13.5));
    const chove = tipo.chuva && h >= 13 && h <= 18;
    const nuvem = Math.min(1, tipo.nuvem + (chove ? 0.2 : 0) + (r() - 0.5) * 0.15);
    const curva = (Math.cos((2 * Math.PI * (h - 15)) / 24) + 1) / 2;
    const temp = min + (max - min) * curva ** 1.3 - (chove ? 2 : 0) + (r() - 0.5) * 0.6;
    const umid = Math.min(98, 92 - ((temp - min) / (max - min)) * 48 + (chove ? 18 : 0) + (r() - 0.5) * 4);
    const tarde = 0.55 + 0.6 * Math.max(0, Math.sin((Math.PI * (h - 8)) / 12));
    const vento = tipo.vento * tarde + (r() - 0.5) * 4;
    const radiacao = Math.max(0, 990 * sol * (1 - nuvem * 0.8) + (sol ? (r() - 0.5) * 40 : 0));
    const chuva = chove ? Math.max(0.2, 13 * Math.exp(-((h - 15.5) ** 2) / 2.5) + r()) : 0;
    const pm = 6 + 7 * Math.exp(-((h - 8) ** 2) / 5) + 6 * Math.exp(-((h - 19) ** 2) / 5) - (chove ? 4 : 0) + r() * 3;
    const ruido = 39 + 19 * Math.max(0, Math.sin((Math.PI * (h - 6)) / 17)) + r() * 5;
    const v = {
      temp: um(temp),
      umid: Math.round(umid),
      chuva: um(chuva),
      vento: Math.round(Math.max(1, vento)),
      rajada: Math.round(Math.max(2, vento * 1.6 + r() * 7)),
      direcao: Math.round((tipo.dir + (r() - 0.5) * 50 + 360) % 360),
      luz: Math.round(radiacao * 118),
      uv: um(Math.pow(sol, 1.3) * 11.5 * (1 - nuvem * 0.7)),
      radiacao: Math.round(radiacao),
      pressao: um(1013 + 1.6 * Math.sin((4 * Math.PI * h) / 24) - (tipo.chuva ? (h / 24) * 7 : 0) + (r() - 0.5)),
      temp2: um(temp + 0.4 + r() * 0.6),
      umid2: Math.round(Math.min(99, umid - 2 + r() * 3)),
      pm25: Math.round(Math.max(2, pm)),
      ruido: Math.round(ruido),
    };
    if (h === falha) { v.temp2 = v.umid2 = v.pm25 = v.ruido = null; }
    return { quando: new Date(a, m - 1, d, h), v };
  });
}
