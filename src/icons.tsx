export function Icon({ name }: { name: string }) {
  return <svg className="icon" aria-hidden="true"><use href={'#i-' + name} /></svg>;
}

export function IconDefinitions() {
  return (
  <svg className="svg-defs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<symbol id="i-overview" viewBox="0 0 24 24"><path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z"/></symbol>
<symbol id="i-policy" viewBox="0 0 24 24"><path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8m-8 4h6"/></symbol>
<symbol id="i-markets" viewBox="0 0 24 24"><path d="M3 3v18h18M7 15l4-7 4 4 6-8"/></symbol>
<symbol id="i-forecasts" viewBox="0 0 24 24"><path d="M4 20h16M7 15V8m5 9V4m5 12v-6M4 6l4-3m6 3 6-3"/></symbol>
<symbol id="i-data" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/></symbol>
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></symbol>
<symbol id="i-filter" viewBox="0 0 24 24"><path d="M3 5h18M6 12h12m-8 7h4"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="12" r="2"/></symbol>
<symbol id="i-download" viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></symbol>
<symbol id="i-expand" viewBox="0 0 24 24"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/></symbol>
<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></symbol>
<symbol id="i-rail" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m7-11-3 3 3 3"/></symbol>
<symbol id="i-bank" viewBox="0 0 24 24"><path d="m3 9 9-5 9 5H3Zm1 10h16M7 12v4m5-4v4m5-4v4"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></symbol>
<symbol id="i-file" viewBox="0 0 24 24"><path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8m-8 4h6"/></symbol>
<symbol id="i-bookmark" viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M4 12h16m-6-6 6 6-6 6"/></symbol>
<symbol id="i-close" viewBox="0 0 24 24"><path d="m6 6 12 12M6 18 18 6"/></symbol>
<symbol id="i-menu" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></symbol>
<symbol id="i-calendar" viewBox="0 0 24 24"><path d="M4 5h16v16H4zM8 2v6m8-6v6M4 10h16M8 14h2m4 0h2m-8 3h2"/></symbol>
<symbol id="i-compare" viewBox="0 0 24 24"><path d="M3 4h7v16H3zm11 0h7v16h-7M6 8h1m-1 4h1m-1 4h1m10-8h1m-1 4h1m-1 4h1"/></symbol>
<symbol id="i-chevron" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></symbol>
<symbol id="i-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-link" viewBox="0 0 24 24"><path d="M10 13.5a4 4 0 0 0 5.7 0l3.1-3.1a4 4 0 0 0-5.7-5.7l-1.7 1.7m2.6 4.1a4 4 0 0 0-5.7 0l-3.1 3.1a4 4 0 0 0 5.7 5.7l1.7-1.7"/></symbol>
<symbol id="i-guide" viewBox="0 0 24 24"><path d="M3 5h6l3 2 3-2h6v14h-6l-3 2-3-2H3zM12 7v14"/></symbol>
</svg>
  );
}
