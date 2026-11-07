// Barômetro: meio mostrador de 980 a 1040 hPa, com a faixa normal, a agulha da hora e a tendência das últimas 3 horas.

const MIN = 980, MAX = 1040;
const ang = (v) => Math.PI * (1 - (Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN));
const pt = (v, r) => [70 + Math.cos(ang(v)) * r, 70 - Math.sin(ang(v)) * r];
const arco = (a, b, r) => { const [x1, y1] = pt(a, r), [x2, y2] = pt(b, r); return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`; };

export default function Medidor({ v, antes, normal, rotulo }) {
  const [nx, ny] = v == null ? [70, 70] : pt(v, 46);
  return (
    <svg className="medidor" viewBox="0 0 140 84" role="img" aria-label={rotulo}>
      <path d={arco(MIN, MAX, 56)} className="m-trilho" />
      <path d={arco(normal[0], normal[1], 56)} className="m-normal" />
      {Array.from({ length: 13 }, (_, k) => {
        const val = MIN + k * 5, [x1, y1] = pt(val, 62), [x2, y2] = pt(val, k % 2 ? 65 : 68);
        return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} className="m-marca" />;
      })}
      {antes != null && (() => { const [x, y] = pt(antes, 56); return <circle cx={x} cy={y} r="2.6" className="m-antes" />; })()}
      {v != null && <line x1="70" y1="70" x2={nx} y2={ny} className="m-agulha" />}
      <circle cx="70" cy="70" r="3.5" className="m-centro" />
      <text x="12" y="82" className="m-rotulo">{MIN}</text>
      <text x="128" y="82" textAnchor="end" className="m-rotulo">{MAX}</text>
    </svg>
  );
}
