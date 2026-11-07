import { useEffect, useState } from "react";
import { MEDIDAS } from "./medidas.js";
import { diaDeExemplo } from "./exemplo.js";

export const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const diaAnterior = (iso) => { const [a, m, d] = iso.split("-").map(Number); return isoLocal(new Date(a, m - 1, d - 1)); };

const API = import.meta.env.VITE_API || "http://localhost:3000";
// Só tenta a API quando ela pode estar perto: rodando local ou com VITE_API definido. Publicado, usa o exemplo sem pedir nada.
let apiCaiu = false; // falhou uma vez: não espera de novo a cada troca de dia (volta a tentar ao recarregar)
const tentaApi = () => !apiCaiu && (Boolean(import.meta.env.VITE_API) || ["localhost", "127.0.0.1"].includes(location.hostname));

/** Últimas 24 h até agora (hoje) ou o dia inteiro (dia passado), de exemplo. */
function exemplo(dia, hoje, agora) {
  if (dia !== hoje) return diaDeExemplo(dia);
  const h = agora.getHours();
  return [...diaDeExemplo(diaAnterior(dia)).slice(h + 1), ...diaDeExemplo(dia).slice(0, h + 1)];
}

/** Junta os aparelhos por hora. A API devolve médias por hora do dia (0 a 23); aqui vira linha do tempo em ordem. */
function daApi(lista, dia, hoje, agora) {
  const porHora = new Map();
  for (const ap of lista || []) {
    for (const { hour, averages } of ap.averagePerHour || []) {
      const v = porHora.get(hour) || {};
      for (const [chave, m] of Object.entries(MEDIDAS)) {
        const x = averages?.[m.campo];
        if (x != null && !Number.isNaN(x)) v[chave] = Math.round(x * 10) / 10;
      }
      porHora.set(hour, v);
    }
  }
  const [a, m, d] = dia.split("-").map(Number);
  const fim = dia === hoje ? agora.getHours() : 23;
  const horas = [];
  for (let k = 23; k >= 0; k--) {
    const quando = new Date(a, m - 1, d, fim - k);
    const v = porHora.get(quando.getHours());
    if (v) horas.push({ quando, v: Object.fromEntries(Object.keys(MEDIDAS).map((c) => [c, v[c] ?? null])) });
  }
  return horas;
}

export function useEstacao(dia) {
  const [estado, setEstado] = useState({ horas: [], fonte: null, carregando: true });
  const [tique, setTique] = useState(0);
  const hoje = isoLocal(new Date());

  useEffect(() => {
    if (dia !== hoje) return;
    const id = setInterval(() => setTique((t) => t + 1), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [dia, hoje]);

  useEffect(() => {
    let vivo = true;
    const agora = new Date();
    const usaExemplo = (motivo) => vivo && setEstado({ horas: exemplo(dia, hoje, agora), fonte: "exemplo", motivo, carregando: false, dia });
    if (!tentaApi()) { usaExemplo("publicado"); return () => { vivo = false; }; }

    // outro dia: some com as horas do dia anterior na hora, para nada mostrar data velha
    setEstado((e) => (e.dia === dia ? { ...e, carregando: true } : { horas: [], fonte: e.fonte, carregando: true, dia }));
    const ctrl = new AbortController();
    const prazo = setTimeout(() => ctrl.abort(), 4000);
    const q = dia === hoje ? "" : `?selectedDate=${dia}T23:59:00`;
    fetch(`${API}/sensors/tabela-combinada/last-24-hours${q}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((lista) => vivo && setEstado({ horas: daApi(lista, dia, hoje, agora), fonte: "api", carregando: false, dia }))
      .catch((e) => { if (e.name !== "AbortError" || vivo) apiCaiu = true; usaExemplo("sem-api"); })
      .finally(() => clearTimeout(prazo));
    return () => { vivo = false; ctrl.abort(); clearTimeout(prazo); };
  }, [dia, hoje, tique]);

  return estado.dia === dia ? estado : { horas: [], fonte: estado.fonte, carregando: true };
}
