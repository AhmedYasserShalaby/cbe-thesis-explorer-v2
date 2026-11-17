/* Shared, deliberately small interface primitives. */
(function(){
  'use strict';
  const C=window.CBECore;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=n=>`<svg class="icon" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const fmt=(v,n=2)=>C.numeric(v)?(+v).toLocaleString('en-GB',{minimumFractionDigits:n,maximumFractionDigits:n}):'—';
  const signed=(v,n=2)=>C.numeric(v)?(+v>0?'+':'')+fmt(v,n):'—';
  const pct=(v,n=1)=>C.numeric(v)?fmt(+v*100,n)+'%':'—';
  const date=s=>{if(!s)return'—';return new Date(s+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});};
  const period=s=>s.from.endsWith('-01-01')&&s.to.endsWith('-12-31')?(s.from.slice(0,4)===s.to.slice(0,4)?s.from.slice(0,4):s.from.slice(0,4)+'–'+s.to.slice(0,4)):date(s.from)+' – '+date(s.to);
  const scope=s=>`${date(s.from)} to ${date(s.to)}${s.action?' · '+{hike:'rate increases',hold:'rate holds',cut:'rate cuts',other:'notices / unresolved'}[s.action]:''}${s.cohort?' · '+(s.cohort==='in'?'analysis cohort':'outside analysis'):''}`;
  const empty=(heading,description,action='filters')=>`<div class="empty-state"><h3>${esc(heading)}</h3><p>${esc(description)}</p>${action?`<button class="quiet-button" data-action="${esc(action)}">${action==='filters'?'Change filters':'Reset selection'}</button>`:''}</div>`;
  function decision(d,m){const r=m.rates.get(d.id),a=m.action(d);return`<span class="decision ${a}"><span class="decision-arrow" aria-hidden="true">${{hike:'↑',cut:'↓',hold:'—',other:'·'}[a]}</span>${{hike:'Increase',cut:'Cut',hold:'Hold',other:d.type==='Administrative notice'?'Notice':'Unresolved'}[a]}${a!=='hold'&&a!=='other'&&C.numeric(r?.bps)?' '+signed(r.bps,0)+' bps':''}</span>`;}
  const status=d=>`<span class="badge ${d.inAnalysis?'eligible':'excluded'}">${d.inAnalysis?'In analysis':'Outside analysis'}</span>`;
  const actions=(id,title,available=true)=>`<div class="panel-actions"><button class="icon-button" data-action="expand-chart" data-chart="${id}" ${available?'':'disabled'} aria-label="Expand ${esc(title)}">${icon('expand')}</button><button class="icon-button" data-action="chart-export" data-chart="${id}" ${available?'':'disabled'} aria-label="Export ${esc(title)}">${icon('download')}</button><button class="icon-button" data-action="source" data-source="${id}" aria-label="Source and definition for ${esc(title)}">${icon('info')}</button></div>`;
  const forecastLegend=()=>'<div class="legend"><span><i style="--series:var(--numerical)"></i>● Numbers only [Num]</span><span><i style="--series:var(--text-added)" class="hatch"></i>▲ Numbers + text [+Text]</span><span><i style="--series:var(--zero-ref,var(--reference))" class="dash"></i>◇ Zero-return reference</span><span><i style="--series:var(--mean-ref,var(--reference))" class="dot"></i>+ Expanding-mean reference</span></div>';
  function simpleTable(headers,rows,caption=''){return`<div class="table-wrap"><table>${caption?`<caption>${esc(caption)}</caption>`:''}<thead><tr>${headers.map((h,i)=>`<th scope="col" class="${i===0?'text-cell':''}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>{const cells=Array.isArray(r)?r:r.cells||[],cls=!Array.isArray(r)&&r.className?` class="${esc(r.className)}"`:'',cur=!Array.isArray(r)&&r.current?' aria-current="true"':'';return`<tr tabindex="0"${cls}${cur}>${cells.map((v,i)=>`<td class="${i===0?'text-cell':''}" data-label="${esc(headers[i]||'')}">${v??'—'}</td>`).join('')}</tr>`;}).join('')}</tbody></table></div>`;}
  function statsRows(groups){
    const hasWhiskers=groups.some(g=>g.stats&&'whiskerLow' in g.stats);
    return groups.map(g=>hasWhiskers?{
      Series:g.label,n:g.stats.n,mean:g.stats.mean,median:g.stats.median,sd:g.stats.sd,
      min:g.stats.min,low_whisker_1_5_iqr:g.stats.whiskerLow,q1:g.stats.q1,q3:g.stats.q3,high_whisker_1_5_iqr:g.stats.whiskerHigh,max:g.stats.max,
      outliers:g.stats.outliers?g.stats.outliers.length:0
    }:{Series:g.label,n:g.stats.n,mean:g.stats.mean,median:g.stats.median,sd:g.stats.sd,min:g.stats.min,q1:g.stats.q1,q3:g.stats.q3,max:g.stats.max});
  }
  function statsTable(groups,caption,unit=''){
    const hasWhiskers=groups.some(g=>g.stats&&'whiskerLow' in g.stats);
    const headers=hasWhiskers
      ?['Series','n','Mean'+unit,'Median'+unit,'SD'+unit,'Min'+unit,'Low whisker (1.5×IQR)'+unit,'Q1'+unit,'Q3'+unit,'High whisker (1.5×IQR)'+unit,'Max'+unit]
      :['Series','n','Mean'+unit,'Median'+unit,'SD'+unit,'Min'+unit,'Q1'+unit,'Q3'+unit,'Max'+unit];
    const keys=hasWhiskers?['mean','median','sd','min','whiskerLow','q1','q3','whiskerHigh','max']:['mean','median','sd','min','q1','q3','max'];
    return simpleTable(headers,groups.map(g=>[esc(g.label),fmt(g.stats.n,0),...keys.map(k=>fmt(g.stats[k],3))]),caption);
  }
  window.CBEUI={esc,icon,fmt,signed,pct,date,period,scope,empty,decision,status,actions,forecastLegend,simpleTable,renderTable:simpleTable,statsRows,statsTable};
})();
