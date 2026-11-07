import { useEffect, useState } from "react";

// Rótulo da câmera: "ao vivo" com o relógio nos segundos só quando a tela mostra o agora; numa hora passada, "gravação".
// O vídeo é do Pexels, e a nota dá o crédito.

export function RotuloCamera({ aoVivo, quando }) {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    if (!aoVivo) return;
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, [aoVivo]);
  const dia = quando ? quando.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "") : "";
  const hora = aoVivo ? agora.toLocaleTimeString("pt-BR") : quando ? `${String(quando.getHours()).padStart(2, "0")}:00` : "--:--";
  return (
    <span className="cam-info">
      <span className={aoVivo ? "cam-vivo" : "cam-grav"}>{aoVivo ? "ao vivo" : "gravação"}</span>
      {!aoVivo && dia && <span>{dia}</span>}
      <span className="cam-hora">{hora}</span>
    </span>
  );
}

export default function Camera() {
  return <p className="cam-nota" aria-hidden="true">vídeo: Pexels</p>;
}
