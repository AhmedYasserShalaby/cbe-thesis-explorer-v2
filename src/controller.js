import { createTables } from './research/tables';
import { createWorkspaces } from './research/workspaces';
import { loadSnapshot } from './research/snapshot';
import { normalizeState, parseRoute, route, walkthroughSteps } from './research/routes';

/* CBE Thesis Explorer — local research workstation. No fitting or remote requests. */
export function startExplorer(renderWorkspace, renderSearch) {
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const C=window.CBECore,U=window.CBEUI,V=window.CBECharts,D=window.THESIS_DATA,M=window.THESIS_MARKET,X=window.THESIS_DESCRIPTIVE;
  if(!C||!U||!V||!D||!M||!X||!window.echarts){$('#fatal-error').hidden=false;$('#fatal-error').textContent='A bundled application file could not load. Keep the complete Website folder together, then reopen index.html.';return;}
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let viewAnimation;
  let lastView;
  motionPreference.addEventListener('change', event => {
    if (event.matches) viewAnimation?.cancel();
  });

  const scrollTop = () => window.scrollY;
  history.scrollRestoration = 'manual';
  const {esc,icon,fmt,signed,date}=U,model=loadSnapshot();
  let state=parseRoute(location.hash),selected=null,renderFrame=null,policyTimer=null,toastTimer=null,openedInspectorViaPush=false,openedComparisonViaPush=false;
  const defaultDates = { from: '2020-01-01', to: '2026-12-31' };
  const defaultLocal = {
    policyTab: 'statements', policyQuery: '', policyLanguage: '', policyType: '',
    marketTab: 'history', dataTab: 'coverage', referenceTable: 'table_4_1',
    forecastScope: 'saved', forecastTab: 'benchmarks', forecastSector: 'banks', forecastEvent: null,
  };
  const local = { ...defaultLocal };
  const chartPaints = new Map();
  const scrollPositions=new Map(),chartInstances=new Map(),chartJobs=new Map(),sources=new Map(),zoomState=new Map(),dialogFocus=new Map(),silentClose=new Set();
  const keyboardIndices=new Map();
  let pendingFocusReturn=null,lastTriggerDescriptor=null;
  let renderGeneration=0;
  const performanceLog=[],runtimeErrors=[],viewKey='cbe-research-workstation.views.v1';
  let storageAvailable=true,savedViews=[];

  function readStorage(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{storageAvailable=false;return fallback;}}
  function writeStorage(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{storageAvailable=false;return false;}}

  const railPreference = 'cbe-research-workstation.compact-rail';

  function setCompactRail(compact) {
    document.body.toggleAttribute('data-compact-rail', compact);
    const toggle = $('#rail-toggle');
    const label = compact ? 'Expand navigation' : 'Collapse navigation';
    toggle.setAttribute('aria-expanded', String(!compact));
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  }

  let printing = false;

  function activePalette() {
    return printing ? V.palettes.light : V.palettes.dark;
  }

  savedViews=readStorage(viewKey,[]);if(!Array.isArray(savedViews))savedViews=[];savedViews=savedViews.filter(v=>v&&typeof v.name==='string'&&v.state);
  const labels = {
    overview: ['Do central bank statements improve stock-return forecasts?', 'Evidence from Central Bank of Egypt statements and Egyptian bank and real estate stock indices.'],
    walkthrough: ['Walkthrough', 'Follow one policy announcement from the source statement to the saved forecasts.'],
    policy: ['Policy & statements', 'Find Central Bank of Egypt releases, decisions and source documents.'],
    markets: ['Markets', 'Explore index prices, daily returns and the first trading session after policy meetings.'],
    forecasts: ['Forecast results', 'Compare forecasts with simple benchmarks and see what changed when models used statement wording.'],
    data: ['Data & methods', 'See how meetings entered the study and open the research files.'],
  };

  function forecastState() {
    if (state.page !== 'forecasts' || local.forecastScope === 'filtered') return state;
    return { ...state, from: model.docs[0].date, to: model.docs.at(-1).date, action: '', cohort: '' };
  }

  function evaluationScope() {
    const name = C.CASES[state.sample];
    return local.forecastScope === 'saved' ? name + ' · saved evaluation' : name + ' · filtered meetings · ' + U.scope(state);
  }

  function scopeLabel() {
    return state.page === 'forecasts' ? evaluationScope() : U.scope(state);
  }

  const ctx={model,local,chartJobs,sources,state:()=>state,forecastState,scope:scopeLabel,
    selectedId:()=>selected,setSelected:id=>{selected=id;},patch,render,selectMeeting,openForecastFamily,openDialog,closeDialog,revealChart,
    download,toast,syncRoute,sourceMetadata:chartContext,tables:null,readers:null,views:null};
  ctx.tables=createTables(ctx);ctx.readers=window.CBEReaders({...ctx,state:forecastState});ctx.views=createWorkspaces(ctx);

  sources.set('study',{title:'Study scope & sources',definition:'Does Central Bank Communication Improve Stock-Market Return Forecasts? Evidence from Egyptian Banks and Real Estate Sectors. A local reader of retained documents, Refinitiv closes and saved first-session predictions.',scope:'Full retained study · 2005–2026 documents / 1998–2026 available price history',population:'176 documents; 155 matched English meetings; 310 sector outcomes. Prediction rows repeat meetings across variants, sectors and overlapping evaluations.',files:[...X.manifest.files,{href:'data/original_text_inventory.csv',label:'Original document inventory'},{href:'data/daily_prices.csv',label:'Daily instrument-date records'},{href:'data/predictions.csv',label:'Saved prediction source'},{href:'data/metrics.csv',label:'Original full-sample metrics'},{href:'data/paired_text_differences.csv',label:'Original paired comparisons'}],limits:['Retrospective and exploratory. Original release clocks and historical text vintages are unverified; earlier outcomes and results were inspected.','Small dependent samples and overlapping evaluations are not independent tests. The sector-index definition changes in January 2020.','Observed rate actions are not measured policy surprises. Event timing alone does not identify a causal wording effect.','Text components are not validated sentiment scores. No reliable live forecasting or profitability claim.','Before levels are implications; November 2009 is conditional continuity. Source completeness is not certified.']});
  sources.set('sample-flow',{title:'Full-study sample transition',rows:X.tables.table_4_1,definition:'Full notebook inventory/exclusion populations, independent of current filters. Full history: 155 meetings, 36 initial training, 119 evaluation per sector. Modern: 56 meetings, 20 initial training, 36 evaluation per sector.',scope:'Fixed full-study definitions',files:['data/chapter4/table_4_1.csv','data/chapter4/table_4_7.csv','data/common_event_cohort.csv'],limits:['The 56 modern meetings are included in the full-history sample; do not sum the evaluations as independent observations.']});

  function captureLocalRoute() {
    const p = new URLSearchParams(location.hash.split('?')[1] || '');
    const oneOf = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
    if (state.page === 'overview' && p.get('series') === 'deposit') {
      state = { ...state, page: 'policy' };
      p.set('view', 'rates');
    }
    if (state.page === 'markets') local.marketTab = oneOf(p.get('view'), ['history', 'daily', 'event', 'linked'], 'history');
    if (state.page === 'data') {
      local.dataTab = oneOf(p.get('dataView'), ['coverage', 'tables', 'methods'], 'coverage');
      local.referenceTable = Object.hasOwn(X.tables, p.get('table')) ? p.get('table') : 'table_4_1';
    }
    if (state.page === 'forecasts') {
      // Links written by the dashboard included a sector, even with the default date selection.
      const legacyFiltered = ['from', 'to', 'action', 'cohort', 'sector', 'event'].some(key => p.has(key));
      local.forecastScope = oneOf(p.get('scope'), ['saved', 'filtered'], legacyFiltered ? 'filtered' : 'saved');
      local.forecastTab = oneOf(p.get('view'), ['benchmarks', 'text', 'meeting'], p.has('event') ? 'meeting' : 'benchmarks');
      local.forecastSector = oneOf(p.get('sector'), ['banks', 'real_estate'], 'banks');
      local.forecastEvent = C.dateValid(p.get('event')) ? p.get('event') : null;
    }
    if (state.page === 'policy') {
      local.policyTab = oneOf(p.get('view'), ['statements', 'records', 'rates'], 'statements');
      local.policyQuery = p.get('q') || '';
      local.policyLanguage = p.get('language') || '';
      local.policyType = p.get('type') || '';
    }
    selected = model.byId.has(p.get('meeting')) ? p.get('meeting') : null;
  }
  captureLocalRoute();

  function currentRoute() {
    const [page, q = ''] = route(state).slice(1).split('?');
    const p = new URLSearchParams(q);
    if (selected) p.set('meeting', selected);
    if (page === 'markets' && local.marketTab !== 'history') p.set('view', local.marketTab);
    if (page === 'data') {
      if (local.dataTab !== 'coverage') p.set('dataView', local.dataTab);
      if (local.dataTab === 'tables') p.set('table', local.referenceTable);
    }
    if (page === 'forecasts') {
      p.set('scope', local.forecastScope);
      if (local.forecastTab !== 'benchmarks') p.set('view', local.forecastTab);
      p.set('sector', local.forecastSector);
      if (local.forecastEvent) p.set('event', local.forecastEvent);
    }
    if (page === 'policy') {
      if (local.policyTab !== 'statements') p.set('view', local.policyTab);
      if (local.policyQuery) p.set('q', local.policyQuery);
      if (local.policyLanguage) p.set('language', local.policyLanguage);
      if (local.policyType) p.set('type', local.policyType);
    }
    if ($('#compare-dialog').open && ctx.readers.comparison.earlier) {
      p.set('compare', ctx.readers.comparison.earlier);
      p.set('compareSelected', ctx.readers.comparison.selected);
      p.set('compareMode', ctx.readers.comparison.mode);
    }
    return '#' + page + (p.size ? '?' + p : '');
  }

  function syncRoute(push = false, previousScroll = scrollTop()) {
    const hash = currentRoute();
    const info = { cbe: true, inspect: state.inspect, compare: $('#compare-dialog').open, scroll: scrollTop() };
    if (push && info.compare) openedComparisonViaPush = true;
    if (location.hash !== hash) {
      if (push && history.state?.cbe) history.replaceState({ ...history.state, scroll: previousScroll }, '', location.hash);
      (push ? history.pushState : history.replaceState).call(history, info, '', hash);
    } else if (!history.state?.cbe) {
      history.replaceState(info, '', hash);
    }
  }

  function fallbackFocus() {
    return $('#period-button').getClientRects().length ? $('#period-button') : $('#main');
  }

  function describeTrigger(el){
    if(!el||el===document.body||el===document.documentElement)return{element:null,selector:'#period-button',fallback:'#period-button'};
    if(el.closest?.('#sidebar')&&window.innerWidth<900){
      return{element:$('#menu-toggle'),selector:'#menu-toggle',fallback:'#menu-toggle'};
    }
    let selector=null;
    if(el.id){
      selector='#'+CSS.escape(el.id);
    }else if(el.dataset?.action){
      const a=CSS.escape(el.dataset.action);
      if(el.dataset.doc)selector=`[data-action="${a}"][data-doc="${CSS.escape(el.dataset.doc)}"]`;
      else if(el.dataset.chart)selector=`[data-action="${a}"][data-chart="${CSS.escape(el.dataset.chart)}"]`;
      else if(el.dataset.source)selector=`[data-action="${a}"][data-source="${CSS.escape(el.dataset.source)}"]`;
      else if(el.dataset.table)selector=`[data-action="${a}"][data-table="${CSS.escape(el.dataset.table)}"]`;
      else selector=`[data-action="${a}"]`;
    }else if(el.dataset?.page){
      selector=`[data-page="${CSS.escape(el.dataset.page)}"]`;
    }
    const fallback=el.dataset?.action==='filters'?'#period-button':el.dataset?.action==='inspect'?`[data-action="inspect"][data-doc="${CSS.escape(el.dataset.doc||'')}"]`:'#period-button';
    return{element:el,selector,fallback};
  }

  function resolveFocusDescriptor(desc){
    if(!desc)return fallbackFocus();
    if(desc.element?.isConnected&&desc.element.getClientRects().length&&!desc.element.closest('[inert]'))return desc.element;
    if(desc.selector){
      const found=$(desc.selector);
      if(found?.isConnected&&found.getClientRects().length&&!found.closest('[inert]'))return found;
    }
    if(desc.fallback){
      const fb=$(desc.fallback);
      if(fb?.isConnected&&fb.getClientRects().length&&!fb.closest('[inert]'))return fb;
    }
    return fallbackFocus();
  }

  function openDialog(id){
    const el=$('#'+id);if(el.open)return;
    const desc=lastTriggerDescriptor||describeTrigger(document.activeElement);
    lastTriggerDescriptor=null;
    dialogFocus.set(id,desc);
    el.showModal();
    document.body.style.overflow='hidden';
    if(id==='chart-dialog')requestAnimationFrame(()=>chartInstances.get('expanded')?.resize());
  }

  function closeDialog(id,silent=false){
    const el=$('#'+id);if(!el?.open)return;
    if(silent)silentClose.add(id);
    el.close();
  }

  function closeAll(silent=true){$$('dialog[open]').forEach(el=>closeDialog(el.id,silent));}

  $$('dialog').forEach(el=>{
    el.addEventListener('click',e=>{
      if(e.target!==el)return;
      const r=el.getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(el.id);
    });
    el.addEventListener('close',()=>{
      const silent=silentClose.has(el.id);silentClose.delete(el.id);
      if(!document.querySelector('dialog[open]'))document.body.style.overflow='';
      if(el.id==='chart-dialog'){chartInstances.get('expanded')?.dispose();chartInstances.delete('expanded');}
      const savedDesc=dialogFocus.get(el.id);
      if(el.id==='compare-dialog'&&!silent){
        if(openedComparisonViaPush&&history.state?.compare){
          openedComparisonViaPush=false;
          pendingFocusReturn=savedDesc;
          history.back();
          return;
        }else{
          syncRoute();
        }
      }
      if(el.id==='inspector-dialog'&&!silent&&state.inspect){
        if(openedInspectorViaPush&&history.state?.cbe){
          openedInspectorViaPush=false;
          pendingFocusReturn=savedDesc;
          history.back();
          return;
        }else{
          state={...state,inspect:null};
          syncRoute();
        }
      }
      if(!silent){
        const target=resolveFocusDescriptor(savedDesc);
        target?.focus({preventScroll:true});
      }
    });
  });

  function patch(changes,options={}){
    if (changes.sample && changes.sample !== state.sample) resetForecastDisplay();
    const oldPage=state.page,oldScope=[state.from,state.to,state.action,state.cohort].join('|');
    if(changes.page&&changes.page!==oldPage){
      scrollPositions.set(oldPage,scrollTop());
      closeAll(true);
      changes={...changes,inspect:null};
      closeMenu(false);
    }
    if(changes.inspect&&options.push)openedInspectorViaPush=true;
    state=normalizeState({...state,...changes});
    if(state.inspect&&!model.byId.has(state.inspect))state.inspect=null;
    const newScope=[state.from,state.to,state.action,state.cohort].join('|');
    if(oldScope!==newScope){
      closeAll(true);
      state.inspect=null;
      for(const s of ctx.tables.states.values()){s.page=0;s.selected.clear();}
      zoomState.clear();
      const docs=model.selection(state).docs;
      if(!docs.some(d=>d.id===selected))selected=docs.at(-1)?.id||null;
    }
    if(options.render===false){syncRoute(options.push);return;}
    render({preserveScroll:options.preserveScroll||oldPage===state.page,pageChange:oldPage!==state.page,push:options.push??oldPage!==state.page});
  }

  function chooseSelected() {
    if (state.page === 'overview' || state.page === 'walkthrough') return;
    const docs = model.selection(forecastState()).docs;
    if (!docs.some(doc => doc.id === selected)) selected = docs.at(-1)?.id || null;
  }

  function dateOnly() {
    return state.page === 'markets' && ['history', 'daily'].includes(local.marketTab);
  }

  function toolbar() {
    const selectedResults = state.page === 'forecasts' && local.forecastScope === 'filtered';
    const hasFilters = ['policy', 'markets'].includes(state.page) || selectedResults ||
      (state.page === 'data' && local.dataTab === 'coverage');
    $('#research-tools').hidden = !hasFilters && state.page !== 'forecasts';
    $('#selection-tools').hidden = !hasFilters;
    if (!hasFilters) return;

    const datesChanged = state.from !== defaultDates.from || state.to !== defaultDates.to;
    const active = [];
    const summary = datesChanged ? [] : [U.period(state)];
    if (datesChanged) active.push(['dates', U.period(state)]);
    if (dateOnly()) {
      summary.push('Market observation dates');
    } else {
      const actions = { hike: 'Rate increases', cut: 'Rate cuts', hold: 'Rate holds', other: 'Notices / unresolved' };
      if (state.action) active.push(['action', actions[state.action]]);
      else summary.push('All actions');
      if (state.cohort) active.push(['cohort', state.cohort === 'in' ? 'Analysis cohort' : 'Outside analysis']);
      else summary.push('All documents');
    }
    const tags = $('#active-filters');
    tags.hidden = !active.length;
    tags.innerHTML = active.map(([key, label]) => `<button type="button" class="filter-tag" data-action="remove-filter" data-filter="${key}" aria-label="Remove ${esc(label)} filter"><span>${esc(label)}</span>${icon('close')}</button>`).join('');
    const caption = $('#scope-caption');
    caption.hidden = !summary.length;
    caption.textContent = summary.join(' · ');
    $('#reset-filters').hidden = !active.length;
  }

  function resetForecastDisplay() {
    zoomState.delete('prediction-timeline');
    const scores = ctx.tables.states.get('scores');
    if (scores) {
      scores.page = 0;
      scores.selected.clear();
    }
  }

  function openForecastFamily(family, sector) {
    local.forecastTab = 'meeting';
    local.forecastSector = sector;
    patch({ family }, { push: true });
    requestAnimationFrame(() => $('#forecast-sector')?.focus({ preventScroll: true }));
  }

  function forecastDates() {
    return [...new Set(model.selection(forecastState()).predictions
      .filter(row => row.case === state.sample && row.sector === local.forecastSector)
      .map(row => row.event_date))].sort();
  }

  function chartKeyboard(el,id,job,chart,option,readoutSuffix=''){
    let items=job.meta.rows||[],kind='rows';
    if(id==='linked-timeline')items=items.filter(r=>r.record_type==='policy');
    if(option.series?.[0]?.type==='boxplot'||id.endsWith('-boxes')){
      kind='boxes';
      if(items.length&&('low_whisker_1_5_iqr_pct' in items[0]||'q1_pct' in items[0])){
        items=items.slice();
      }else if(option.series?.[0]?.data?.length){
        items=option.series[0].data.map(r=>({
          series:r.name,
          low_whisker_1_5_iqr_pct:r.value[0],
          q1_pct:r.value[1],
          median_pct:r.value[2],
          q3_pct:r.value[3],
          high_whisker_1_5_iqr_pct:r.value[4]
        }));
      }
    }else if(id.startsWith('hist-')){
      kind='histogram';
      items=option.xAxis.data.map((bin,i)=>({Return_bin_pct:bin,Sessions:option.series[0].data[i]}));
    }else if(id.startsWith('model-')){
      kind='models';
    }else if(id.startsWith('paired-')){
      kind='paired';
      items=items.slice();
    }else if(id==='market-history'){
      const grouped=new Map();
      for(const r of items)if(r.chart_value!=null){
        if(!grouped.has(r.date))grouped.set(r.date,{date:r.date});
        grouped.get(r.date)[r.instrument]=r.chart_value;
      }
      items=[...grouped.values()].sort((a,b)=>a.date.localeCompare(b.date));
    }
    if(!items.length)return;
    let reading=document.getElementById('chart-reading-'+id+readoutSuffix);
    if(!reading){
      reading=document.createElement('div');
      reading.id='chart-reading-'+id+readoutSuffix;
      reading.className='chart-reading';
      reading.setAttribute('aria-live','polite');
      el.after(reading);
    }
    reading.textContent='Use ← / → keys to inspect exact chart values.';
    el.setAttribute('aria-describedby',reading.id);

    function show(i){
      i=Math.max(0,Math.min(items.length-1,i));
      keyboardIndices.set(id,i);
      const row=items[i];
      let fields;
      if(kind==='models'){
        fields=['family','variant',state.metric,'test_events'];
      }else if(kind==='paired'){
        const diffKey=('difference' in row)?'difference':('MAE_difference_pp' in row)?'MAE_difference_pp':'RMSE_difference_pp';
        const lowKey=('interval_low_pp' in row)?'interval_low_pp':'low';
        const highKey=('interval_high_pp' in row)?'interval_high_pp':'high';
        fields=['family','test_events',diffKey,lowKey,highKey].filter(k=>k in row);
      }else if(kind==='boxes'){
        fields=['series','Series','n','low_whisker_1_5_iqr_pct','Lower_whisker','q1_pct','Q1','median_pct','Median','q3_pct','Q3','high_whisker_1_5_iqr_pct','Upper_whisker'].filter(k=>k in row);
      }else if(id==='linked-timeline'){
        fields=['date','series','value','observed_change_bps','first_session'];
      }else if(id==='policy-history'){
        fields=['event_date','date','after','bps'].filter(k=>k in row);
      }else if(id==='annual-coverage'){
        fields=['Year','Documents','Eligible','hike_n','cut_n','hold_n'];
      }else if(id==='prediction-timeline'){
        fields=['event_date','family','variant','prediction_pp','actual_pp'].filter(k=>k in row);
      }else{
        fields=Object.keys(row).filter(k=>!['doc_id','docId','filter_scope','source_file'].includes(k)).slice(0,7);
      }
      const fieldNames={
        meeting_date:'Meeting',event_date:'Meeting',date:'Date',
        deposit_after_pct:'Deposit %',observed_change_bps:'Change bps',first_session:'First session',
        after:'Deposit %',bps:'Change bps',hike_n:'Increases',cut_n:'Cuts',hold_n:'Holds',
        Eligible:'Cohort',MAE_pp:'MAE pp',RMSE_pp:'RMSE pp',
        direction_accuracy:'Direction %',balanced_direction_accuracy:'Balanced direction %',
        test_events:'Meetings',prediction_pp:'Prediction %',actual_pp:'Actual %',
        difference:'Paired diff pp',MAE_difference_pp:'MAE diff pp',RMSE_difference_pp:'RMSE diff pp',
        interval_low_pp:'95% CI low pp',interval_high_pp:'95% CI high pp',low:'95% CI low pp',high:'95% CI high pp',
        series:'Series',Series:'Series',
        low_whisker_1_5_iqr_pct:'Low whisker %',Lower_whisker:'Low whisker %',
        q1_pct:'Q1 %',Q1:'Q1 %',median_pct:'Median %',Median:'Median %',
        q3_pct:'Q3 %',Q3:'Q3 %',high_whisker_1_5_iqr_pct:'High whisker %',Upper_whisker:'High whisker %'
      };
      reading.innerHTML=fields.map(k=>{
        let v=row[k];
        if(k==='family')v=C.FAMILIES[v]||v;
        else if(k==='variant')v=C.VARIANTS[v]||v;
        else if(k.includes('direction')&&C.numeric(v))v=fmt(v*100,1)+'%';
        else if(C.dateValid(v))v=date(v);
        else if(C.numeric(v)&&k!=='Year')v=fmt(v,['test_events','Documents','Eligible','hike_n','cut_n','hold_n','Sessions','n'].includes(k)?0:3);
        else if(v==null||v==='')v='—';
        return`<span>${esc(fieldNames[k]||C.SECTORS[k]||k.replaceAll('_',' '))}: <b class="numeric">${esc(v)}</b></span>`;
      }).join('');
      if(kind==='boxes'||kind==='histogram')chart.dispatchAction({type:'showTip',seriesIndex:0,dataIndex:i});
      else if(kind==='models'){
        const family=['ridge','elastic_net','rbf_svr','random_forest'].indexOf(row.family);
        if(family>=0)chart.dispatchAction({type:'showTip',seriesIndex:row.variant==='text_added'?1:0,dataIndex:family});
      }
    }

    el.onkeydown=e=>{
      if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
        e.preventDefault();
        const i=keyboardIndices.get(id)??-1;
        show(e.key==='Home'?0:e.key==='End'?items.length-1:i+(e.key==='ArrowLeft'?-1:1));
      }else if(e.key==='Enter'){
        const row=items[keyboardIndices.get(id)??0];
        if(!row)return;
        if(row.doc_id&&model.byId.has(row.doc_id)){e.preventDefault();ctx.readers.open(row.doc_id);}
        else if(kind==='models'&&row.family&&['ridge','elastic_net','rbf_svr','random_forest'].includes(row.family)){
          e.preventDefault();openForecastFamily(row.family, row.sector);
        }
      }
    };
  }

  function paintCharts(){
    const palette=activePalette();
    for (const [id, chart] of chartInstances) {
      if (id === 'expanded') continue;
      if (!chartJobs.has(id) || chart.getDom() !== $('#chart-' + id)) {
        chart.dispose();
        chartInstances.delete(id);
        chartPaints.delete(id);
      }
    }
    for(const [id,job]of chartJobs){
      const el=$('#chart-'+id);if(!el||el.clientWidth<1)continue;
      let chart=chartInstances.get(id);
      if(!chart||chart.isDisposed()){
        chartPaints.delete(id);
        chart=echarts.init(el,null,{renderer:'svg'});
        chartInstances.set(id,chart);
      }
      const compact = el.clientWidth < 500;
      const zoom = zoomState.get(id);
      const previous = chartPaints.get(id);
      if (previous?.job === job && previous.palette === palette && previous.compact === compact && previous.zoom === zoom) continue;
      const option = job.builder(palette, compact);
      option.aria={enabled:false};
      if(zoomState.has(id)){
        const z=zoomState.get(id);
        if(option.dataZoom)for(const item of option.dataZoom){item.start=z.start;item.end=z.end;}
      }
      chart.setOption(option,{notMerge:true,lazyUpdate:false});
      chartPaints.set(id, { job, palette, compact, zoom });
      chartKeyboard(el,id,job,chart,option);
      el.setAttribute('aria-label',job.title+'. '+(job.meta.unit||'')+'. '+(job.meta.scope||U.scope(state))+(job.meta.rows?.length ? '. Use the Data view to inspect the source rows.' : '.'));
      chart.off('click');
      if(job.onClick)chart.on('click',job.onClick);
      chart.off('datazoom');
      chart.on('datazoom',()=>{
        const z=chart.getOption().dataZoom?.[0];
        if(z){
          const nextZoom = { start: z.start ?? 0, end: z.end ?? 100 };
          zoomState.set(id, nextZoom);
          const paint = chartPaints.get(id);
          if (paint) paint.zoom = nextZoom;
          const caption=$('#zoom-'+id);
          if(caption)caption.textContent=(z.start>0||z.end<100)?'Zoomed chart view · analytical counts unchanged.':'Zoom changes the chart view only.';
        }
      });
    }
  }

  function revealChart(id) {
    const chart = chartInstances.get(id);
    if (chart && chart.getDom().clientWidth > 0) chart.resize();
    paintCharts();
  }

  function animateView() {
    const tab = {
      walkthrough: state.step,
      policy: local.policyTab,
      markets: local.marketTab,
      forecasts: local.forecastTab + '-' + local.forecastScope,
      data: local.dataTab,
    }[state.page];
    const nextView = state.page + '/' + (tab || '');
    if (nextView === lastView) return;
    lastView = nextView;
    viewAnimation?.cancel();
    const view = $('#view');
    if (motionPreference.matches || typeof view.animate !== 'function') return;
    viewAnimation = view.animate(
      [{ opacity: .72, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 220, easing: 'cubic-bezier(.22, .68, .24, 1)' }
    );
  }

  function render(options={}){
    const generation=++renderGeneration,started=performance.now(),y=scrollTop(),active=document.activeElement,focusId=active?.id,activePanel=active?.closest?.('.panel[aria-labelledby]'),focusAttribute=['data-reader-sample','data-sample','data-family','data-metric','data-market-mode','data-meeting-picker','data-forecast-event','data-instrument'].find(k=>active?.hasAttribute?.(k)),focusAttrs=(active?.dataset?.action==='select-family'&&activePanel)?`.panel[aria-labelledby="${CSS.escape(activePanel.getAttribute('aria-labelledby'))}"] [data-action="select-family"][data-family="${CSS.escape(active.dataset.family||'')}"]`:focusAttribute?'['+focusAttribute+'="'+CSS.escape(active.getAttribute(focusAttribute))+'"]':null;
    chooseSelected();
    chartJobs.clear();
    $('#page-tools').hidden = state.page === 'overview';
    $('#page-title').textContent=labels[state.page][0];
    $('#page-description').textContent=labels[state.page][1];
    const activeNav = $('#sidebar nav [data-page="' + state.page + '"]');
    $('#header-workspace').textContent = activeNav?.getAttribute('aria-label') || labels[state.page][0];
    $('#page-icon').setAttribute('href', '#i-' + (activeNav?.dataset.glyph || 'overview'));
    document.title=labels[state.page][0]+' · CBE Thesis Explorer';
    $$('[data-page]').forEach(b=>{if(b.closest('nav')){if(b.dataset.page===state.page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}});
    document.body.dataset.workspace=state.page;
    toolbar();
    try{
      renderWorkspace(state.page,ctx);
      paintCharts();
      animateView();
      $$('svg.icon').forEach(el=>el.setAttribute('aria-hidden','true'));
      if(state.inspect&&$('#inspector-dialog').open)ctx.readers.refresh(state.inspect,false);
    }catch(error){
      runtimeErrors.push(error.stack||String(error));
      $('#fatal-error').hidden=false;
      $('#fatal-error').textContent='This view could not be drawn. '+error.message;
      throw error;
    }
    $('#print-metadata').innerHTML='<p><strong>CBE Thesis Explorer</strong> · '+esc(labels[state.page][0])+'</p><p>Research selection: '+esc(state.page==='overview'?'Both saved evaluations':state.page==='walkthrough'?'6 March 2024 example':scopeLabel())+'</p><p>Sources: CBE original releases; Refinitiv .EGBANK, .EGREAL and .EGX30 closes; saved first-session results (28 October 2026 snapshot). Daily context uses the period only. Historical descriptions and saved forecasts do not establish a causal communication effect.</p>';
    syncRoute(options.push||false,y);
    const targetY=options.scrollY!=null?options.scrollY:options.pageChange?(scrollPositions.get(state.page)||0):options.preserveScroll?y:0;
    requestAnimationFrame(()=>{
      if(generation!==renderGeneration)return;
      window.scrollTo({top:targetY,behavior:'instant'});
      if(history.state?.cbe)history.replaceState({...history.state,scroll:targetY},'',location.hash);
      if(pendingFocusReturn){
        const target=resolveFocusDescriptor(pendingFocusReturn);
        pendingFocusReturn=null;
        target?.focus({preventScroll:true});
      }else if(options.pageChange){
        $('#main').focus({preventScroll:true});
      }else if(focusId){
        document.getElementById(focusId)?.focus({preventScroll:true});
      }else if(focusAttrs){
        $(focusAttrs)?.focus({preventScroll:true});
      }
      requestAnimationFrame(()=>{
        if(generation!==renderGeneration)return;
        performanceLog.push({page:state.page,scope:U.scope(state),milliseconds:+(performance.now()-started).toFixed(1),charts:chartJobs.size});
        if(performanceLog.length>100)performanceLog.shift();
        document.body.dataset.renderHistory=JSON.stringify(performanceLog);
        document.body.dataset.runtimeErrors=JSON.stringify(runtimeErrors);
        document.body.dataset.externalRequests=JSON.stringify(performance.getEntriesByType('resource').map(r=>r.name).filter(url=>!url.startsWith('blob:')&&!url.startsWith('file:')&&!url.startsWith('data:')&&new URL(url,location.href).origin!==location.origin));
      });
    });
  }

  function selectMeeting(id){if(!model.byId.has(id))return;selected=id;render({preserveScroll:true});}

  function restoreRoute(){
    const savedScroll=history.state?.scroll,comparisonParams=new URLSearchParams(location.hash.split('?')[1]||'');
    const prevInspect=state.inspect,inspectorWasOpen=$('#inspector-dialog').open;
    state=parseRoute(location.hash);
    closeMenu(false);
    captureLocalRoute();
    const keepInspectorOpen=Boolean(inspectorWasOpen&&state.inspect&&state.inspect===prevInspect);
    if(keepInspectorOpen){
      $$('dialog[open]').forEach(el=>{if(el.id!=='inspector-dialog')closeDialog(el.id,true);});
    }else{
      closeAll(true);
      openedInspectorViaPush=false;
    }
    render({scrollY:savedScroll??scrollPositions.get(state.page)??0});
    if(state.inspect&&model.byId.has(state.inspect)){
      ctx.readers.refresh(state.inspect,false);
      if(!keepInspectorOpen)openDialog('inspector-dialog');
    }
    restoreComparison(comparisonParams);
  }

  function restoreComparison(p=new URLSearchParams(location.hash.split('?')[1]||'')){
    const selectedDoc=model.byId.get(p.get('compareSelected')),earlier=model.byId.get(p.get('compare'));
    if(!selectedDoc||!earlier||earlier.date>=selectedDoc.date||earlier.language.startsWith('Arabic')!==selectedDoc.language.startsWith('Arabic'))return;
    Object.assign(ctx.readers.comparison,{selected:selectedDoc.id,earlier:earlier.id,mode:p.get('compareMode')==='side'?'side':'diff'});
    ctx.readers.renderCompare();
    openDialog('compare-dialog');
    openedComparisonViaPush=false;
    syncRoute();
  }

  let lastNavigationHash=location.hash;
  window.addEventListener('popstate',()=>{lastNavigationHash=location.hash;restoreRoute();});
  window.addEventListener('hashchange',()=>{if(location.hash!==lastNavigationHash){lastNavigationHash=location.hash;restoreRoute();}});

  function closeMenu(restoreFocus=true){
    const wasOpen=$('#sidebar').classList.contains('open');
    $('#sidebar').classList.remove('open');
    $('#sidebar').removeAttribute('role');
    $('#sidebar').removeAttribute('aria-modal');
    $('#sidebar').removeAttribute('aria-label');
    $('#nav-scrim').hidden=true;
    $('.workbench').inert=false;
    $('#menu-toggle').setAttribute('aria-expanded','false');
    if(wasOpen&&restoreFocus)$('#menu-toggle').focus();
  }

  function navigatePage(page, { studyView, studySample, startWalkthrough = false } = {}) {
    const changes = { page };
    if (page === 'forecasts' && (state.page !== page || studyView)) {
      local.forecastScope = 'saved';
      local.forecastTab = studyView === 'text' ? 'text' : 'benchmarks';
      resetForecastDisplay();
    }
    if (studyView) Object.assign(changes, { sample: studySample || 'expanded_legacy_live', metric: 'MAE_pp' });
    if (startWalkthrough) changes.step = walkthroughSteps[0];
    patch(changes, { push: true });
  }

  function openSearch() {
    renderSearch({ model, choose: followSearchResult });
    openDialog('search-dialog');
    $('#explorer-search').focus({ preventScroll: true });
  }

  function followSearchResult(target) {
    const opener = dialogFocus.get('search-dialog');
    closeDialog('search-dialog', true);

    if (target.kind === 'section') {
      if (target.page === 'markets') local.marketTab = target.view || 'history';
      if (target.page === 'policy') local.policyTab = 'statements';
      if (target.page === 'data') local.dataTab = 'coverage';
      navigatePage(target.page, {
        studyView: target.page === 'forecasts' ? target.view || 'benchmarks' : undefined,
        startWalkthrough: target.page === 'walkthrough',
      });
      requestAnimationFrame(() => $('#main').focus({ preventScroll: true }));
    } else if (target.kind === 'statement') {
      lastTriggerDescriptor = opener;
      state = { ...state, inspectTab: 'statement' };
      ctx.readers.open(target.docId);
      const wording = $('#inspector-dialog [data-reader-search]');
      if (wording && target.match) {
        wording.value = target.match;
        ctx.readers.search(target.docId, wording);
      }
    } else if (target.kind === 'file') {
      const link = document.createElement('a');
      link.href = target.href;
      if (target.href.endsWith('.pdf')) {
        link.target = '_blank';
        link.rel = 'noopener';
      } else {
        link.download = '';
      }
      link.click();
    }
  }

  setCompactRail(readStorage(railPreference, false) === true);
  $('#rail-toggle').onclick = () => {
    const compact = !document.body.hasAttribute('data-compact-rail');
    setCompactRail(compact);
    writeStorage(railPreference, compact);
    queueChartResize();
  };
  $('#menu-toggle').onclick=()=>{
    if($('#sidebar').classList.contains('open')){closeMenu();return;}
    $('#sidebar').classList.add('open');
    $('#sidebar').setAttribute('role','dialog');
    $('#sidebar').setAttribute('aria-modal','true');
    $('#sidebar').setAttribute('aria-label','Research navigation');
    $('#nav-scrim').hidden=false;
    $('.workbench').inert=true;
    $('#menu-toggle').setAttribute('aria-expanded','true');
    $('#nav-close').focus();
  };
  $('#nav-close').onclick=()=>closeMenu();
  $('#nav-scrim').onclick=()=>closeMenu();

  function openFilters(){
    $('#filter-from-year').value=state.from.slice(0,4);
    $('#filter-to-year').value=state.to.slice(0,4);
    $('#filter-from').value=state.from;
    $('#filter-to').value=state.to;
    $('#filter-action').value=state.action;
    $('#filter-cohort').value=state.cohort;
    $('#filter-announcement-fields').hidden = dateOnly();
    $('#filter-help').textContent = dateOnly()
      ? 'This chart uses observation dates. Meeting filters are kept for announcement-linked views.'
      : 'Set the date range, policy action and group of meetings used by this view.';
    $('#filter-error').hidden=true;
    $('#filter-from').removeAttribute('aria-invalid');
    $('#filter-to').removeAttribute('aria-invalid');
    $('.date-details').open=!state.from.endsWith('-01-01')||!state.to.endsWith('-12-31');
    openDialog('filter-dialog');
  }

  const presetRanges={
    all:['1998-01-01','2026-12-31'],
    study:['2007-01-03','2026-10-18'],
    notebook:['2007-01-03','2026-10-18'],
    legacy:['2007-01-01','2019-12-31'],
    modern:['2020-01-01','2026-12-31']
  };

  function preset(name){
    const[from,to]=presetRanges[name]||presetRanges.modern;
    $('#filter-from').value=from;
    $('#filter-to').value=to;
    $('#filter-from-year').value=from.slice(0,4);
    $('#filter-to-year').value=to.slice(0,4);
    $('#filter-error').hidden=true;
  }

  $('#filter-from-year').onchange=()=>{$('#filter-from').value=$('#filter-from-year').value+'-01-01';$('#filter-error').hidden=true;};
  $('#filter-to-year').onchange=()=>{$('#filter-to').value=$('#filter-to-year').value+'-12-31';$('#filter-error').hidden=true;};
  $('#filter-from').onchange=()=>{$('#filter-from-year').value=$('#filter-from').value.slice(0,4);$('#filter-error').hidden=true;};
  $('#filter-to').onchange=()=>{$('#filter-to-year').value=$('#filter-to').value.slice(0,4);$('#filter-error').hidden=true;};
  $('#filter-clear').onclick=()=>{preset('modern');$('#filter-action').value='';$('#filter-cohort').value='';};
  $('#filter-form').onsubmit=e=>{
    e.preventDefault();
    const from=$('#filter-from').value,to=$('#filter-to').value;
    if(!C.dateValid(from)||!C.dateValid(to)||from>to){
      $('#filter-error').hidden=false;
      $('#filter-from').setAttribute('aria-invalid','true');
      $('#filter-to').setAttribute('aria-invalid','true');
      return;
    }
    $('#filter-from').removeAttribute('aria-invalid');
    $('#filter-to').removeAttribute('aria-invalid');
    pendingFocusReturn=dialogFocus.get('filter-dialog')||{selector:'#period-button',fallback:'#period-button'};
    closeDialog('filter-dialog',true);
    const filters = dateOnly() ? {} : { action: $('#filter-action').value, cohort: $('#filter-cohort').value };
    patch({ from, to, ...filters }, { preserveScroll: true, push: true });
    toast('Research filters applied.');
  };

  function toast(message,undo){
    clearTimeout(toastTimer);
    $('#toast').hidden=false;
    $('#toast').innerHTML=esc(message)+(undo?'<button type="button" id="toast-undo">Undo</button>':'');
    if(undo)$('#toast-undo').onclick=()=>{undo();$('#toast').hidden=true;};
    toastTimer=setTimeout(()=>$('#toast').hidden=true,undo?9000:3000);
  }

  function download(rows,name,type='csv'){
    if(type==='csv'&&!rows.length){toast('No matching rows to export.');return;}
    const content=type==='csv'?C.csv(rows):JSON.stringify(rows,null,2)+'\n',blob=new Blob([content],{type:type==='csv'?'text/csv;charset=utf-8':'application/json'});
    saveBlob(blob,name+'.'+type);
    toast(type==='csv'?`${fmt(rows.length,0)} rows exported.`:'View settings exported.');
  }

  function saveBlob(blob,name){
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  }

  const filename=title=>'CBE_'+title.replace(/[^\p{L}\p{N}]+/gu,'_').replace(/^_|_$/g,'')+'_'+(state.page==='forecasts'&&local.forecastScope==='saved'?'saved_'+state.sample:state.from+'_'+state.to);

  function chartContext(id){
    const original=sources.get(id);if(!original)return null;
    const z = zoomState.get(id);
    if (!z || (z.start <= 0 && z.end >= 100)) return original;
    const job = chartJobs.get(id);
    const option = chartPaints.get(id)?.job === job && chartInstances.has(id)
      ? chartInstances.get(id).getOption() : job?.builder(activePalette(), true);
    const axis = Array.isArray(option?.xAxis) ? option.xAxis[0] : option?.xAxis;
    const min = Number(axis?.min), max = Number(axis?.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return original;
    const from=new Date(min+(max-min)*(z.start??0)/100).toISOString().slice(0,10),to=new Date(min+(max-min)*(z.end??100)/100).toISOString().slice(0,10);
    const rows=(original.rows||[]).filter(r=>{const d=r.date||r.event_date||r.meeting_date;return !d||d>=from&&d<=to;});
    return{...original,rows,downloadRows:rows,scope:(original.scope||U.scope(state))+' · chart window '+date(from)+' to '+date(to),limits:[...(original.limits||[]),'This export contains the visible date window. The shared research selection and its summary counts are unchanged by zoom.']};
  }

  function chartLegend(id){
    const p=activePalette();
    if(id==='linked-timeline'){
      return[
        {label:'Deposit rate (%)',color:p.accent,style:'line'},
        ...state.instruments.map(k=>({label:C.SECTORS[k],color:p[k],style:k==='real_estate'?'dash':k==='egx30'?'dot':'line'}))
      ];
    }
    if(id==='market-history'){
      return state.instruments.map(k=>({label:C.SECTORS[k],color:p[k],style:k==='real_estate'?'dash':k==='egx30'?'dot':'line'}));
    }
    if(id==='policy-history'){
      return[
        {label:'Deposit after (%)',color:p.accent,style:'line'},
        {label:'Conditional level (Nov 2009)',color:p.real_estate,style:'point'},
        {label:'Increase',color:p.hike||p.accent,style:'bar'},
        {label:'Cut',color:p.cut||p.banks,style:'bar'},
        {label:'Hold',color:p.hold||p.egx30,style:'bar'}
      ];
    }
    if(id==='annual-coverage'){
      return[
        {label:'Increase',color:p.hike||p.accent,style:'bar'},
        {label:'Cut',color:p.cut||p.banks,style:'bar'},
        {label:'Hold',color:p.hold||p.egx30,style:'bar'},
        {label:'All selected documents',color:p.zero_ref||p.reference,style:'dash'}
      ];
    }
    if(id.startsWith('model-')){
      const sector=id.replace('model-','');
      const rows=sources.get(id)?.rows||model.scores(forecastState(),sector)||[];
      const zero=rows.find(r=>r.family==='zero_return'),mean=rows.find(r=>r.family==='historical_mean');
      const fmtRef=r=>{
        if(!r||!C.numeric(r[state.metric]))return'';
        return state.metric.includes('direction')?` (${fmt(+r[state.metric]*100,1)}%)`:` (${fmt(r[state.metric],3)} pp)`;
      };
      return[
        {label:'● Numbers only [Num]',color:p.numerical,style:'bar'},
        {label:'▲ Numbers + text [+Text]',color:p.text_added,style:'bar'},
        {label:'◇ Zero-return ref'+fmtRef(zero),color:p.zero_ref||p.reference,style:'dash'},
        {label:'+ Expanding-mean ref'+fmtRef(mean),color:p.mean_ref||p.reference,style:'dot'}
      ];
    }
    if(id==='prediction-timeline'){
      return[
        {label:'Actual return',color:p.egx30,style:'bar'},
        {label:'● Numbers only',color:p.numerical,style:'line'},
        {label:'▲ Numbers + text',color:p.text_added,style:'dash'},
        {label:'◇ Zero return (0%)',color:p.zero_ref||p.reference,style:'dash'},
        {label:'+ Past mean',color:p.mean_ref||p.reference,style:'dot'}
      ];
    }
    if(id.startsWith('paired-')){
      const hasInterval=sources.get(id)?.rows?.some(r=>C.numeric(r.interval_low_pp??r.low));
      return[
        {label:'Text − numbers-only ('+(state.metric==='RMSE_pp'?'RMSE':'MAE')+')',color:p.accent,style:'point'},
        ...(hasInterval?[{label:'Saved descriptive 95% interval',color:p.accent,style:'line'}]:[]),
        {label:'0.000 pp (no change)',color:p.zero_ref||p.reference,style:'dash'}
      ];
    }
    if(id==='daily-boxes'||id==='event-boxes'){
      return[
        {label:'Median & IQR box (Q1–Q3)',color:p.banks,style:'bar'},
        {label:'1.5×IQR whiskers',color:p.text,style:'line'},
        {label:'Outliers',color:p.real_estate,style:'point'},
        {label:'0% reference',color:p.zero_ref||p.muted,style:'dot'}
      ];
    }
    if(id.startsWith('hist-')){
      const inst=id.replace('hist-','');
      return[
        {label:(C.SECTORS[inst]||inst)+' sessions',color:p[inst]||p.banks,style:'bar'},
        {label:'0% boundary',color:p.zero_ref||p.muted,style:'dash'}
      ];
    }
    return[];
  }

  function legendHTML(id){
    const items=chartLegend(id);
    return items.length?'<div class="legend" style="padding-bottom:7px">'+items.map(r=>`<span><i style="${r.style==='bar'?'height:8px;width:13px;border:0;background:'+r.color:r.style==='point'?'height:7px;width:7px;border:0;border-radius:50%;background:'+r.color:'border-top:2px '+(r.style==='dash'?'dashed':r.style==='dot'?'dotted':'solid')+' '+r.color}"></i>${esc(r.label)}</span>`).join('')+'</div>':'';
  }

  const metadata=meta=>({artifact:'CBE Thesis Explorer',title:meta.title,scope:meta.scope||U.scope(state),unit:meta.unit||null,population:meta.population||null,definition:meta.definition||null,source_files:meta.files||[],limits:meta.limits||[],saved_study_snapshot:'2026-10-28/run_001'});

  function utility(title,content,footer=''){
    const el=$('#utility-dialog');
    el.innerHTML=`<div class="dialog-header"><h2 id="utility-title">${esc(title)}</h2><button type="button" class="icon-button" data-close="utility-dialog" aria-label="Close ${esc(title)}">${icon('close')}</button></div><div class="dialog-content">${content}</div>${footer?`<div class="dialog-footer">${footer}</div>`:''}`;
    openDialog('utility-dialog');
  }

  function openViewLink() {
    const localCopy = location.protocol === 'file:';
    const hash = currentRoute();
    const value = localCopy ? hash : new URL(hash, location.href).href;
    const instructions = localCopy
      ? 'Append this fragment to the address of the same Explorer build. It keeps the section and research filters.'
      : 'Open this link to return to the section and research filters shown here.';
    utility('View link', `<div class="view-link-dialog"><p id="view-link-help" class="note">${esc(instructions)}</p><label for="view-link-value">${localCopy ? 'Portable view fragment' : 'Link to this view'}</label><input type="text" id="view-link-value" value="${esc(value)}" aria-describedby="view-link-help" readonly><p id="view-link-status" role="status"></p></div>`,
      `<button type="button" class="quiet-button" data-export="settings">Download settings</button><button type="button" class="button" data-action="copy-view-link">${icon('link')}${localCopy ? 'Copy fragment' : 'Copy link'}</button>`);
    $('#view-link-value').focus();
    $('#view-link-value').select();
  }

  async function copyViewLink() {
    const input = $('#view-link-value');
    const status = $('#view-link-status');
    const button = $('[data-action="copy-view-link"]');
    if (!input || !status || !button) return;
    const glyph = button.querySelector('use');
    try {
      await navigator.clipboard.writeText(input.value);
      status.textContent = 'Copied to the clipboard.';
      button.dataset.copied = '';
      glyph?.setAttribute('href', '#i-check');
    } catch {
      input.focus();
      input.select();
      status.textContent = 'The text is selected. Use your device’s copy command.';
      delete button.dataset.copied;
      glyph?.setAttribute('href', '#i-link');
    }
  }

  function files(){
    utility('Current study files',`<p class="note">The revised report, notebook, dataset and presentation in this study handover.</p><div class="file-list">${X.manifest.files.map(f=>`<a href="${esc(f.href)}" ${f.href.endsWith('.pdf')?'target="_blank" rel="noopener"':'download'}>${icon('file')}<span><strong>${esc(f.label)}</strong><small>${esc(f.description)}</small></span><span class="external-symbol">↗</span></a>`).join('')}</div>`);
  }

  function exportDialog() {
    const selection = model.selection(state);
    const forecastRows = model.selection(forecastState()).predictions.filter(row => row.case === state.sample);
    const choice = (key, glyph, label, details, enabled = true) =>
      `<button type="button" class="export-choice" data-export="${key}" ${enabled ? '' : 'disabled'}>${icon(glyph)}<span><strong>${esc(label)}</strong><small>${esc(details)}</small></span></button>`;
    const choices = [];
    if (['policy', 'data'].includes(state.page) || (state.page === 'markets' && !dateOnly())) {
      choices.push(choice('announcements', 'policy', 'Announcements and event evidence', fmt(selection.docs.length, 0) + ' records with statements, rates and outcomes', selection.docs.length > 0));
    }
    if (state.page === 'markets') {
      choices.push(choice('prices', 'markets', 'Daily market source rows', fmt(selection.prices.length, 0) + ' instrument-date records · date range only', selection.prices.length > 0));
    }
    if (state.page === 'forecasts') {
      choices.push(choice('forecasts', 'forecasts', 'Saved forecast rows', fmt(forecastRows.length, 0) + ' rows across both sectors and all variants', forecastRows.length > 0));
    }
    choices.push(choice('settings', 'bookmark', 'Portable view settings', 'Download your current selections as JSON.'));
    utility('Export this view', `<p class="note">${esc(scopeLabel())}</p><div class="export-choices">${choices.join('')}</div>`);
  }

  function viewSettings(){
    return{
      format:'cbe-explorer-view',
      version:1,
      name:state.page==='forecasts'&&local.forecastScope==='saved'?C.CASES[state.sample]:U.period(state),
      state:{...state,inspect:null},
      selected,
      local:{...local},
      chartViewport:[...zoomState].map(([id,zoom])=>({id,...zoom})),
      tables:[...ctx.tables.states].map(([id,s])=>({id,q:s.q,sort:s.sort,dir:s.dir,preset:s.preset,columns:s.columns,instrument:s.instrument,status:s.status,min:s.min,max:s.max}))
    };
  }

  function saveView(){
    utility('Save this research view',`<label class="field" for="saved-view-name">View name<input id="saved-view-name" type="text" maxlength="100" value="${esc(U.period(state)+(state.action?' · '+{hike:'increases',cut:'cuts',hold:'holds',other:'other'}[state.action]:''))}" style="margin-top:8px;width:100%"></label><p class="utility-help">${storageAvailable?'Saved on this browser. Export settings to move a view with your local handover.':'Browser storage is unavailable. The view remains available in this session; export settings to keep it.'}</p>`,`<button type="button" class="quiet-button" data-action="saved-views">Manage saved views</button><button type="button" class="button" data-action="save-view-confirm">Save view</button>`);
  }

  function manageViews(){
    utility('Saved research views',savedViews.length?savedViews.map((v,i)=>`<div class="saved-view-row"><button type="button" data-action="load-view" data-index="${i}">${esc(v.name)}<small>${esc(U.scope(normalizeState(v.state)))}</small></button><button type="button" class="icon-button" data-action="delete-view" data-index="${i}" aria-label="Remove saved view ${esc(v.name)}">${icon('close')}</button></div>`).join(''):'<p class="note">No saved views yet. Save a useful period and filter combination to return to it.</p>',`<button type="button" class="quiet-button" data-action="import-view">Import settings</button><button type="button" class="quiet-button" data-export="settings">Export settings</button><button type="button" class="button" data-action="save-view">Save current view</button>`);
  }

  function applyView(v){
    if(!v||typeof v!=='object'||!v.state)throw Error('The file does not contain a research view.');
    closeAll(true);
    state=normalizeState(v.state);
    state.inspect=null;
    Object.assign(local, defaultLocal);
    if (v.local && typeof v.local === 'object') {
      for (const key of Object.keys(local)) {
        if (typeof v.local[key] === 'string' || v.local[key] === null) local[key] = v.local[key];
      }
    }
    if (state.page === 'overview' && v.local?.overviewSeries === 'deposit') {
      state = { ...state, page: 'policy' };
      local.policyTab = 'rates';
    }
    if (!['statements', 'records', 'rates'].includes(local.policyTab)) local.policyTab = 'statements';
    if (!['history', 'daily', 'event', 'linked'].includes(local.marketTab)) local.marketTab = 'history';
    if (!['coverage', 'tables', 'methods'].includes(local.dataTab)) local.dataTab = 'coverage';
    if (!Object.hasOwn(X.tables, local.referenceTable)) local.referenceTable = 'table_4_1';
    if (!['banks', 'real_estate'].includes(local.forecastSector)) local.forecastSector = 'banks';
    if (!['saved', 'filtered'].includes(v.local?.forecastScope)) local.forecastScope = state.page === 'forecasts' ? 'filtered' : 'saved';
    if (!['benchmarks', 'text', 'meeting'].includes(v.local?.forecastTab)) local.forecastTab = local.forecastEvent ? 'meeting' : 'benchmarks';
    if(Array.isArray(v.tables)){
      for(const x of v.tables){
        if(!x||typeof x.id!=='string')continue;
        const target=ctx.tables.state(x.id);
        for(const k of ['q','sort','preset','instrument','status','min','max'])if(typeof x[k]==='string'||x[k]===null)target[k]=x[k];
        if(x.dir===1||x.dir===-1)target.dir=x.dir;
        if(Array.isArray(x.columns))target.columns=x.columns.filter(x=>typeof x==='string');
        target.page=0;
        target.selected.clear();
      }
    }
    zoomState.clear();
    if(Array.isArray(v.chartViewport)){
      for(const z of v.chartViewport)if(typeof z.id==='string'&&Number.isFinite(z.start)&&Number.isFinite(z.end)&&z.start>=0&&z.end<=100&&z.start<=z.end)zoomState.set(({ 'dashboard-market': 'market-history', 'dashboard-deposits': 'policy-history' })[z.id] || z.id,{start:z.start,end:z.end});
    }
    selected=model.byId.has(v.selected)?v.selected:null;
    render({pageChange:true,push:true});
    toast('Research view loaded.');
  }

  $('#import-view-file').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      if(file.size>1000000)throw Error('Choose a settings file smaller than 1 MB.');
      const v=JSON.parse(await file.text());
      if(v.format!=='cbe-explorer-view'||v.version!==1)throw Error('Choose a CBE Explorer version 1 view-settings file.');
      applyView(v);
    }catch(error){toast(error.message);}
    e.target.value='';
  };

  function expandChart(id){
    const job=chartJobs.get(id);if(!job)return;
    $('#chart-dialog').dataset.chart=id;
    $('#chart-dialog').innerHTML=`<div class="dialog-header"><div><h2 id="expanded-title">${esc(job.title)}</h2><p class="tiny-note" style="margin:7px 0 0">${esc(job.meta.scope||U.scope(state))}</p></div><button type="button" class="icon-button" data-close="chart-dialog" aria-label="Close expanded chart">${icon('close')}</button></div>${legendHTML(id)}<div id="expanded-chart" class="expanded-chart" tabindex="0" role="img" aria-label="Expanded ${esc(job.title)}"></div><div class="dialog-footer"><button type="button" class="quiet-button" data-action="source" data-source="${id}">${icon('info')}Source &amp; rows</button><button type="button" class="quiet-button" data-action="download-chart" data-chart="${id}" data-format="svg">SVG</button><button type="button" class="button" data-action="download-chart" data-chart="${id}" data-format="png">PNG</button></div>`;
    openDialog('chart-dialog');
    const el=$('#expanded-chart');
    chartInstances.get('expanded')?.dispose();
    const chart=echarts.init(el,null,{renderer:'svg'});
    chartInstances.set('expanded',chart);
    const option=job.builder(activePalette(),el.clientWidth<500);
    option.aria={enabled:false};
    if(zoomState.has(id)&&option.dataZoom)for(const item of option.dataZoom){Object.assign(item,zoomState.get(id));}
    chart.setOption(option,true);
    chartKeyboard(el,id,job,chart,option,'-expanded');
    chart.on('datazoom',()=>{
      const z=chart.getOption().dataZoom?.[0],old=zoomState.get(id);
      if(z&&(!old||old.start!==z.start||old.end!==z.end)){
        zoomState.set(id,{start:z.start??0,end:z.end??100});
        paintCharts();
      }
    });
    el.setAttribute('aria-label',job.title+'. '+(job.meta.unit||'')+'. '+(job.meta.scope||U.scope(state))+'. Source and rows are available below.');
  }

  function chartExportDialog(id){
    const job=chartJobs.get(id);if(!job)return;
    utility('Export chart',`<p class="note">${esc(job.title)}<br>${esc(job.meta.scope||U.scope(state))}</p><div class="export-choices"><button type="button" class="export-choice" data-action="download-chart" data-chart="${id}" data-format="svg">${icon('download')}<span><strong>SVG image</strong><small>Scalable chart with source, units and selected period.</small></span></button><button type="button" class="export-choice" data-action="download-chart" data-chart="${id}" data-format="png">${icon('download')}<span><strong>PNG image</strong><small>High-resolution image for presentation use.</small></span></button><button type="button" class="export-choice" data-action="source-export" data-source="${id}">${icon('data')}<span><strong>Underlying chart rows</strong><small>All rows represented by this chart’s data scope.</small></span></button><button type="button" class="export-choice" data-action="metadata-export" data-source="${id}">${icon('file')}<span><strong>Definition &amp; scope metadata</strong><small>JSON with units, sample, sources and interpretation notes.</small></span></button></div>`);
  }

  function chartSVG(id){
    const original=chartJobs.get(id),job=original?{...original,meta:chartContext(id)}:null,instance=($('#chart-dialog').open&&$('#chart-dialog').dataset.chart===id)?chartInstances.get('expanded'):chartInstances.get(id);
    if(!instance||!job)throw Error('Open this chart before exporting it.');
    const raw=instance.renderToSVGString(),parser=new DOMParser(),doc=parser.parseFromString(raw,'image/svg+xml'),svg=doc.documentElement,ns='http://www.w3.org/2000/svg',W=+svg.getAttribute('width')||instance.getWidth(),H=+svg.getAttribute('height')||instance.getHeight(),p=activePalette();
    const text=[job.title,job.meta.population||'',job.meta.scope||U.scope(state),job.meta.unit||'',job.meta.definition||'','Sources: '+(job.meta.files||[]).map(f=>typeof f==='string'?f.split('/').at(-1):f.label).join(', '),...(job.meta.limits||[])].filter(Boolean).join(' · '),maxChars=Math.max(35,Math.floor((W-40)/7)),words=text.split(/\s+/),lines=[];
    let line='';
    for(const word of words){if((line+' '+word).length>maxChars&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}
    if(line)lines.push(line);
    const legend=chartLegend(id),legendItems=[];
    let lx=20,ly=H+20;
    for(const item of legend){
      const width=item.label.length*7.5+40;
      if(lx+width>W-15&&lx>20){lx=20;ly+=25;}
      legendItems.push({...item,x:lx,y:ly});
      lx+=width;
    }
    const legendH=legend.length?ly-H+14:0,captionH=legendH+lines.length*20+28;
    svg.setAttribute('height',H+captionH);
    svg.setAttribute('viewBox',`0 0 ${W} ${H+captionH}`);
    const rect=doc.createElementNS(ns,'rect');
    rect.setAttribute('width',W);rect.setAttribute('height',H+captionH);rect.setAttribute('fill',p.surface);
    svg.insertBefore(rect,svg.firstChild);
    const title=doc.createElementNS(ns,'title');
    title.textContent=job.title;
    svg.insertBefore(title,svg.firstChild);
    for(const item of legendItems){
      let mark;
      if(item.style==='bar'){
        mark=doc.createElementNS(ns,'rect');
        mark.setAttribute('x',item.x);mark.setAttribute('y',item.y-7);mark.setAttribute('width',17);mark.setAttribute('height',8);mark.setAttribute('fill',item.color);
      }else if(item.style==='point'){
        mark=doc.createElementNS(ns,'circle');
        mark.setAttribute('cx',item.x+8);mark.setAttribute('cy',item.y-3);mark.setAttribute('r',4);mark.setAttribute('fill',item.color);
      }else{
        mark=doc.createElementNS(ns,'line');
        mark.setAttribute('x1',item.x);mark.setAttribute('x2',item.x+17);mark.setAttribute('y1',item.y-3);mark.setAttribute('y2',item.y-3);mark.setAttribute('stroke',item.color);mark.setAttribute('stroke-width',2);
        if(item.style==='dash'||item.style==='dot')mark.setAttribute('stroke-dasharray',item.style==='dash'?'5 3':'2 3');
      }
      svg.appendChild(mark);
      const label=doc.createElementNS(ns,'text');
      label.setAttribute('x',item.x+24);label.setAttribute('y',item.y+1);label.setAttribute('fill',p.text);label.setAttribute('font-size',13);label.setAttribute('font-family','Arial, sans-serif');
      label.textContent=item.label;
      svg.appendChild(label);
    }
    for(let i=0;i<lines.length;i++){
      const t=doc.createElementNS(ns,'text');
      t.setAttribute('x','20');t.setAttribute('y',H+legendH+22+i*20);t.setAttribute('fill',p.text);t.setAttribute('font-size','13');t.setAttribute('font-family','Arial, sans-serif');
      t.textContent=lines[i];
      svg.appendChild(t);
    }
    return{content:new XMLSerializer().serializeToString(svg),width:W,height:H+captionH};
  }

  async function downloadChart(id,format){
    try{
      const svg=chartSVG(id),name=filename(chartJobs.get(id).title);
      if(format==='svg'){
        saveBlob(new Blob([svg.content],{type:'image/svg+xml;charset=utf-8'}),name+'.svg');
      }else{
        const url=URL.createObjectURL(new Blob([svg.content],{type:'image/svg+xml'})),img=new Image();
        await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
        const canvas=document.createElement('canvas');
        canvas.width=svg.width*2;canvas.height=svg.height*2;
        canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        URL.revokeObjectURL(url);
        const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
        if(!blob)throw Error('PNG generation failed; try the SVG export.');
        saveBlob(blob,name+'.png');
      }
      toast('Chart exported with period and source notes.');
    }catch(error){
      toast(error.message||'Chart export could not complete. Try SVG.');
    }
  }

  function tableColumns(id){
    const cfg=ctx.tables.configs.get(id),s=ctx.tables.state(id),active=s.columns||(cfg.presets?cfg.presets[s.preset]:cfg.columns.map(c=>c.key));
    utility('Table columns',`<div class="column-list">${cfg.columns.map(c=>`<label><input type="checkbox" data-column="${esc(c.key)}" ${active.includes(c.key)?'checked':''}>${esc(c.label)}</label>`).join('')}</div>`,`<button type="button" class="quiet-button" data-action="table-columns-reset" data-table="${id}">Default columns</button><button type="button" class="button" data-action="table-columns-apply" data-table="${id}">Apply columns</button>`);
  }

  function tableExport(id){
    const cfg=ctx.tables.configs.get(id),selectedRows=ctx.tables.selected(id),rows=selectedRows.length?selectedRows:ctx.tables.filtered(id);
    download(cfg.export?cfg.export(rows):rows,filename((selectedRows.length?'selected_':'matching_')+id));
  }

  function sourceExport(id){
    const meta=chartContext(id);if(!meta)return;
    download(meta.downloadRows||meta.rows||[],filename(meta.title));
  }

  function priceDetail(instrument,day){
    const row=model.priceMap.get(instrument+'|'+day);if(!row)return;
    const previous=model.priceMap.get(instrument+'|'+row.previous_session_date);
    const rawExport=model.priceExport.length>=2?model.priceExport(state,[row]):model.priceExport([row]);
    const exported={...rawExport[0],previous_close:previous?.close??null,previous_source_cell:previous?.source_cell??null};
    const id='price-record';
    sources.set(id,{title:C.SECTORS[instrument]+' · '+date(day),rows:[exported],preferredColumns:['date','instrument','close','previous_session_date','previous_close','daily_return_pct','source_cell','previous_source_cell','return_status'],definition:'Exact retained instrument-date source observation. Close is in index points; daily return is percent. '+(row.return_status==='available'&&previous?'Return = 100 × ('+row.close+' / '+previous.close+' − 1). ':'')+'No fill or cross-provider substitution.',scope:date(day)+' · '+C.SECTORS[instrument],unit:'Index points / return %',files:['data/daily_prices.csv'],limits:[row.eligible?'Eligible observed close.':(row.close_exclusion_reason||row.missingness_status).replaceAll('_',' '),'Return status: '+row.return_status.replaceAll('_',' ')]});
    ctx.readers.source(id);
  }

  function printView() {
    closeAll(true);
    requestAnimationFrame(() => window.print());
  }

  window.addEventListener('beforeprint', () => {
    printing = true;
    paintCharts();
  });
  window.addEventListener('afterprint', () => {
    printing = false;
    paintCharts();
  });

  document.addEventListener('click',async e=>{
    if(e.target.closest('a.skip-link')){e.preventDefault();$('#main').focus({preventScroll:true});$('#main').scrollIntoView({block:'start'});return;}
    const close=e.target.closest('[data-close]');if(close){closeDialog(close.dataset.close);return;}
    const step=e.target.closest('[data-walkthrough-step]');
    if(step&&walkthroughSteps.includes(step.dataset.walkthroughStep)){
      patch({page:'walkthrough',step:step.dataset.walkthroughStep},{push:true});
      requestAnimationFrame(() => {
        const heading = $('#walkthrough-step-title');
        if (!heading) return;
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      });
      return;
    }
    const nav = e.target.closest('a[data-page],button[data-page]');
    if (nav && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      closeMenu(false);
      navigatePage(nav.dataset.page, {
        studyView: nav.hasAttribute('data-study-results') ? (nav.dataset.studyResults || 'benchmarks') : undefined,
        studySample: nav.dataset.studySample,
        startWalkthrough: nav.hasAttribute('data-start-walkthrough'),
      });
      return;
    }
    const presetButton=e.target.closest('[data-preset]:not([data-action])');if(presetButton){preset(presetButton.dataset.preset);return;}
    const sort=e.target.closest('[data-table-sort]');if(sort){const s=ctx.tables.state(sort.dataset.table);if(s.sort===sort.dataset.tableSort)s.dir*=-1;else{s.sort=sort.dataset.tableSort;s.dir=1;}s.page=0;ctx.tables.update(sort.dataset.table);return;}
    const pageButton=e.target.closest('[data-table-page]');if(pageButton){ctx.tables.state(pageButton.dataset.table).page+=+pageButton.dataset.tablePage;ctx.tables.update(pageButton.dataset.table);return;}
    const exp=e.target.closest('[data-export]');
    if(exp){
      const sel=model.selection(state);
      if(exp.dataset.export==='announcements')download(model.eventExport(state),filename('announcements'));
      if(exp.dataset.export==='prices')download(model.priceExport.length>=2?model.priceExport(state,sel.prices):model.priceExport(sel.prices),filename('daily_source_rows_period_only'));
      if(exp.dataset.export==='forecasts') {
        const scope = forecastState();
        const suffix = local.forecastScope === 'saved' ? 'full_saved_evaluation' : state.from + '_' + state.to;
        download(model.selection(scope).predictions.filter(row => row.case === state.sample),
          'CBE_' + C.CASES[state.sample].replaceAll(' ', '_') + '_forecasts_' + suffix);
      }
      if(exp.dataset.export==='settings')download(viewSettings(),filename('view_settings'),'json');
      return;
    }
    const button=e.target.closest('[data-action]');if(!button)return;
    lastTriggerDescriptor=describeTrigger(button);
    if(button.closest('#sidebar'))closeMenu(false);
    const a=button.dataset.action,id=button.dataset.doc;
    if(a==='filters')openFilters();
    else if (a === 'search-statements') openSearch();
    else if (a === 'view-link') openViewLink();
    else if (a === 'copy-view-link') await copyViewLink();
    else if (a === 'reset-filters') {
      pendingFocusReturn = { selector: '#period-button' };
      patch({ ...defaultDates, ...(dateOnly() ? {} : { action: '', cohort: '' }) }, { preserveScroll: true, push: true });
    } else if (a === 'clear-statement-search') {
      local.policyQuery = '';
      render({ preserveScroll: true, push: true });
      $('#policy-search')?.focus();
    } else if (a === 'forecast-scope') {
      if (local.forecastScope === button.dataset.scope) return;
      local.forecastScope = button.dataset.scope;
      resetForecastDisplay();
      render({ preserveScroll: true, push: true });
    } else if (a === 'forecast-tab') {
      local.forecastTab = button.dataset.tab;
      render({ preserveScroll: false, push: true });
    } else if (a === 'policy-tab') {
      local.policyTab = button.dataset.tab;
      render({ preserveScroll: false, push: true });
    }
    else if(a==='quick-period'||a==='reset-period'){
      const[from,to]=presetRanges[a==='reset-period'?'all':button.dataset.preset]||presetRanges.modern;
      patch({from,to},{preserveScroll:true,push:true});
    }else if(a==='select-family'&&button.dataset.family){
      openForecastFamily(button.dataset.family, button.dataset.sector || local.forecastSector);
    }else if(a==='trace-demo'){
      ctx.readers.open(id||'central_bank_of_egypt_2024_06-03-2024');
    } else if (a === 'remove-filter') {
      const field = button.dataset.filter;
      const reset = field === 'dates' ? defaultDates : ['action', 'cohort'].includes(field) ? { [field]: '' } : null;
      if (reset) {
        pendingFocusReturn = { selector: '#period-button' };
        patch(reset, { preserveScroll: true, push: true });
      }
    }else if(a==='clear-filters'){
      local.policyQuery='';local.policyLanguage='';local.policyType='';
      patch({from:'1998-01-01',to:'2026-12-31',action:'',cohort:''},{preserveScroll:true,push:true});
    }else if(a==='files')files();
    else if(a==='source')ctx.readers.source(button.dataset.source);
    else if(a==='export')exportDialog();
    else if(a==='save-view')saveView();
    else if(a==='saved-views')manageViews();
    else if(a==='save-view-confirm'){
      const name=$('#saved-view-name').value.trim();
      if(!name){$('#saved-view-name').focus();return;}
      const view={...viewSettings(),name};
      savedViews.push(view);
      writeStorage(viewKey,savedViews);
      closeDialog('utility-dialog');
      toast('Research view saved.');
    }else if(a==='load-view'||a==='apply-view')applyView(savedViews[+button.dataset.index]);
    else if(a==='delete-view'){
      const index=+button.dataset.index,v=savedViews.splice(index,1)[0];
      writeStorage(viewKey,savedViews);
      manageViews();
      toast('Saved view removed.',()=>{savedViews.splice(index,0,v);writeStorage(viewKey,savedViews);if($('#utility-dialog').open)manageViews();});
    }else if(a==='import-view')$('#import-view-file').click();
    else if(a==='inspect')ctx.readers.open(id);
    else if(a==='select-doc'){
      if(id&&model.byId.has(id)){
        selected=id;
        if(button.dataset.openInspector==='true'){
          ctx.readers.open(id);
        }else{
          render({preserveScroll:true});
          if (state.page === 'policy' && local.policyTab === 'statements' && innerWidth <= 1030) {
            requestAnimationFrame(() => {
              const reader = $('#inline-reader');
              const title = reader?.querySelector('h2');
              if (title) {
                title.tabIndex = -1;
                title.focus({ preventScroll: true });
              }
              reader?.scrollIntoView({ block: 'start' });
            });
          }
        }
      }
    }else if(a==='selected-step'){
      const docs=model.selection(state).docs,i=docs.findIndex(d=>d.id===selected),d=docs[i+(+button.dataset.direction)];
      if(d)selectMeeting(d.id);
    }else if(a==='reader-step'){
      const docs=model.selection(forecastState()).docs,i=docs.findIndex(d=>d.id===id),d=docs[i+(+button.dataset.direction)];
      if(d){
        const activeTab=state.inspectTab||'statement';
        selected=d.id;
        if($('#inspector-dialog').open){
          state={...state,inspect:d.id,inspectTab:activeTab};
          ctx.readers.refresh(d.id,false);
          syncRoute();
        }else{
          state={...state,inspectTab:activeTab};
          render({preserveScroll:true});
        }
      }
    }else if(a==='inspector-tab'){
      state={...state,inspectTab:button.dataset.tab};
      ctx.readers.refresh(id,ctx.readers.docView(id)==='inline');
      syncRoute();
      const tab=document.querySelector(`[data-action="inspector-tab"][data-doc="${CSS.escape(id)}"][data-tab="${button.dataset.tab}"]`);
      tab?.focus({preventScroll:true});
    }else if(a==='reader-match')ctx.readers.moveMatch(id,+button.dataset.direction);
    else if(a==='compare')ctx.readers.compare(id);
    else if(a==='compare-mode'){ctx.readers.comparison.mode=button.dataset.mode;ctx.readers.renderCompare();}
    else if(a==='compare-step')ctx.readers.stepCompareChange(+button.dataset.direction);
    else if(a==='compare-quick')ctx.readers.quickCompareSelect(button.dataset.target);
    else if(a==='reader-export')download(ctx.readers.evidence(model.byId.get(id)).predictions,filename('announcement_forecasts'));
    else if(a==='market-tab'){local.marketTab=button.dataset.tab;render({preserveScroll:false,push:true});}
    else if(a==='data-tab'){local.dataTab=button.dataset.tab;render({preserveScroll:false,push:true});}
    else if(a==='notebook-period')patch({from:'2007-01-03',to:'2026-10-18'},{preserveScroll:false,push:true});
    else if(a==='forecast-step'){
      const dates=forecastDates(),i=dates.indexOf(local.forecastEvent);
      local.forecastEvent=dates[i+(+button.dataset.direction)]||local.forecastEvent;
      render({preserveScroll:true});
    }else if(a==='expand-chart'||a==='expand')expandChart(button.dataset.chart||button.dataset.expand);
    else if(a==='chart-export')chartExportDialog(button.dataset.chart);
    else if(a==='download-chart')await downloadChart(button.dataset.chart,button.dataset.format);
    else if(a==='reset-zoom'){
      zoomState.delete(button.dataset.chart);
      paintCharts();
      const caption=$('#zoom-'+button.dataset.chart);
      if(caption)caption.textContent='Zoom changes the chart view only.';
    }else if(a==='focus-date'){
      const chartId=button.dataset.chart,instance=chartInstances.get(chartId),axis=instance?.getOption().xAxis?.[0],day=chartId==='prediction-timeline'?local.forecastEvent:model.byId.get(selected)?.date;
      if(axis&&day){
        const min=Number(axis.min),max=Number(axis.max),center=Date.parse(day+'T12:00:00Z'),half=90*86400000,range=max-min;
        if(range>0){
          const start=Math.max(0,100*(center-half-min)/range),end=Math.min(100,100*(center+half-min)/range);
          zoomState.set(chartId,{start,end});
          paintCharts();
          const caption=$('#zoom-'+chartId);
          if(caption)caption.textContent=`Focused on ${date(day)} (±90 days) · analytical counts unchanged.`;
        }
      }
    }else if(a==='apply-zoom'){
      const instance=chartInstances.get(button.dataset.chart),axis=instance?.getOption().xAxis?.[0],z=instance?.getOption().dataZoom?.[0];
      if(axis&&z){
        const min=Number(axis.min),max=Number(axis.max),from=new Date(min+(max-min)*(z.start??0)/100).toISOString().slice(0,10),to=new Date(min+(max-min)*(z.end??100)/100).toISOString().slice(0,10);
        if (state.page === 'forecasts') {
          local.forecastScope = 'filtered';
          resetForecastDisplay();
        }
        patch({from,to},{preserveScroll:true,push:true});
        toast('Visible chart dates applied to the research filter.');
      }
    }else if(a==='table-columns'||a==='columns')tableColumns(button.dataset.table||button.dataset.columns);
    else if(a==='table-columns-apply'){
      const cols=$$('#utility-dialog [data-column]:checked').map(x=>x.dataset.column);
      if(!cols.length){toast('Keep at least one table column.');return;}
      ctx.tables.state(button.dataset.table).columns=cols;
      ctx.tables.update(button.dataset.table);
      closeDialog('utility-dialog');
    }else if(a==='table-columns-reset'){
      ctx.tables.state(button.dataset.table).columns=null;
      ctx.tables.update(button.dataset.table);
      closeDialog('utility-dialog');
    }else if(a==='clear-selection'){
      const tbl=button.dataset.table;
      if(tbl){ctx.tables.state(tbl).selected.clear();ctx.tables.update(tbl);}
    }else if(a==='table-export')tableExport(button.dataset.table);
    else if(a==='source-export')sourceExport(button.dataset.source);
    else if(a==='metadata-export'){
      const meta=chartContext(button.dataset.source);
      if(meta)download(metadata(meta),filename('metadata'),'json');
    }else if(a==='price-detail')priceDetail(button.dataset.instrument,button.dataset.date);
    else if(a==='print')printView();
  });

  document.addEventListener('input',e=>{
    const t=e.target;
    if(t.dataset.tableQuery){
      const id=t.dataset.tableQuery,s=ctx.tables.state(id);
      s.q=t.value;s.page=0;
      ctx.tables.update(id,true);
    }else if(t.id==='policy-search'){
      local.policyQuery=t.value;
      clearTimeout(policyTimer);
      policyTimer=setTimeout(()=>{
        const start=t.selectionStart,end=t.selectionEnd;
        render({preserveScroll:true});
        const next=$('#policy-search');
        next?.focus({preventScroll:true});
        next?.setSelectionRange(start,end);
      },130);
    }else if(t.dataset.readerSearch){
      ctx.readers.search(t.dataset.readerSearch,t);
    }
  });

  document.addEventListener('change',e=>{
    const t=e.target;
    if(t.hasAttribute('data-sample')||t.hasAttribute('data-reader-sample'))patch({sample:t.value},{preserveScroll:true,push:!t.hasAttribute('data-reader-sample')});
    else if(t.hasAttribute('data-family'))patch({family:t.value},{preserveScroll:true});
    else if(t.hasAttribute('data-metric'))patch({metric:t.value},{preserveScroll:true});
    else if(t.hasAttribute('data-market-mode'))patch({market:t.value},{preserveScroll:true});
    else if(t.dataset.instrument){
      const values=new Set(state.instruments);
      if(t.checked)values.add(t.dataset.instrument);else values.delete(t.dataset.instrument);
      patch({instruments:[...values]},{preserveScroll:true});
    }else if(t.hasAttribute('data-meeting-picker'))selectMeeting(t.value);
    else if(t.dataset.tablePreset){
      const id=t.dataset.tablePreset;
      ctx.tables.state(id).preset=t.value;
      ctx.tables.state(id).columns=null;
      ctx.tables.update(id);
    }else if(t.dataset.tableField){
      const s=ctx.tables.state(t.dataset.table);
      s[t.dataset.tableField]=t.value;s.page=0;
      ctx.tables.update(t.dataset.table,true);
    }else if(t.dataset.tableRow){
      const s=ctx.tables.state(t.dataset.table);
      if(t.checked)s.selected.add(t.dataset.tableRow);else s.selected.delete(t.dataset.tableRow);
      ctx.tables.update(t.dataset.table);
    }else if(t.dataset.tableAll){
      const id=t.dataset.tableAll,s=ctx.tables.state(id),cfg=ctx.tables.configs.get(id);
      for(const r of ctx.tables.filtered(id)){
        const key=String(cfg.rowKey(r));
        if(t.checked)s.selected.add(key);else s.selected.delete(key);
      }
      ctx.tables.update(id);
    }else if (t.id === 'forecast-sector') {
      local.forecastSector = t.value;
      render({ preserveScroll: true, push: true });
    }else if(t.id==='policy-language'){local.policyLanguage=t.value;render({preserveScroll:true});}
    else if(t.id==='policy-type'){local.policyType=t.value;render({preserveScroll:true});}
    else if(t.id==='compare-earlier'){ctx.readers.comparison.earlier=t.value;ctx.readers.renderCompare();}
    else if(t.id==='compare-selected'){ctx.readers.comparison.selected=t.value;ctx.readers.renderCompare();}
    else if(t.id==='compare-sync')ctx.readers.comparison.sync=t.checked;
    else if(t.id==='reference-table'){local.referenceTable=t.value;render({preserveScroll:true});}
    else if (t.hasAttribute('data-forecast-event')) {
      local.forecastEvent = t.value;
      render({ preserveScroll: true, push: true });
    }
  });

  document.addEventListener('keydown',e=>{
    if (e.key === 'Escape' && !e.isComposing && $('#search-dialog').open) {
      e.preventDefault();
      closeDialog('search-dialog');
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !$('#sidebar').classList.contains('open')) {
      if ($('#search-dialog').open) {
        e.preventDefault();
        closeDialog('search-dialog');
        return;
      }
      if (!document.querySelector('dialog[open]')) {
        e.preventDefault();
        openSearch();
        return;
      }
    }
    if(e.target.dataset?.readerSearch&&e.key==='Enter'){
      e.preventDefault();
      ctx.readers.moveMatch(e.target.dataset.readerSearch,e.shiftKey?-1:1);
      return;
    }
    if(e.target.closest('[role=tablist]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
      const tabs=[...e.target.closest('[role=tablist]').querySelectorAll('[role=tab]')],i=tabs.indexOf(e.target),n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      e.preventDefault();
      tabs[n]?.click();
      return;
    }
    if(e.key==='Escape'&&$('#sidebar').classList.contains('open'))closeMenu();
    if(e.key==='Tab'&&$('#sidebar').classList.contains('open')){
      const controls=[...$('#sidebar').querySelectorAll('a,button')].filter(el=>el.getClientRects().length),first=controls[0],last=controls.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });

  function queueChartResize() {
    cancelAnimationFrame(renderFrame);
    renderFrame=requestAnimationFrame(()=>{
      for (const instance of chartInstances.values()) {
        if (instance.getDom().clientWidth > 0) instance.resize();
      }
      paintCharts();
    });
  }

  window.addEventListener('resize',()=>{
    if(innerWidth>=900)closeMenu(false);
    queueChartResize();
  });

  window.addEventListener('error',e=>{runtimeErrors.push(e.message);document.body.dataset.runtimeErrors=JSON.stringify(runtimeErrors);});
  window.addEventListener('unhandledrejection',e=>{runtimeErrors.push(String(e.reason));document.body.dataset.runtimeErrors=JSON.stringify(runtimeErrors);});
  window.CBE_RESEARCH=Object.freeze({snapshot:()=>({state:{...state},selected,local:{...local},counts:{documents:model.selection(state).docs.length,cohort:model.selection(state).cohort.length,priceRows:model.selection(state).prices.length},performance:performanceLog.slice(),errors:runtimeErrors.slice(),charts:[...chartJobs.keys()]}),version:'2026-11-15-explorer-tools'});
  const initialComparisonParams=new URLSearchParams(location.hash.split('?')[1]||'');
  render();
  if(state.inspect&&model.byId.has(state.inspect)){ctx.readers.refresh(state.inspect,false);openDialog('inspector-dialog');openedInspectorViaPush=false;}
  restoreComparison(initialComparisonParams);
  document.fonts?.ready.then(()=>{paintCharts();});
}
