# Estação Unijuí

Painel novo da estação meteorológica da Unijuí (projeto integrador). Ele substitui o front antigo do
[Unijui-PI4l](https://github.com/LucasSckenal/Unijui-PI4l): em vez de escolher sensor e linha em menus, a primeira tela já diz o que
está fora do normal agora.

- **Primeira tela:** o aviso mais importante da hora (UV alto, rajada, chuva, PM2.5, calor, ar seco...) e a temperatura, sobre uma
  câmera da cidade, com as medidas principais numa faixa de vidro.
- **As 24 horas:** as 14 medidas dos dois aparelhos, cada uma no gráfico que combina com ela (linha, área, barras, faixa de calor,
  barômetro, rosa dos ventos, pirulito, degrau). Arrastar a linha do tempo ou o gráfico escolhe a hora; dá para voltar até 30 dias.
- **Aparelhos:** `nit2xli` (estação: temperatura, umidade, chuva, vento, rajada, direção, luminosidade, UV, radiação, pressão) e
  `k72623_lo` (ar e som: temperatura, umidade, ruído, PM2.5).

## Dados

O painel lê `GET /sensors/tabela-combinada/last-24-hours` da API Nest do projeto original. Se ela não responder, usa **dados de
exemplo**, e a tela avisa isso. Copie `.env.example` para `.env` para apontar outra API.

## Rodar

```bash
npm install
npm run dev
```

## Stack

React 18, Vite 5 e SCSS. Fontes Bricolage Grotesque e IBM Plex Mono (Fontsource).

## Créditos

O vídeo de fundo é de São Paulo, do [Pexels](https://www.pexels.com/video/traffic-in-sao-paulo-at-night-14534442/), com a licença
livre do Pexels. Ele é ilustrativo e não mostra Ijuí.
