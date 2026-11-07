// Todas as medidas dos dois aparelhos, com unidade, faixa normal e o aviso quando saem dela.
// Os nomes dos campos são os da API Nest (tabela_combinada).

export const APARELHOS = {
  nit2xli: { nome: "Estação meteorológica", codigo: "nit2xli" },
  k72623_lo: { nome: "Sensor de ar e som", codigo: "k72623_lo" },
};

export const MEDIDAS = {
  temp: { campo: "emw_temperature", nome: "Temperatura", un: "°", casas: 0, aparelho: "nit2xli", normal: [5, 32] },
  umid: { campo: "emw_humidity", nome: "Umidade", un: "%", casas: 0, aparelho: "nit2xli", normal: [30, 100] },
  chuva: { campo: "emw_rain_lvl", nome: "Chuva", un: "mm", casas: 1, aparelho: "nit2xli", normal: [0, 0] },
  vento: { campo: "emw_avg_wind_speed", nome: "Vento", un: "km/h", casas: 0, aparelho: "nit2xli", normal: [0, 30] },
  rajada: { campo: "emw_gust_wind_speed", nome: "Rajada", un: "km/h", casas: 0, aparelho: "nit2xli", normal: [0, 40] },
  direcao: { campo: "emw_wind_direction", nome: "Direção do vento", un: "°", casas: 0, aparelho: "nit2xli" },
  luz: { campo: "emw_luminosity", nome: "Luminosidade", un: "lux", casas: 0, aparelho: "nit2xli" },
  uv: { campo: "emw_uv", nome: "Índice UV", un: "", casas: 0, aparelho: "nit2xli", normal: [0, 5] },
  radiacao: { campo: "emw_solar_radiation", nome: "Radiação solar", un: "W/m²", casas: 0, aparelho: "nit2xli" },
  pressao: { campo: "emw_atm_pres", nome: "Pressão", un: "hPa", casas: 0, aparelho: "nit2xli", normal: [1003, 1030] },
  temp2: { campo: "temperature", nome: "Temperatura", un: "°", casas: 0, aparelho: "k72623_lo", normal: [5, 32] },
  umid2: { campo: "humidity", nome: "Umidade", un: "%", casas: 0, aparelho: "k72623_lo", normal: [30, 100] },
  pm25: { campo: "pm2_5", nome: "PM2.5", un: "µg/m³", casas: 0, aparelho: "k72623_lo", normal: [0, 15] },
  ruido: { campo: "noise", nome: "Ruído", un: "dB", casas: 0, aparelho: "k72623_lo", normal: [0, 65] },
};

const PONTOS = ["norte", "nordeste", "leste", "sudeste", "sul", "sudoeste", "oeste", "noroeste"];
const SIGLAS = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
const ponto = (g) => Math.round((((g % 360) + 360) % 360) / 45) % 8;
export const direcaoNome = (g) => (g == null ? null : PONTOS[ponto(g)]);
export const direcaoSigla = (g) => (g == null ? "" : SIGLAS[ponto(g)]);
const artigo = (nome) => (nome === "leste" || nome === "oeste" ? "do " : "do ") + nome;

export function numero(v, casas = 0) {
  if (v == null || Number.isNaN(v)) return "—";
  // pressão de 1009 hPa não leva ponto; luminosidade de 95.000 lux leva
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas, useGrouping: Math.abs(v) >= 10000 });
}
export const valor = (v, chave) => numero(v, MEDIDAS[chave]?.casas ?? 0);

// Cada regra devolve o nível (1 atenção, 2 alto) e a frase do título, ou nada quando está normal.
const REGRAS = [
  ["rajada", (v, t) => v >= 40 && { nivel: v >= 60 ? 2 : 1, frase: `Rajadas de ${numero(v)} km/h${t.dir ? " vindo " + artigo(t.dir) : ""}.`, curta: `rajada ${numero(v)} km/h` }],
  ["chuva", (v) => v > 0 && { nivel: v >= 10 ? 2 : 1, frase: v >= 10 ? `Chuva forte: ${numero(v, 1)} mm na última hora.` : `Chovendo: ${numero(v, 1)} mm na última hora.`, curta: `chuva ${numero(v, 1)} mm` }],
  ["uv", (v) => v >= 6 && { nivel: v >= 8 ? 2 : 1, frase: `Índice UV ${numero(v)}, ${v >= 11 ? "extremo" : v >= 8 ? "muito alto" : "alto"}.`, curta: `UV ${numero(v)}` }],
  ["pm25", (v) => v > 15 && { nivel: v > 35 ? 2 : 1, frase: `Ar com ${numero(v)} µg/m³ de partículas finas.`, curta: `PM2.5 ${numero(v)}` }],
  ["temp", (v) => (v >= 32 || v <= 5) && { nivel: v >= 36 || v <= 0 ? 2 : 1, frase: v >= 32 ? `Calor de ${numero(v)}°.` : v <= 0 ? `Risco de geada: ${numero(v)}°.` : `Frio de ${numero(v)}°.`, curta: `${numero(v)}°` }],
  ["vento", (v) => v >= 30 && { nivel: v >= 45 ? 2 : 1, frase: `Vento forte, ${numero(v)} km/h.`, curta: `vento ${numero(v)} km/h` }],
  ["umid", (v) => v <= 30 && { nivel: v <= 20 ? 2 : 1, frase: `Ar seco: umidade de ${numero(v)}%.`, curta: `umidade ${numero(v)}%` }],
  ["ruido", (v) => v >= 65 && { nivel: v >= 80 ? 2 : 1, frase: `Ruído de ${numero(v)} dB perto da estação.`, curta: `ruído ${numero(v)} dB` }],
  ["pressao", (v) => v <= 1002 && { nivel: 1, frase: `Pressão baixa: ${numero(v)} hPa.`, curta: `pressão ${numero(v)} hPa` }],
];

/** Avisos de uma hora, do mais grave para o mais leve. */
export function avisos(v) {
  if (!v) return [];
  const t = { dir: direcaoNome(v.direcao) };
  const lista = [];
  REGRAS.forEach(([chave, regra], ordem) => {
    const x = v[chave];
    if (x == null || Number.isNaN(x)) return;
    const r = regra(x, t);
    if (r) lista.push({ chave, ordem, ...r });
  });
  return lista.sort((a, b) => b.nivel - a.nivel || a.ordem - b.ordem);
}
