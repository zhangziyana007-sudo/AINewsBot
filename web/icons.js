/**
 * 多色 SVG 图标集 — PlantCare 鼠尾草绿主题
 * 深绿 #2D4A2D / 中绿 #4A7A4A / 浅绿底 #C5D8BC
 */
const ICONS = {
  // ── 底部导航栏图标（22x22）──
  navReport: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="2" width="14" height="20" rx="2" fill="#C5D8BC"/>
    <rect x="4" y="2" width="14" height="20" rx="2" stroke="#2D4A2D" stroke-width="1.5" fill="none"/>
    <path d="M14 2v4a2 2 0 0 0 2 2h2" stroke="#2D4A2D" stroke-width="1.5" fill="none"/>
    <rect x="8" y="10" width="2" height="8" rx="1" fill="#4A7A4A"/>
    <rect x="11" y="7" width="2" height="11" rx="1" fill="#2D4A2D"/>
  </svg>`,
  navPreview: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="2" fill="#C5D8BC"/>
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="#2D4A2D" stroke-width="1.5" fill="none"/>
    <circle cx="9" cy="9" r="2" fill="#4A7A4A"/>
    <path d="M6 21l5-5a2 2 0 0 1 2.8 0L21 15" stroke="#2D4A2D" stroke-width="1.5" fill="none"/>
  </svg>`,
  navLearn: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M5 8l6 6" stroke="#4A7A4A" stroke-width="2" stroke-linecap="round"/>
    <path d="M4 14l6-6 2-3" stroke="#2D4A2D" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M2 5h12" stroke="#2D4A2D" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M7 2h1" stroke="#2D4A2D" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M22 22l-5-10-5 10" stroke="#2D4A2D" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M14 18h6" stroke="#4A7A4A" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  navXhs: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" fill="#C5D8BC"/>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" stroke="#2D4A2D" stroke-width="1.5" fill="none"/>
    <polyline points="16 6 12 2 8 6" stroke="#4A7A4A" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="12" y1="2" x2="12" y2="15" stroke="#4A7A4A" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  navSettings: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" fill="#4A7A4A"/>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" fill="#C5D8BC" stroke="#2D4A2D" stroke-width="1.5"/>
  </svg>`,

  // ── 页面标题图标（24x24 内嵌式）──
  titleLeaf: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.5" fill="#C5D8BC"/>
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.5" stroke="#2D4A2D" stroke-width="1.5" fill="none"/>
    <path d="M6.5 12.5C10 10.5 12 7 17 8" stroke="#4A7A4A" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  titleBook: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" fill="#C5D8BC" stroke="#2D4A2D" stroke-width="1.5"/>
    <path d="M8 7h8" stroke="#4A7A4A" stroke-width="2" stroke-linecap="round"/>
    <path d="M8 11h5" stroke="#4A7A4A" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  titlePhone: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="2" width="14" height="20" rx="3" fill="#C5D8BC" stroke="#2D4A2D" stroke-width="1.5"/>
    <line x1="9" y1="18" x2="15" y2="18" stroke="#4A7A4A" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="6" r="1" fill="#4A7A4A"/>
  </svg>`,
  titleGear: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" fill="#4A7A4A"/>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" fill="#C5D8BC" stroke="#2D4A2D" stroke-width="1.5"/>
  </svg>`,

  // ── 问候图标（28x28）──
  greetMoon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#C5D8BC" stroke="#2D4A2D" stroke-width="1.5"/>
    <circle cx="14" cy="9" r="1" fill="#4A7A4A"/>
    <circle cx="10" cy="14" r="0.8" fill="#4A7A4A"/>
  </svg>`,
  greetSun: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="5" fill="#F5D76E" stroke="#D4A017" stroke-width="1.5"/>
    <g stroke="#D4A017" stroke-width="1.5" stroke-linecap="round">
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </g>
  </svg>`,
  greetCloud: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <circle cx="10" cy="10" r="4" fill="#F5D76E" stroke="#D4A017" stroke-width="1.5"/>
    <g stroke="#D4A017" stroke-width="1.5" stroke-linecap="round">
      <line x1="10" y1="2" x2="10" y2="3.5"/><line x1="3" y1="10" x2="4.5" y2="10"/>
      <line x1="4.93" y1="4.93" x2="6" y2="6"/>
    </g>
    <path d="M13 17.5a3.5 3.5 0 0 0-6.74-1.36A2.5 2.5 0 0 0 7 21h9a3 3 0 0 0 .08-6A4.97 4.97 0 0 0 13 12" fill="#C5D8BC" stroke="#2D4A2D" stroke-width="1.3"/>
  </svg>`,
  greetLeaf: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.5" fill="#C5D8BC"/>
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.5" stroke="#2D4A2D" stroke-width="1.5" fill="none"/>
    <path d="M6.5 12.5C10 10.5 12 7 17 8" stroke="#4A7A4A" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  // ── 功能图标（16x16）──
  checkmark: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#C5D8BC" stroke="#2D4A2D" stroke-width="1.5"/>
    <path d="M8 12l3 3 5-6" stroke="#2D4A2D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  cancel: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.5"/>
    <path d="M15 9l-6 6M9 9l6 6" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  visible: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" fill="#C5D8BC" stroke="#2D4A2D" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="3" fill="#4A7A4A" stroke="#2D4A2D" stroke-width="1"/>
  </svg>`,
  link: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#4A7A4A" stroke-width="2" stroke-linecap="round"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#2D4A2D" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
};

// 辅助函数：生成内联图标 HTML
function icon(name, opts = {}) {
  const svg = ICONS[name];
  if (!svg) return '';
  const style = [];
  if (opts.size) {
    style.push(`width:${opts.size}px;height:${opts.size}px`);
  }
  if (opts.valign !== undefined) {
    style.push(`vertical-align:${opts.valign}px`);
  }
  if (opts.ml) {
    style.push(`margin-left:${opts.ml}px`);
  }
  if (opts.mr) {
    style.push(`margin-right:${opts.mr}px`);
  }
  if (style.length === 0) return svg;
  // 将 style 注入到 svg 标签中
  return svg.replace('<svg ', `<svg style="${style.join(';')}" `);
}
