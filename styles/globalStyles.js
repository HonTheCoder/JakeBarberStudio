import { C } from "../tokens/design";

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
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${C.surface};
    color: ${C.onSurface};
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
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

  .card {
    background: #fff;
    border-radius: 24px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(27, 28, 28, 0.05);
  }

  .scrollbar-thin::-webkit-scrollbar { width: 4px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: ${C.outlineVariant}; border-radius: 10px; }

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
  .fade-up { animation: fadeUp 0.4s ease forwards; }

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
      ${C.surfaceContainer} 25%,
      ${C.surfaceHigh} 50%,
      ${C.surfaceContainer} 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s ease infinite;
  }

  /* ── Typography utilities ────────────────────────────────────────────────── */
  .t-label {
    font-family: 'Geist', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: ${C.primary};
  }
  .t-meta {
    font-family: 'Geist', sans-serif;
    font-size: 11px;
    color: ${C.onSurfaceVariant};
  }
  .t-overline {
    font-family: 'Geist', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${C.onSurfaceVariant};
  }
  .t-value {
    font-family: 'Geist', sans-serif;
    font-size: 32px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: ${C.primary};
  }
  .t-title {
    font-family: 'Geist', sans-serif;
    font-size: 24px;
    font-weight: 500;
    color: ${C.primary};
  }
  .t-body {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    color: ${C.onSurface};
  }
`;
document.head.appendChild(style);