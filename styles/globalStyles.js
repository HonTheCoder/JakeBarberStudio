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
    --c-on-error:             #ffffff;
    --c-error-container:      #ffdad6;
    --c-inverse-surface:      #303030;
    --c-inverse-on-surface:   #f3f0f0;

    /* ── Accent — interactive & data-viz color (chart bars, hover states,
       active cursors). Warm gold-bronze instead of flat black. ───────────── */
    --c-accent:               #8a6a12;
    --c-accent-hover:         #6e5410;
    --c-accent-soft:          rgba(138, 106, 18, 0.12);
    --c-on-accent:            #ffffff;

    /* ── Chart palette (always warm/neutral tones, never pure black) ────────── */
    --c-chart-1:              #8a6a12;
    --c-chart-2:              #c79a2e;
    --c-chart-3:              #e0b94a;
    --c-chart-4:              #8c8c8c;
    --c-chart-5:              #52504a;

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
    --badge-info-bg:          #eff6ff;
    --badge-info-fg:          #0369a1;
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
    --c-on-error:             #690005;
    --c-error-container:      #93000a;
    --c-inverse-surface:      #e4e2e1;
    --c-inverse-on-surface:   #303030;

    /* ── Accent — interactive & data-viz color (dark mode) ───────────────── */
    --c-accent:               #f0c040;
    --c-accent-hover:         #f7d670;
    --c-accent-soft:          rgba(240, 192, 64, 0.16);
    --c-on-accent:            #1b1c1c;

    /* ── Chart palette (dark) ────────────────────────────────────────────── */
    --c-chart-1:              #f0c040;
    --c-chart-2:              #d4af37;
    --c-chart-3:              #a67c1a;
    --c-chart-4:              #9aa0a0;
    --c-chart-5:              #c4c7c7;

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
    --badge-info-bg:          #0c2a3d;
    --badge-info-fg:          #7cc4f2;
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

  /* ── Recharts — light mode ───────────────────────────────────────────────── */
  .recharts-cartesian-grid line { stroke: var(--c-outline-variant); opacity: 0.35; }
  .recharts-tooltip-wrapper .recharts-default-tooltip {
    background: var(--c-surface-lowest) !important;
    border-color: var(--c-outline-variant) !important;
    color: var(--c-on-surface) !important;
    border-radius: 10px !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
  }
  /* Recharts defaults its hover cursor & active bar/dot to black — override
     globally so no chart in the app ever flashes a flat black on hover. */
  .recharts-tooltip-cursor { fill: var(--c-accent-soft) !important; stroke: none !important; }
  .recharts-active-bar { fill-opacity: 0.85 !important; }
  .recharts-line-dot, .recharts-dot { stroke: var(--c-accent) !important; }
  .recharts-surface { outline: none; }

  /* ── Recharts — dark mode ────────────────────────────────────────────────── */
  body.dark-mode .recharts-cartesian-grid line { stroke: rgba(255,255,255,0.08); opacity: 1; }
  body.dark-mode .recharts-tooltip-wrapper .recharts-default-tooltip {
    background: var(--c-surface-high) !important;
    border-color: rgba(255,255,255,0.12) !important;
    color: var(--c-on-surface) !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.45) !important;
  }
  body.dark-mode .recharts-text { fill: var(--c-on-surface-variant); }

  /* ── Themed focus ring (replaces default browser black/blue outline) ────── */
  button:focus-visible, a:focus-visible {
    outline: 2px solid var(--c-accent);
    outline-offset: 2px;
    border-radius: 6px;
  }
  input:focus-visible, textarea:focus-visible, select:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--c-accent-soft);
  }

  ::selection { background: var(--c-accent-soft); color: var(--c-on-surface); }

  /* ── Table rows dark ─────────────────────────────────────────────────────── */
  body.dark-mode table thead tr { background: var(--c-surface-low) !important; }
  body.dark-mode table tbody tr:hover { background: var(--c-surface-high) !important; }

  /* ── Login Page — 3D / motion utilities ─────────────────────────────────── */
  @keyframes floatBlob1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%      { transform: translate(30px, -40px) scale(1.12); }
    66%      { transform: translate(-20px, 20px) scale(0.94); }
  }
  @keyframes floatBlob2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%      { transform: translate(-40px, 30px) scale(1.1); }
  }
  @keyframes floatBlob3 {
    0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
    50%      { transform: translate(-50%, -50%) translate(15px, -20px) rotate(8deg); }
  }
  .login-blob-1 { animation: floatBlob1 13s ease-in-out infinite; }
  .login-blob-2 { animation: floatBlob2 16s ease-in-out infinite; }
  .login-blob-3 { animation: floatBlob3 20s ease-in-out infinite; }

  @keyframes loginFadeUp {
    from { opacity: 0; transform: translateY(28px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .login-fade-in { animation: loginFadeUp 0.7s cubic-bezier(.16,1,.3,1) both; }

  @keyframes loginPulseRing {
    0%   { box-shadow: 0 0 0 0 rgba(115,92,0,0.35); }
    70%  { box-shadow: 0 0 0 10px rgba(115,92,0,0); }
    100% { box-shadow: 0 0 0 0 rgba(115,92,0,0); }
  }
  .login-logo-ring { animation: loginPulseRing 2.6s ease-out infinite; }

  @keyframes shineSweep {
    0%   { transform: translateX(-160%) skewX(-20deg); }
    100% { transform: translateX(260%) skewX(-20deg); }
  }
  .login-btn-shine { position: relative; overflow: hidden; }
  .login-btn-shine::after {
    content: "";
    position: absolute;
    top: 0; left: 0;
    width: 40%; height: 100%;
    background: linear-gradient(120deg, transparent, rgba(255,255,255,0.35), transparent);
    transform: translateX(-160%) skewX(-20deg);
    pointer-events: none;
  }
  .login-btn-shine:hover::after,
  .login-btn-shine:focus-visible::after { animation: shineSweep 1s ease; }

  /* Mouse-reactive spotlight + true 3D tilt, driven by --mx/--my/--rx/--ry custom props set inline */
  .login-card-3d {
    transform-style: preserve-3d;
    will-change: transform;
    position: relative;
    transform: perspective(1200px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  }
  .login-card-3d::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.18), transparent 55%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  .login-card-3d:hover::before { opacity: 1; }
  body.dark-mode .login-card-3d::before {
    background: radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.09), transparent 55%);
  }

  .login-input-row {
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  }
  .login-input-row:focus-within {
    border-color: var(--c-primary) !important;
    box-shadow: 0 0 0 3px rgba(0,0,0,0.05);
  }
  body.dark-mode .login-input-row:focus-within {
    box-shadow: 0 0 0 3px rgba(255,255,255,0.06);
  }

  .login-eye-btn {
    display: flex; align-items: center; justify-content: center;
    padding: 4px; border-radius: 8px; flex-shrink: 0;
    transition: background 0.15s ease, opacity 0.15s ease;
    opacity: 0.55;
  }
  .login-eye-btn:hover { opacity: 1; background: var(--c-surface-low); }

  @media (max-width: 480px) {
    .login-card-3d { padding: 26px 20px !important; transform: none !important; }
    .login-card-3d::before { display: none; }
  }
`;
document.head.appendChild(style);