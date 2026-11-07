// Gráfico das horas, com a forma que combina com cada medida:
// linha, área, barra (chuva), vento (barra da média + traço da rajada), degrau (ruído), pirulito (PM2.5) e calor (UV).
// Todos têm o cursor da hora escolhida, e arrastar sobre eles escolhe a hora. Hora sem medida fica vazia, não vira zero.

const L = 300, A = 84, PAD = 6;

export const NIVEL_UV = (v) => (v == null ? -1 : v >= 11 ? 4 : v >= 8 ? 3 : v >= 6 ? 2 : v >= 3 ? 1 : 0);
export const NOMES_UV = ["baixo", "moderado", "alto", "muito alto", "extremo"];

export default function Grafico({ horas, series, i, onHora, normal, tipo = "linha", rotulo }) {
  const chave = series[0].chave;
  const vals = series.flatMap((s) => horas.map((h) => h.v[s.chave])).filter((x) => x != null);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (normal && normal[1] > normal[0]) { min = Math.min(min, normal[0]); max = Math.max(max, Math.min(normal[1], max * 1.4 + 1)); }
  if (!["linha", "degrau"].includes(tipo)) min = Math.min(0, min);
  if (!vals.length) { min = 0; max = 1; }
  if (max - min < 1e-6) { max += 1; min -= tipo === "linha" ? 1 : 0; }
  const folga = (max - min) * 0.12;
  const y = (v) => A - PAD - ((v - min) / (max - min + folga)) * (A - PAD * 2);
  const n = horas.length;
  const passo = L / Math.max(n, 1);
  // barras e células ocupam o centro de cada hora; linhas vão de ponta a ponta
  const porHora = ["barra", "vento", "pirulito", "calor"].includes(tipo);
  const x = (k) => (porHora ? passo * (k + 0.5) : n <= 1 ? L / 2 : (k / (n - 1)) * L);
  const larg = Math.max(2, passo * 0.56);

  const caminho = (c, degrau = false) => {
    let d = "", aberto = false, antes = null;
    horas.forEach((h, k) => {
      const v = h.v[c];
      if (v == null) { aberto = false; return; }
      if (degrau && aberto) d += `H${x(k).toFixed(1)}V${y(v).toFixed(1)}`;
      else d += `${aberto ? "L" : "M"}${x(k).toFixed(1)} ${y(v).toFixed(1)}`;
      aberto = true; antes = v;
    });
    return d;
  };

  const escolhe = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = (e.clientX - r.left) / r.width;
    const k = porHora ? Math.floor(f * n) : Math.round(f * (n - 1));
    onHora(Math.max(0, Math.min(n - 1, k)));
  };

  const faixa = normal && normal[1] > normal[0] && tipo !== "calor"
    ? [y(Math.min(normal[1], max + folga)), y(Math.max(normal[0], min))]
    : null;

  let corpo;
  if (tipo === "calor") {
    corpo = horas.map((h, k) => {
      const nv = NIVEL_UV(h.v[chave]);
      return <rect key={k} className={`g-celula c${nv}${k === i ? " atual" : ""}`} x={passo * k + 0.6} width={passo - 1.2} y="14" height={A - 28} rx="1.5" />;
    });
  } else if (tipo === "barra") {
    corpo = horas.map((h, k) => h.v[chave] > 0 && (
      <rect key={k} className="g-barra" x={x(k) - larg / 2} width={larg} y={y(h.v[chave])} height={y(min) - y(h.v[chave])} />
    ));
  } else if (tipo === "vento") {
    const raj = series[1]?.chave;
    corpo = horas.map((h, k) => (
      <g key={k} className={k === i ? "atual" : ""}>
        {h.v[chave] != null && <rect className="g-barra-vento" x={x(k) - larg / 2} width={larg} y={y(h.v[chave])} height={y(min) - y(h.v[chave])} />}
        {raj && h.v[raj] != null && (
          <>
            {h.v[chave] != null && <line className="g-haste" x1={x(k)} x2={x(k)} y1={y(h.v[chave])} y2={y(h.v[raj])} vectorEffect="non-scaling-stroke" />}
            <line className={`g-rajada${normal && h.v[raj] > normal[1] ? " alto" : ""}`} x1={x(k) - larg / 2} x2={x(k) + larg / 2} y1={y(h.v[raj])} y2={y(h.v[raj])} vectorEffect="non-scaling-stroke" />
          </>
        )}
      </g>
    ));
  } else if (tipo === "pirulito") {
    corpo = horas.map((h, k) => {
      const v = h.v[chave];
      if (v == null) return null;
      const alto = normal && v > normal[1];
      return (
        <g key={k} className={`${alto ? "alto" : ""}${k === i ? " atual" : ""}`}>
          <line className="g-haste" x1={x(k)} x2={x(k)} y1={y(min)} y2={y(v)} vectorEffect="non-scaling-stroke" />
          <line className="g-gota" x1={x(k)} x2={x(k)} y1={y(v)} y2={y(v)} vectorEffect="non-scaling-stroke" />
        </g>
      );
    });
  } else {
    corpo = series.map((s, si) => (
      <g key={s.chave}>
        {tipo === "area" && si === 0 && <path className="g-area" d={`${caminho(s.chave)}L${x(n - 1)} ${A}L${x(0)} ${A}Z`} />}
        <path className={`g-linha${s.fraca ? " fraca" : ""}`} d={caminho(s.chave, tipo === "degrau")} vectorEffect="non-scaling-stroke" />
      </g>
    ));
  }

  return (
    <svg className={`grafico t-${tipo}`} viewBox={`0 0 ${L} ${A}`} preserveAspectRatio="none" role="img" aria-label={rotulo}
      onPointerDown={escolhe} onPointerMove={escolhe}>
      {faixa && <rect className="g-normal" x="0" y={faixa[0]} width={L} height={Math.max(0, faixa[1] - faixa[0])} />}
      {corpo}
      {n > 0 && tipo !== "calor" && <line className="g-cursor" x1={x(i)} x2={x(i)} y1="0" y2={A} vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
