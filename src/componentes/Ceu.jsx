import { useEffect, useRef } from "react";

// O céu é desenhado pelos dados da hora escolhida: a altura do sol pela hora, as nuvens pela umidade e pela radiação que faltou,
// a chuva pelo pluviômetro e o rumo das nuvens pelo vento. Sem WebGL fica o gradiente do CSS, calculado com as mesmas contas.

export function ceuDaHora(h) {
  if (!h) {
    // ainda sem dados: o céu da hora do relógio, para não amanhecer na frente da pessoa
    const d = new Date(), hora = d.getHours() + d.getMinutes() / 60;
    return { sol: Math.sin((Math.PI * (hora - 6)) / 13.5), solx: Math.min(0.9, Math.max(0.1, (hora - 6) / 13.5)), nuvem: 0.3, chuva: 0, vx: 0.3, vy: 0, vel: 0.2 };
  }
  const v = h.v;
  const hora = h.quando.getHours() + 0.5;
  const sol = Math.sin((Math.PI * (hora - 6)) / 13.5);
  const esperado = Math.max(0, sol) * 990;
  const falta = esperado > 120 && v.radiacao != null ? 1 - Math.min(1, v.radiacao / esperado) : null;
  const umid = v.umid ?? 60;
  const nuvem = Math.min(1, Math.max(0.05, falta != null ? falta * 0.9 + umid / 500 : (umid - 40) / 70));
  const chuva = Math.min(1, (v.chuva ?? 0) / 8);
  // o vento vem DE uma direção: as nuvens andam para o lado oposto
  const ang = (((v.direcao ?? 90) + 180) * Math.PI) / 180;
  const vel = Math.min(1, (v.vento ?? 8) / 35);
  return { sol, solx: Math.min(0.9, Math.max(0.1, (hora - 6) / 13.5)), nuvem, chuva: Math.max(chuva, 0), vx: Math.sin(ang), vy: Math.cos(ang) * 0.3, vel };
}

const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const rgb = (c) => `rgb(${c.map((x) => Math.round(Math.min(1, x) * 255)).join(" ")})`;
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function gradiente(p) {
  const dia = suave(-0.15, 0.45, p.sol);
  const ouro = Math.exp(-((p.sol - 0.05) ** 2) * 28);
  const escuro = 1 - p.chuva * 0.35;
  const topo = mix([0.055, 0.07, 0.1], [0.21, 0.34, 0.49], dia).map((x) => x * escuro);
  const hor = mix(mix([0.12, 0.15, 0.19], [0.63, 0.68, 0.71], dia), [0.8, 0.56, 0.34], ouro * 0.85).map((x) => x * escuro);
  return `linear-gradient(180deg, ${rgb(topo)} 0%, ${rgb(mix(topo, hor, 0.55))} 50%, ${rgb(hor)} 78%, #1b211f 79%, #10151a 100%)`;
}

/** A cor da hora para pôr sobre o vídeo (sem o chão): entardecer cobre, noite azul-aço, chuva mais escura. */
export function tinta(p) {
  const dia = suave(-0.15, 0.45, p.sol);
  const ouro = Math.exp(-((p.sol - 0.05) ** 2) * 28);
  const topo = mix([0.04, 0.06, 0.1], [0.3, 0.42, 0.55], dia);
  const hor = mix(mix([0.1, 0.13, 0.18], [0.7, 0.72, 0.72], dia), [0.95, 0.6, 0.32], ouro);
  return `linear-gradient(180deg, ${rgb(topo)} 0%, ${rgb(hor)} 85%)`;
}

const VS = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
const FS = `precision mediump float;
uniform vec2 res; uniform float t; uniform float sol; uniform float solx; uniform float nuvem; uniform float chuva; uniform vec2 vento;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*n(p); p *= 2.02; a *= 0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / res; float asp = res.x / res.y; float y = uv.y;
  float dia = smoothstep(-0.15, 0.45, sol);
  float ouro = exp(-pow(sol - 0.05, 2.0) * 28.0);
  vec3 topo = mix(vec3(0.055, 0.07, 0.10), vec3(0.21, 0.34, 0.49), dia);
  vec3 hor = mix(vec3(0.12, 0.15, 0.19), vec3(0.63, 0.68, 0.71), dia);
  hor = mix(hor, vec3(0.80, 0.62, 0.44), 0.12 * dia);
  hor = mix(hor, vec3(0.80, 0.56, 0.34), ouro * 0.85);
  vec3 c = mix(hor, topo, smoothstep(0.2, 0.95, y));

  vec2 d = (uv - vec2(solx, 0.24 + sol * 0.55)) * vec2(asp, 1.0);
  float vis = smoothstep(-0.1, 0.02, sol) * (1.0 - nuvem * 0.8);
  vec3 corSol = mix(vec3(1.0, 0.7, 0.42), vec3(1.0, 0.96, 0.88), dia);
  c += corSol * (smoothstep(0.034, 0.028, length(d)) * 0.9 + exp(-length(d) * 5.0) * 0.28) * vis;

  float noite = 1.0 - smoothstep(-0.25, 0.02, sol);
  vec2 g = floor(gl_FragCoord.xy / 2.0);
  c += step(0.9976, h(g)) * noite * (1.0 - nuvem) * smoothstep(0.35, 0.8, y) * (0.55 + 0.35 * sin(t * 1.7 + h(g) * 40.0));

  vec2 q = vec2(uv.x * asp, y) * vec2(1.3, 3.0) - vento * t * 0.05;
  float f = fbm(q + fbm(q * 0.6 + t * 0.008) * 0.8);
  float lim = mix(0.78, 0.32, nuvem);
  float cob = smoothstep(lim, lim + 0.22, f) * smoothstep(0.22, 0.5, y);
  vec3 cn = mix(vec3(0.09, 0.11, 0.14), vec3(0.80, 0.81, 0.82), dia * (1.0 - chuva * 0.55));
  cn = mix(cn, vec3(0.88, 0.62, 0.44), ouro * 0.55);
  c = mix(c, cn, cob * 0.88);
  c *= 1.0 - chuva * 0.35;

  float x = uv.x * asp;
  float m1 = 0.25 + 0.05 * n(vec2(x * 1.3, 3.0)) + 0.025 * n(vec2(x * 4.0, 7.0));
  float m2 = 0.14 + 0.045 * n(vec2(x * 2.1 + 10.0, 1.0)) + 0.012 * n(vec2(x * 9.0, 2.0));
  vec3 longe = mix(mix(vec3(0.07, 0.085, 0.09), vec3(0.24, 0.28, 0.27), dia), hor, 0.3);
  vec3 perto = mix(vec3(0.045, 0.055, 0.06), vec3(0.11, 0.14, 0.12), dia);
  c = mix(c, longe, smoothstep(m1 + 0.002, m1 - 0.002, y));
  c = mix(c, perto, smoothstep(m2 + 0.002, m2 - 0.002, y));

  vec2 r = gl_FragCoord.xy / res.y * vec2(110.0, 5.0);
  r.x += r.y * vento.x * 0.6;
  float col = floor(r.x); float rz = h(vec2(col, 3.0));
  float traco = smoothstep(0.75, 1.0, fract(r.y * 0.35 + t * (2.2 + rz) + rz * 13.0));
  float fio = smoothstep(0.35, 0.0, abs(fract(r.x) - 0.5));
  c += vec3(0.55, 0.6, 0.66) * fio * traco * step(rz, chuva) * step(0.01, chuva) * 0.22;

  c += (h(gl_FragCoord.xy + t) - 0.5) * 0.02;
  gl_FragColor = vec4(c, 1.0);
}`;

export default function Ceu({ p, quieto = false }) {
  const caixa = useRef(null);
  const tela = useRef(null);
  const alvo = useRef(p);
  const api = useRef(null);
  alvo.current = p;
  const quietoRef = useRef(quieto);
  quietoRef.current = quieto;

  useEffect(() => {
    const canvas = tela.current;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;
    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const a = sh(gl.VERTEX_SHADER, VS), b = sh(gl.FRAGMENT_SHADER, FS);
    if (!a || !b) return;
    const prog = gl.createProgram(); gl.attachShader(prog, a); gl.attachShader(prog, b); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = Object.fromEntries(["res", "t", "sol", "solx", "nuvem", "chuva", "vento"].map((k) => [k, gl.getUniformLocation(prog, k)]));
    canvas.dataset.vivo = "";

    const calmo = matchMedia("(prefers-reduced-motion: reduce)");
    const atual = { ...alvo.current };
    let tempo = 20, antes = performance.now(), quadro = 0, rodando = false, visivel = true;

    const tamanho = () => {
      const escala = Math.min(devicePixelRatio || 1, 1) * (innerWidth > 1600 ? 0.75 : 1);
      canvas.width = Math.round(canvas.clientWidth * escala); canvas.height = Math.round(canvas.clientHeight * escala);
      gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(u.res, canvas.width, canvas.height);
    };
    const desenha = () => {
      gl.uniform1f(u.t, tempo); gl.uniform1f(u.sol, atual.sol); gl.uniform1f(u.solx, atual.solx);
      gl.uniform1f(u.nuvem, atual.nuvem); gl.uniform1f(u.chuva, atual.chuva); gl.uniform2f(u.vento, atual.vx, atual.vy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const laco = (agora) => {
      if (!rodando) return;
      const dt = Math.min(0.05, (agora - antes) / 1000); antes = agora;
      for (const k of Object.keys(atual)) atual[k] += (alvo.current[k] - atual[k]) * 0.06;
      tempo += dt * (0.3 + atual.vel * 1.4);
      desenha();
      quadro = requestAnimationFrame(laco);
    };
    const decide = () => {
      const deve = visivel && !quietoRef.current && !document.hidden && !calmo.matches;
      if (deve && !rodando) { rodando = true; antes = performance.now(); quadro = requestAnimationFrame(laco); }
      if (!deve && rodando) { rodando = false; cancelAnimationFrame(quadro); }
      if (!deve) { Object.assign(atual, alvo.current); desenha(); }
    };
    api.current = { decide, mudou: () => { if (!rodando) { Object.assign(atual, alvo.current); desenha(); } } };

    const ro = new ResizeObserver(() => { tamanho(); desenha(); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; decide(); });
    io.observe(caixa.current);
    document.addEventListener("visibilitychange", decide);
    calmo.addEventListener("change", decide);
    const perdeu = (e) => { e.preventDefault(); rodando = false; delete canvas.dataset.vivo; };
    canvas.addEventListener("webglcontextlost", perdeu);
    tamanho(); decide();
    return () => {
      rodando = false; cancelAnimationFrame(quadro); ro.disconnect(); io.disconnect(); api.current = null;
      document.removeEventListener("visibilitychange", decide); calmo.removeEventListener("change", decide);
      canvas.removeEventListener("webglcontextlost", perdeu);
    };
  }, []);

  useEffect(() => { api.current?.mudou(); }, [p]);
  useEffect(() => { api.current?.decide(); }, [quieto]);

  return (
    <div className="ceu" ref={caixa} style={{ background: gradiente(p) }} aria-hidden="true">
      <canvas ref={tela} />
    </div>
  );
}
