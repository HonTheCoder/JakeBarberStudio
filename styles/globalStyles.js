// Ensure mobile viewport meta tag exists
if (!document.querySelector('meta[name="viewport"]')) {
  const meta = document.createElement("meta");
  meta.name = "viewport";
  meta.content = "width=device-width, initial-scale=1, maximum-scale=1";
  document.head.appendChild(meta);
}

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Geist:wght@400;500;600;700&display=swap";
document.head.appendChild(fontLink);

const iconLink = document.createElement("link");
iconLink.rel = "stylesheet";
iconLink.href =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap";
document.head.appendChild(iconLink);

const style = document.createElement("style");
style.textContent = `
  /* ── CSS Custom Properties (light mode) ─────────────────────────────────── */
  :root {
    --c-surface:              #fcf9f8;
    --c-surface-dim:          #dcd9d9;
    --c-surface-low:          #f6f3f2;
    --c-surface-container:    #f0eded;
    --c-surface-high:         #eae7e7;
    --c-surface-highest:      #e4e2e1;
    --c-surface-lowest:       #ffffff;
    --c-primary:              #000000;
    --c-on-primary:           #ffffff;
    --c-primary-container:    #1c1b1b;
    --c-on-primary-container: #858383;
    --c-secondary:            #735c00;
    --c-secondary-container:  #fed65b;
    --c-on-secondary:         #ffffff;
    --c-on-surface:           #1b1c1c;
    --c-on-surface-variant:   #444748;
    --c-outline:              #747878;
    --c-outline-variant:      #c4c7c7;
    --c-error:                #ba1a1a;
    --c-error-container:      #ffdad6;
    --c-inverse-surface:      #303030;
    --c-inverse-on-surface:   #f3f0f0;

    /* ── Badge tokens ──────────────────────────────────────────────────────── */
    --badge-vip-bg:           #fed65b;
    --badge-vip-fg:           #735c00;
    --badge-neutral-bg:       #f0eded;
    --badge-neutral-fg:       #444748;
    --badge-new-bg:           #e4e2e1;
    --badge-new-fg:           #1b1c1c;
    --badge-error-bg:         #ffdad6;
    --badge-error-fg:         #ba1a1a;
    --badge-success-bg:       #dcfce7;
    --badge-success-fg:       #166534;
    --badge-warning-bg:       #fed65b;
    --badge-warning-fg:       #735c00;
  }

  /* ── Dark Mode overrides ─────────────────────────────────────────────────── */
  body.dark-mode {
    --c-surface:              #121212;
    --c-surface-dim:          #0a0a0a;
    --c-surface-low:          #1a1a1a;
    --c-surface-container:    #222222;
    --c-surface-high:         #2a2a2a;
    --c-surface-highest:      #333333;
    --c-surface-lowest:       #1e1e1e;
    --c-primary:              #e4e2e1;
    --c-on-primary:           #1b1c1c;
    --c-primary-container:    #2e2e2e;
    --c-on-primary-container: #9aa0a0;
    --c-secondary:            #f0c040;
    --c-secondary-container:  #3a2f00;
    --c-on-secondary:         #1b1c1c;
    --c-on-surface:           #e4e2e1;
    --c-on-surface-variant:   #9aa0a0;
    --c-outline:              #6b6e6e;
    --c-outline-variant:      #3a3d3d;
    --c-error:                #ffb4ab;
    --c-error-container:      #93000a;
    --c-inverse-surface:      #e4e2e1;
    --c-inverse-on-surface:   #303030;

    /* ── Badge tokens (dark) ───────────────────────────────────────────────── */
    --badge-vip-bg:           #3a2f00;
    --badge-vip-fg:           #fed65b;
    --badge-neutral-bg:       #2a2a2a;
    --badge-neutral-fg:       #9aa0a0;
    --badge-new-bg:           #333333;
    --badge-new-fg:           #c4c7c7;
    --badge-error-bg:         #93000a;
    --badge-error-fg:         #ffb4ab;
    --badge-success-bg:       #0a2e1a;
    --badge-success-fg:       #6ee79e;
    --badge-warning-bg:       #3a2f00;
    --badge-warning-fg:       #fed65b;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--c-surface);
    color: var(--c-on-surface);
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    transition: background 0.2s ease, color 0.2s ease;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Geist', 'Inter', sans-serif;
  }

  .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
    font-family: 'Material Symbols Outlined';
    font-style: normal;
    font-size: 22px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
  }

  .glass {
    backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(45, 45, 45, 0.05);
  }
  body.dark-mode .glass {
    background: rgba(30, 30, 30, 0.85);
    border-color: rgba(255,255,255,0.06);
  }

  .card {
    background: var(--c-surface-lowest);
    border-radius: 24px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(27, 28, 28, 0.05);
    transition: background 0.2s ease, border-color 0.2s ease;
  }
  body.dark-mode .card {
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    border-color: rgba(255,255,255,0.07);
  }

  .scrollbar-thin::-webkit-scrollbar { width: 4px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--c-outline-variant); border-radius: 10px; }

  input, textarea, select {
    background: var(--c-surface-low);
    color: var(--c-on-surface);
    border-color: var(--c-outline-variant);
    transition: background 0.2s ease, color 0.2s ease;
  }
  input:focus { outline: none; }
  button { cursor: pointer; border: none; background: none; -webkit-tap-highlight-color: transparent; }
  a { text-decoration: none; color: inherit; }

  /* Mobile-friendly touch targets */
  @media (max-width: 768px) {
    button { min-height: 40px; }
    input  { min-height: 44px; font-size: 16px; /* prevent iOS zoom */ }
  }

  /* Horizontal scroll for overflow containers */
  .scroll-x { overflow-x: auto; -webkit-overflow-scrolling: touch; }

  /* ── Animations ──────────────────────────────────────────────────────────── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.4s ease; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  .pulse { animation: pulse 1.5s ease-in-out infinite; }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .spin { animation: spin 0.7s linear infinite; }

  @keyframes pulse-gold {
    0%,100% { box-shadow: 0 0 0 0 rgba(115, 92, 0, 0.3); }
    50%      { box-shadow: 0 0 0 8px rgba(115, 92, 0, 0); }
  }
  .pulse-gold { animation: pulse-gold 2s infinite; }

  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  .shimmer {
    background: linear-gradient(
      90deg,
      var(--c-surface-container) 25%,
      var(--c-surface-high) 50%,
      var(--c-surface-container) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s ease infinite;
  }

  /* ── Typography utilities ────────────────────────────────────────────────── */
  .t-label {
    font-family: 'Geist', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--c-primary);
  }
  .t-meta {
    font-family: 'Geist', sans-serif;
    font-size: 11px;
    color: var(--c-on-surface-variant);
  }
  .t-overline {
    font-family: 'Geist', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--c-on-surface-variant);
  }
  .t-value {
    font-family: 'Geist', sans-serif;
    font-size: 32px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--c-primary);
  }
  .t-title {
    font-family: 'Geist', sans-serif;
    font-size: 24px;
    font-weight: 500;
    color: var(--c-primary);
  }
  .t-body {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    color: var(--c-on-surface);
  }

  /* ── Recharts dark mode ──────────────────────────────────────────────────── */
  body.dark-mode .recharts-cartesian-grid line { stroke: rgba(255,255,255,0.06); }
  body.dark-mode .recharts-tooltip-wrapper .recharts-default-tooltip {
    background: #1e1e1e !important;
    border-color: rgba(255,255,255,0.1) !important;
    color: #e4e2e1 !important;
  }

  /* ── Table rows dark ─────────────────────────────────────────────────────── */
  body.dark-mode table thead tr { background: var(--c-surface-low) !important; }
  body.dark-mode table tbody tr:hover { background: var(--c-surface-high) !important; }
`;
document.head.appendChild(style);