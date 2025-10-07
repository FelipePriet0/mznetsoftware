MZNet UI — Guia de Design (Readme.UI)

Resumo
- Escopo: propriedades visuais para replicar o UI 1:1 (cores, tipografia, espaçamento, bordas, sombras, estados e breakpoints).
- Tecnologias: HTML5/CSS inline, Bootstrap 5 (CDN), Tailwind (CDN utilitário), Google Fonts (Poppins).

Identidade Visual
- Marca primária: #018942 (verde MZNet).
- Tons suplementares: #007F3D (brand-600), #006634 (brand-700).
- Neutros: #FFFFFF (branco), #000000 (preto).
- Color-scheme global: light (":root { color-scheme: light; }").

Cores (Tokens)
- brand/500: #018942
- brand/600: #007F3D
- brand/700: #006634
- neutral/white: #FFFFFF
- neutral/black: #000000
- overlay/white-92: rgba(255, 255, 255, 0.92)
- overlay/white-90: rgba(255, 255, 255, 0.90)
- overlay/white-60: rgba(255, 255, 255, 0.60) — outline foco (botão/link)
- overlay/white-55: rgba(255, 255, 255, 0.55) — outline focus-visible (home cards)
- overlay/white-35: rgba(255, 255, 255, 0.35) — borda do back-link
- overlay/white-12: rgba(255, 255, 255, 0.12) — hover do back-link
- overlay/white-08: rgba(255, 255, 255, 0.08) — fundo do back-link
- overlay/white-25: rgba(255, 255, 255, 0.25) — sombras de texto e drop-shadow
- overlay/black-28: rgba(0, 0, 0, 0.28) — hover dos option-cards
- overlay/black-25: rgba(0, 0, 0, 0.25) — sombras gerais (cards/botões/inputs)
- overlay/black-22: rgba(0, 0, 0, 0.22) — hover do back-link
- overlay/black-15: rgba(0, 0, 0, 0.15) — sombra do back-link
- input/bg-translucent: rgba(217, 217, 217, 0.20) — inputs padrão
- ring/brand-25: rgba(1, 137, 66, 0.25) — foco (box-shadow 0 0 0 0.25rem)

Plano de Fundo
- Gradiente de página: linear-gradient(180deg, #018942 0%, rgba(0, 230, 110, 0.70) 50%, #000000 87.66%).

Tipografia
- Família: 'Poppins', 'Segoe UI', sans-serif.
- Pesos: 400, 500, 600, 700.
- Título (hero-title): 1.45rem, 700, centralizado, text-shadow: 0 3.184px 6.368px overlay/white-25.
- Título home (page-title): 27.06px, line-height 35px, 700, sombra: 0 4px 4px rgba(0, 0, 0, 0.25).
- Rótulo (form-label): 0.75rem, 700, sombra: 0 1.355px 1.355px overlay/white-25, margem inferior 0.35rem.
- Chamada (tagline): 0.9rem, 600, letter-spacing 0.08em, alinhado ao centro.
- Rodapé: 0.75rem, letter-spacing 0.02em, cor: overlay/white-90.

Espaçamento & Layout
- Body: margin 0; min-height 100vh; display flex; flex-direction column; color #FFF.
- Home (direcionamento): body centrado com align/justify center; main width: min(390px, calc(100% - 2.5rem)); min-height 844px.
- Container principal (hero-shell): flex: 1 0 auto; align-items/justify-content center; padding: 3rem 1.25rem 2rem.
- Card (card-shell): width min(100%, 364px); padding 2.5rem 1.75rem.
- Responsividade: ≥576px → padding 3rem 2.75rem; ≥768px → width min(100%, 420px).
- Home frame: display column; gap 1.75rem; option-card gap 0.75rem.

Bordas & Raios
- Cartões (card-shell): border-radius 30px; border 1.34px solid #FFFFFF.
- Inputs/Selects (input-pill): border-radius 30px; border 1.36px solid #FFFFFF; padding 0.85rem 1.25rem.
- Botão primário (cta-btn): border-radius 41px; border none.
- Icon wrap (home): 74×74px; border 2px solid #018942; border-radius 50%.
- Back-link: border-radius 999px; border 1px solid overlay/white-35.

Sombras
- Card principal: box-shadow 0 22px 60px overlay/black-25; filter drop-shadow(0 6.714px 5.371px overlay/white-25).
- Inputs: box-shadow 0 5.447px 5.447px overlay/black-25.
- Botão hover: box-shadow 0 10px 18px overlay/black-25.
- Option-card: default 0 6px 4px overlay/black-25; hover 0 16px 22px overlay/black-28.
- Back-link: 0 4px 10px overlay/black-15; hover 0 8px 16px overlay/black-22.

Componentes
- Card Shell (.card-shell):
  - Fundo brand/500; borda branca 1.34px; raio 30px; sombras acima.
  - Conteúdo centralizado; largura e padding responsivos.
- Botão Primário (.cta-btn):
  - Fundo #FFFFFF; texto #018942; peso 700; 1rem; padding 0.75rem 1rem; raio 41px.
  - Hover: translateY(-1px) + sombra 0 10px 18px overlay/black-25.
  - Focus: outline 3px overlay/white-60; offset 2px.
- Inputs e Selects (.input-pill):
  - Raio 30px; borda 1.36px branca; padding 0.85rem 1.25rem; sombra suave.
  - Padrão: fundo input/bg-translucent; texto #FFFFFF; placeholder branco 70%.
  - Variante Endereço PJ: fundo #FFFFFF; texto #018942; placeholder #018942 a 65%; borda branca.
  - Focus (todas): box-shadow 0 0 0 0.25rem ring/brand-25 (anel de foco).
  - Select: option cor #018942; fundo #FFFFFF.
  - Autofill WebKit: força fundo branco e texto #018942.
- Link de Voltar (.back-link):
  - Posição fixa (top 14px; left 14px); padding 6px 10px; raio 999px.
  - Fundo overlay/white-08; borda overlay/white-35; texto overlay/white-92.
  - Hover: fundo overlay/white-12; translateY(-1px); sombra 0 8px 16px overlay/black-22.
  - Focus: outline 3px overlay/white-60; offset 2px.
- Cartões de Opção (Home, .option-card):
  - 298×144px; raio 30px; fundo #FFFFFF; texto #018942; transições 0.2s; gap 0.75rem.
  - Hover: translateY(-3px); sombra 0 16px 22px overlay/black-28.
  - Focus-visible: outline 4px overlay/white-55; outline-offset 4px.
  - Ícone: SVG 40×40 dentro de .icon-wrap 74×74 com borda 2px #018942.

Estados & Acessibilidade
- Focus visível consistente em botões, links, inputs e option-cards.
- Validação visual HTML5/Bootstrap: alternância de .is-valid / .is-invalid.
- Links em componentes sem sublinhado; manter contraste de texto ≥ AA.

Breakpoints
- ≥576px (sm): card-shell padding 3rem 2.75rem.
- ≥768px (md): card-shell width min(100%, 420px).
- Altura ≤844px (home): main usa min-height 100vh; frame com padding vertical 2.5rem.

Ícones & Imagens
- Logo: Assets/logo-mznet.png (usar caminhos relativos ../Assets em páginas internas).
- Ícones: SVG inline (home) — 40×40 dentro de círculo 74px.

Dependências de UI (CDN)
- Google Fonts Poppins (pesos 400, 500, 600, 700).
- Bootstrap 5.3.3 CSS via jsdelivr.
- Tailwind via CDN com preset de cores brand (sem build local).

Notas de Implementação
- Sensível a maiúsculas/minúsculas (Linux). Manter exatamente: “Cadastro PF/index.html” e “Cadastro PJ/Indexpj.html”.
- Páginas internas usam link de retorno para "../direcionamento.html"; home aponta para pastas com espaço.
- Em produção sem index.html na raiz, usar redirecionamento para /direcionamento.html ou rewrite.

