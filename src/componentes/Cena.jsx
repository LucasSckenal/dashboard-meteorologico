import { useEffect, useRef, useState } from "react";
import Ceu from "./Ceu.jsx";

// A cena de fundo: uma câmera fixa sobre o trânsito de São Paulo, em tempo real e sem efeito por cima.
// O vídeo toca sempre (é o centro da ideia) e tem botão de pausa. Se o navegador barrar a reprodução automática
// (modo de economia do celular), ele começa no primeiro toque. Por baixo fica o céu desenhado, caso o vídeo não carregue.
// Vídeo: Pexels, licença livre.

const BASE = import.meta.env.BASE_URL + "ceu/";

export default function Cena({ p }) {
  const video = useRef(null);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    const el = video.current;
    const tenta = () => el.play().catch(() => {});
    tenta();
    const toque = () => { if (el.paused && !el.dataset.pausadoPelaPessoa) tenta(); };
    addEventListener("pointerdown", toque, { once: true });
    const visivel = () => { if (!document.hidden && !el.dataset.pausadoPelaPessoa) tenta(); };
    document.addEventListener("visibilitychange", visivel);
    return () => { removeEventListener("pointerdown", toque); document.removeEventListener("visibilitychange", visivel); };
  }, []);

  const alterna = () => {
    const el = video.current;
    if (el.paused) { delete el.dataset.pausadoPelaPessoa; el.play().catch(() => {}); setPausado(false); }
    else { el.dataset.pausadoPelaPessoa = "1"; el.pause(); setPausado(true); }
  };

  return (
    <>
      <div className="cena" aria-hidden="true">
        <Ceu p={p} quieto />
        <video ref={video} className="ativa" src={BASE + "cidade.mp4"} poster={BASE + "cidade.jpg"}
          autoPlay muted loop playsInline preload="auto" disablePictureInPicture tabIndex={-1} />
      </div>
      <button type="button" className="pausa-video" onClick={alterna} aria-pressed={pausado}>
        {pausado ? "Tocar vídeo" : "Pausar vídeo"}
      </button>
    </>
  );
}
