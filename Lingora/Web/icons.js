const iconPaths = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.3"/><rect x="14" y="3" width="7" height="7" rx="1.3"/><rect x="3" y="14" width="7" height="7" rx="1.3"/><rect x="14" y="14" width="7" height="7" rx="1.3"/>',
  book:'<path d="M3 4.5c3.4-.5 6.2.4 9 2.5 2.8-2.1 5.6-3 9-2.5V19c-3.4-.3-6.2.5-9 2-2.8-1.5-5.6-2.3-9-2z"/><path d="M12 7v14"/>',
  library:'<path d="M4 4h3v16H4zM10 4h3v16h-3zM15.5 5l3-.7 3.2 15.2-3 .7z"/>',
  chat:'<path d="M4 5h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M9 19h7l4 2v-4a2 2 0 0 0 2-2v-5"/>',
  pencil:'<path d="m4 16-1 5 5-1L20 8l-4-4zM14 6l4 4M3 21h8"/>',
  notebook:'<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M9 3v18M3 7h4M3 12h4M3 17h4M12 8h5"/>',
  chart:'<path d="M4 3v17h17M8 16v-4m5 4V8m5 8V5"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',down:'<path d="m6 9 6 6 6-6"/>',back:'<path d="M20 12H5m6 6-6-6 6-6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  fire:'<path d="M13.1 2c.7 4.5-2.6 5.2-2.1 9.2-1.9-.6-2.8-2.1-3-4.1-3.1 3.3-4.6 6-3.3 9.7 1.1 3.2 4 5 7.6 5s7.3-2.4 7.3-7.2C19.6 9.8 16.2 7.4 13.1 2z"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',sound:'<path d="m11 4-6 5H2v6h3l6 5zM15 8a5.5 5.5 0 0 1 0 8m3-11a9.5 9.5 0 0 1 0 14"/>',
  spark:'<path d="m12 2 2.1 7.9L22 12l-7.9 2.1L12 22l-2.1-7.9L2 12l7.9-2.1z"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',cap:'<path d="m2 9 10-5 10 5-10 5zM6 11v5c3 3 9 3 12 0v-5m4-2v6"/>',
  menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',close:'<path d="m5 5 14 14M19 5 5 19"/>',check:'<path d="m4 12 5 5L20 6"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',layers:'<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  play:'<path d="m8 4 12 8-12 8z"/>',settings:'<path d="M3 7h8m5 0h5M3 17h4m5 0h9"/><circle cx="13" cy="7" r="2.5"/><circle cx="10" cy="17" r="2.5"/>',
  repeat:'<path d="M3 10a8 8 0 0 1 14-4l3 3m0-6v6h-6m7 5a8 8 0 0 1-14 4l-3-3m0 6v-6h6"/>',keyboard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 9h1m3 0h1m3 0h1m3 0h1M6 14h2m3 0h6"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',headphones:'<path d="M3 15v-3a9 9 0 0 1 18 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>',
  mark:'<path d="M4 3h14v18l-7-4-7 4z"/>',plus:'<path d="M4 12h16M12 4v16"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>'
};
function icon(name,size=20){return '<svg class="icon" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+iconPaths[name]+'</svg>'}
