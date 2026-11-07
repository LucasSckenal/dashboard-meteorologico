// Rosa dos ventos: a seta aponta de onde o vento vem, e os pontinhos são as outras horas do dia.

export default function Bussola({ horas, i, rotulo }) {
  const atual = horas[i]?.v.direcao;
  const ponto = (g, r) => { const a = ((g - 90) * Math.PI) / 180; return [60 + Math.cos(a) * r, 60 + Math.sin(a) * r]; };
  return (
    <svg className="bussola" viewBox="0 0 120 120" role="img" aria-label={rotulo}>
      <circle cx="60" cy="60" r="46" className="b-anel" />
      {Array.from({ length: 24 }, (_, k) => {
        const [x1, y1] = ponto(k * 15, 46), [x2, y2] = ponto(k * 15, k % 6 ? 43 : 40);
        return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} className="b-marca" />;
      })}
      {[["N", 0], ["L", 90], ["S", 180], ["O", 270]].map(([t, g]) => {
        const [x, y] = ponto(g, 55);
        return <text key={t} x={x} y={y + 3} textAnchor="middle" className="b-letra">{t}</text>;
      })}
      {horas.map((h, k) => {
        if (h.v.direcao == null || k === i) return null;
        const [x, y] = ponto(h.v.direcao, 34);
        return <circle key={k} cx={x} cy={y} r="1.8" className="b-hist" style={{ opacity: 0.2 + 0.6 * (k / horas.length) }} />;
      })}
      {atual != null && (
        <g transform={`rotate(${atual} 60 60)`} className="b-seta">
          <line x1="60" y1="16" x2="60" y2="34" />
          <path d="M60 48 L54 32 L60 35 L66 32 Z" />
        </g>
      )}
      <circle cx="60" cy="60" r="2.5" className="b-centro" />
    </svg>
  );
}
