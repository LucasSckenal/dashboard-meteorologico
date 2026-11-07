import { useEffect, useMemo, useState } from "react";
import { ceuDaHora } from "./componentes/Ceu.jsx";
import Cena from "./componentes/Cena.jsx";
import Camera, { RotuloCamera } from "./componentes/Camera.jsx";
import Grafico, { NIVEL_UV, NOMES_UV } from "./componentes/Grafico.jsx";
import Medidor from "./componentes/Medidor.jsx";
import Bussola from "./componentes/Bussola.jsx";
import { MEDIDAS, APARELHOS, avisos, valor, direcaoNome, direcaoSigla } from "./dados/medidas.js";
import { useEstacao, isoLocal } from "./dados/useEstacao.js";

const FAIXA = [
  { chave: "umid", nome: "umidade", alvo: "umid" },
  { chave: "vento", nome: "vento", alvo: "vento", extra: (v) => direcaoSigla(v.direcao) },
  { chave: "rajada", nome: "rajada", alvo: "vento" },
  { chave: "chuva", nome: "chuva", alvo: "chuva" },
  { chave: "uv", nome: "uv", alvo: "uv" },
  { chave: "pm25", nome: "pm2.5", alvo: "pm25" },
  { chave: "pressao", nome: "pressão", alvo: "pressao" },
  { chave: "ruido", nome: "ruído", alvo: "ruido" },
];

const CARTOES = [
  { id: "temp", nome: "Temperatura", series: [{ chave: "temp" }, { chave: "temp2", fraca: true, nome: "sensor de ar" }] },
  { id: "umid", nome: "Umidade", series: [{ chave: "umid" }, { chave: "umid2", fraca: true, nome: "sensor de ar" }], tipo: "area" },
  { id: "vento", nome: "Vento", series: [{ chave: "vento" }, { chave: "rajada", fraca: true, nome: "rajada" }], normal: MEDIDAS.rajada.normal, tipo: "vento" },
  { id: "direcao", nome: "Direção do vento", bussola: true },
  { id: "chuva", nome: "Chuva", series: [{ chave: "chuva" }], tipo: "barra" },
  { id: "uv", nome: "Índice UV", series: [{ chave: "uv" }], tipo: "calor" },
  { id: "radiacao", nome: "Radiação solar", series: [{ chave: "radiacao" }], tipo: "area" },
  { id: "luz", nome: "Luminosidade", series: [{ chave: "luz" }] },
  { id: "pressao", nome: "Pressão", series: [{ chave: "pressao" }], medidor: true },
  { id: "pm25", nome: "PM2.5", series: [{ chave: "pm25" }], tipo: "pirulito" },
  { id: "ruido", nome: "Ruído", series: [{ chave: "ruido" }], tipo: "degrau" },
];

const tendencia = (v, a) => (v == null || a == null ? "sem tendência" : v - a >= 1 ? `subindo ${valor(v - a, "chuva")} hPa em 3 h` : a - v >= 1 ? `caindo ${valor(a - v, "chuva")} hPa em 3 h` : "estável nas últimas 3 h");
const hh = (d) => `${String(d.getHours()).padStart(2, "0")}:00`;
const diaLongo = (iso) => { const [a, m, d] = iso.split("-").map(Number); return new Date(a, m - 1, d).toLocaleDateString("pt-BR", { day: "numeric", month: "long" }); };
const somaDias = (iso, n) => { const [a, m, d] = iso.split("-").map(Number); return isoLocal(new Date(a, m - 1, d + n)); };

function lerUrl() {
  const q = new URLSearchParams(location.search);
  const hoje = isoLocal(new Date());
  const dia = q.get("dia");
  const ok = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) && dia <= hoje && dia >= somaDias(hoje, -30);
  return { dia: ok ? dia : hoje, hora: q.has("hora") ? Number(q.get("hora")) : null };
}

export default function App() {
  const hoje = isoLocal(new Date());
  const inicio = useMemo(lerUrl, []);
  const [dia, setDia] = useState(inicio.dia);
  const [sel, setSel] = useState(inicio.hora);
  const { horas, fonte, carregando } = useEstacao(dia);

  const ultimo = horas.length - 1;
  const i = sel == null ? ultimo : Math.max(0, Math.min(ultimo, horas.findIndex((h) => h.quando.getHours() === sel)));
  const atual = horas[i];
  const noAgora = dia === hoje && i === ultimo;
  const lista = useMemo(() => avisos(atual?.v), [atual]);
  const fora = new Set(lista.map((a) => a.chave));
  const ceu = useMemo(() => ceuDaHora(atual), [atual]);

  useEffect(() => {
    const q = new URLSearchParams();
    if (dia !== hoje) q.set("dia", dia);
    if (sel != null && atual) q.set("hora", atual.quando.getHours());
    const s = q.toString();
    history.replaceState(null, "", s ? "?" + s : location.pathname + location.hash);
  }, [dia, sel, atual, hoje]);

  const mudaDia = (d) => { if (d && d <= hoje && d >= somaDias(hoje, -30)) { setDia(d); setSel(null); } };
  const escolhe = (k) => setSel(k === ultimo && dia === hoje ? null : horas[k].quando.getHours());

  let etiqueta = "dentro do normal", titulo = "Tudo dentro do normal.", nivel = 0;
  if (!horas.length) { etiqueta = carregando ? "lendo a estação" : "sem medidas"; titulo = carregando ? "Lendo a estação…" : "Nenhuma medida neste dia."; }
  else if (lista.length) { nivel = lista[0].nivel; etiqueta = nivel > 1 ? "fora do normal" : "atenção"; titulo = lista[0].frase; }
  const temp = atual ? atual.v.temp ?? atual.v.temp2 : null;

  return (
    <>
      <a className="pular" href="#dia">Pular para as 24 horas</a>
      <section className="topo-tela" aria-labelledby="titulo">
        <Cena p={ceu} />
        <Camera />
        <header className="barra">
          <p className="marca"><b>Estação Unijuí</b><span>Ijuí, RS</span></p>
          <p className="quando">
            {fonte === "exemplo" && <span className="selo" title="A API da estação não respondeu; estes números são de exemplo.">dados de exemplo</span>}
            <RotuloCamera aoVivo={noAgora} quando={atual?.quando} />
          </p>
        </header>

        <div className="principal" aria-live="polite">
          <p className={`etiqueta n${nivel}`}>{etiqueta}</p>
          <h1 id="titulo">{titulo}</h1>
          {lista.length > 1 && <p className="tambem">também: {lista.slice(1).map((a) => a.curta).join(" · ")}</p>}
          <p className="temp" aria-label={temp != null ? `Temperatura ${valor(temp, "temp")} graus` : undefined}
            aria-hidden={temp == null || undefined} style={temp == null ? { visibility: "hidden" } : undefined}>
            {temp != null ? valor(temp, "temp") : "00"}<span>°</span>
          </p>
          <a className="ver" href="#dia">Ver as 24 horas</a>
        </div>

        {horas.length > 1 && (
          <div className="hora-heroi">
            <span aria-hidden="true">{hh(horas[0].quando)}</span>
            <input type="range" min="0" max={ultimo} value={i} onChange={(e) => escolhe(+e.target.value)}
              aria-label="Hora mostrada no céu" aria-valuetext={atual ? hh(atual.quando) : ""} />
            <output>{noAgora ? "agora" : hh(atual.quando)}</output>
          </div>
        )}
        <ul className="faixa" aria-label="Medidas da hora">
          {FAIXA.map((f) => {
            const v = atual?.v[f.chave];
            return (
              <li key={f.chave} className={fora.has(f.chave) ? "fora" : ""}>
                <a href={`#g-${f.alvo}`} aria-label={`${f.nome} ${v == null ? "sem medida" : valor(v, f.chave) + " " + MEDIDAS[f.chave].un}${fora.has(f.chave) ? ", fora do normal" : ""}. Ver gráfico`}>
                  <small>{f.nome}</small>
                  <b>{valor(v, f.chave)}<i>{v != null && MEDIDAS[f.chave].un}{f.extra && atual && v != null ? " " + f.extra(atual.v) : ""}</i></b>
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      <main id="dia" className="dia" tabIndex={-1}>
        <div className="dia-topo">
          <h2>{dia === hoje ? "As últimas 24 horas" : `O dia ${diaLongo(dia)}`}</h2>
          <div className="controle-dia">
            <button type="button" onClick={() => mudaDia(somaDias(dia, -1))} disabled={dia <= somaDias(hoje, -30)} aria-label="Dia anterior">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <input type="date" value={dia} min={somaDias(hoje, -30)} max={hoje} onChange={(e) => mudaDia(e.target.value)} aria-label="Escolher o dia" />
            <button type="button" onClick={() => mudaDia(somaDias(dia, 1))} disabled={dia >= hoje} aria-label="Próximo dia">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>

        {horas.length > 0 ? (
          <>
            <div className="linha-tempo">
              <input type="range" min="0" max={ultimo} value={i} onChange={(e) => escolhe(+e.target.value)}
                aria-label="Hora" aria-valuetext={atual ? hh(atual.quando) : ""} />
              <div className="rotulos" aria-hidden="true">
                {[0, Math.round(ultimo / 3), Math.round((2 * ultimo) / 3), ultimo].map((k) => <span key={k}>{hh(horas[k].quando)}</span>)}
              </div>
              <p className="hora-escolhida">
                <output>{hh(atual.quando)}</output>
                {sel != null && <button type="button" className="agora" onClick={() => setSel(null)}>{dia === hoje ? "Voltar para agora" : "Ir para o fim do dia"}</button>}
              </p>
            </div>

            <ul className="cartoes">
              {CARTOES.map((c) => {
                const principal = c.bussola ? "direcao" : c.series[0].chave;
                const v = atual.v[principal];
                const segunda = c.series?.[1];
                const alerta = (c.series || []).some((s) => fora.has(s.chave));
                return (
                  <li key={c.id} id={`g-${c.id}`} className={`cartao${alerta ? " fora" : ""}${c.bussola ? " com-bussola" : ""}`}>
                    <div className="c-topo">
                      <h3>{c.nome}</h3>
                      <p className="c-valor">
                        {c.bussola
                          ? v == null ? "—" : <>{direcaoSigla(v)}<i> {valor(v, "direcao")}°</i></>
                          : <>{valor(v, principal)}<i>{v != null && MEDIDAS[principal].un}</i></>}
                      </p>
                    </div>
                    {c.bussola ? (
                      <>
                        <Bussola horas={horas} i={i} rotulo={v == null ? "Sem medida de direção" : `Vento vindo do ${direcaoNome(v)}`} />
                        <p className="c-nota">{v == null ? "sem medida nesta hora" : `vindo do ${direcaoNome(v)}`}</p>
                      </>
                    ) : c.medidor ? (
                      <>
                        <Medidor v={v} antes={horas[Math.max(0, i - 3)]?.v[principal]} normal={MEDIDAS[principal].normal}
                          rotulo={v == null ? "Pressão sem medida" : `Pressão ${valor(v, principal)} hectopascais`} />
                        <p className="c-nota">{tendencia(v, horas[Math.max(0, i - 3)]?.v[principal])}</p>
                      </>
                    ) : (
                      <>
                        <Grafico horas={horas} series={c.series} i={i} onHora={escolhe} tipo={c.tipo}
                          normal={c.normal || MEDIDAS[principal].normal} rotulo={`${c.nome} nas horas do dia`} />
                        <p className="c-nota">
                          {segunda ? <><span className="traco" aria-hidden="true" />{segunda.nome} {valor(atual.v[segunda.chave], segunda.chave)}{atual.v[segunda.chave] != null && MEDIDAS[segunda.chave].un}</>
                            : c.tipo === "barra" && !horas.some((h) => h.v[principal] > 0) ? "sem chuva no período"
                            : c.tipo === "barra" ? `${valor(horas.reduce((t, h) => t + (h.v[principal] || 0), 0), "chuva")} mm no período`
                            : c.tipo === "calor" ? <>{v == null ? "sem medida" : NOMES_UV[NIVEL_UV(v)]}<span className="escala" aria-hidden="true">{[0, 1, 2, 3, 4].map((k) => <i key={k} className={`c${k}`} />)}</span></>
                            : <>{hh(horas[0].quando)} – {hh(horas[ultimo].quando)}</>}
                        </p>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="vazio">{carregando ? "Lendo as medidas…" : "A estação não mandou nada neste dia. Tente outro dia."}</p>
        )}

        <section className="aparelhos" aria-labelledby="t-aparelhos">
          <h2 id="t-aparelhos">Aparelhos</h2>
          <ul>
            {Object.values(APARELHOS).map((a) => {
              const campos = Object.entries(MEDIDAS).filter(([, m]) => m.aparelho === a.codigo);
              const ultimaHora = [...horas].reverse().find((h) => campos.some(([c]) => h.v[c] != null));
              return (
                <li key={a.codigo}>
                  <b>{a.nome}</b>
                  <code>{a.codigo}</code>
                  <span>{campos.length} medidas</span>
                  <span>{ultimaHora ? `última às ${hh(ultimaHora.quando)}` : "sem medidas"}</span>
                </li>
              );
            })}
          </ul>
          <p className="fonte">
            {fonte === "api" ? "Médias por hora da API da estação." : "Dados de exemplo: a API da estação não respondeu. Com ela no ar, o painel usa as medidas reais."}
          </p>
        </section>
      </main>
    </>
  );
}
