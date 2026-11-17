/* Interactive research views backed by the retained study. */
import { ChartPanel, ChartSurface } from '../Charts';
import { DataPanel, ResearchContent, ViewTabs } from '../Workspaces';
import { Icon } from '../icons';

const chartFields = {
  'policy-history': ['event_date', 'policy_action', 'bps', 'before', 'after', 'conditional'],
  'market-history': ['date', 'instrument', 'chart_value', 'chart_measure', 'close', 'daily_return_pct', 'source_cell'],
  'linked-timeline': ['date', 'series', 'value', 'unit', 'observed_change_bps', 'first_session', 'source_cell'],
  'prediction-timeline': ['event_date', 'first_session_date', 'family', 'variant', 'prediction_pp', 'actual_pp', 'training_events'],
  'annual-coverage': ['Year', 'Documents', 'Eligible', 'hike_n', 'cut_n', 'hold_n'],
};
const boxFields = ['series', 'n', 'low_whisker_1_5_iqr_pct', 'q1_pct', 'median_pct', 'q3_pct', 'high_whisker_1_5_iqr_pct'];
const fieldLabels = {
  date: 'Date', event_date: 'Meeting date', first_session_date: 'First session', first_session: 'First session',
  policy_action: 'Action', bps: 'Change (bps)', before: 'Before (%)', after: 'After (%)',
  conditional: 'Conditional level', instrument: 'Index', chart_value: 'Chart value', chart_measure: 'Measure',
  close: 'Close (points)', daily_return_pct: 'Daily return (%)', source_cell: 'Source cell',
  observed_change_bps: 'Change (bps)', family: 'Model', variant: 'Inputs', test_events: 'Meetings',
  training_events: 'Training meetings', MAE_pp: 'MAE (pp)', RMSE_pp: 'RMSE (pp)',
  direction_accuracy_pct: 'Direction accuracy (%)', balanced_direction_accuracy_pct: 'Balanced accuracy (%)',
  prediction_pp: 'Forecast (%)', actual_pp: 'Observed (%)', label: 'Model', n: 'Count',
  numerical: 'Numbers only (pp)', text_added: 'With text (pp)', difference: 'Change (pp)',
  low: '95% low (pp)', high: '95% high (pp)', hike_n: 'Increases', cut_n: 'Cuts', hold_n: 'Holds',
  low_whisker_1_5_iqr_pct: 'Low whisker (%)', high_whisker_1_5_iqr_pct: 'High whisker (%)',
  q1_pct: 'Q1 (%)', median_pct: 'Median (%)', q3_pct: 'Q3 (%)',
};
const inputLabels = { numerical: 'Numbers only', text_added: 'Numbers + text', reference: 'Reference' };

const chartNumber = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 6, useGrouping: false });

export function createWorkspaces(ctx) {
    const C = window.CBECore, U = window.CBEUI, V = window.CBECharts;
    const { esc, icon, fmt, signed, pct, date } = U;
    const m=ctx.model;
    const sourceFiles={policy:['data/original_text_inventory.csv','data/policy_rate_provenance_v2.csv'],market:['data/daily_prices.csv'],events:['data/event_sector_modeling.csv','data/common_event_cohort.csv'],forecasts:['data/predictions.csv','data/metrics.csv','data/paired_text_differences.csv']};
    const source=(title,rows,definition,files,extra={})=>({title,rows,definition,files,scope:ctx.scope(),...extra});
    function chartData(id) {
      const meta = ctx.sourceMetadata(id);
      const rows = meta.rows || [];
      let fields = chartFields[id];
      if (id.startsWith('model-')) {
        const metric = ctx.state().metric;
        fields = ['family', 'variant', 'test_events', metric.includes('direction') ? metric + '_pct' : metric];
      } else if (id.startsWith('paired-')) {
        fields = ['label', 'n', 'numerical', 'text_added', 'difference', 'low', 'high'];
      } else if (id.endsWith('-boxes')) {
        fields = boxFields;
      } else if (id.startsWith('hist-')) {
        fields = ['date', 'instrument', 'daily_return_pct', 'close', 'source_cell'];
      }

      const available = Object.keys(rows[0] || {});
      const keys = (fields || available.slice(0, 6)).filter(key => available.includes(key));
      const formatters = { instrument: C.SECTORS, family: C.FAMILIES, variant: inputLabels };
      const columns = (keys.length ? keys : available.slice(0, 6)).map(key => ({
        key,
        label: fieldLabels[key] || key.replaceAll('_', ' '),
        text: key !== 'n' && !C.numeric(rows[0]?.[key]),
        value: row => C.numeric(row[key]) ? Number(row[key]) : row[key],
        render: row => {
          const value = row[key];
          if (C.numeric(value) && !Number.isInteger(Number(value))) {
            const number = Number(value);
            const formatted = chartNumber.format(number);
            const shown = Number(formatted) === 0 ? number.toExponential(3) : formatted;
            return `<span title="${esc(value)}">${esc(shown)}</span>`;
          }
          return esc(formatters[key]?.[value] ?? value ?? '—');
        },
      }));
      const rowIds = new Map(rows.map((row, index) => [row, index]));
      return (
        <section className="chart-table-view" aria-label={meta.title + ' source rows'}>
          <div className="chart-data-scope">
            <p>{meta.scope}{meta.unit && <small>{meta.unit}</small>}</p>
            <button type="button" className="quiet-button" data-action="source" data-source={id}><Icon name="info" />Source notes</button>
            <button type="button" className="quiet-button" data-action="source-export" data-source={id} disabled={!rows.length}><Icon name="download" />Download CSV</button>
          </div>
          {rows.length ? ctx.tables.render('chart-data-' + id, {
            title: meta.title + ' source rows', rows, columns, rowKey: row => rowIds.get(row),
            pageSize: 8, controls: false, selectable: false, source: meta.files,
            definition: meta.definition, scope: meta.scope, scrollLabel: meta.title + ' table',
            caption: 'The CSV contains the original precision and all source columns.',
          }) : <p className="empty-state">No source rows in this view.</p>}
        </section>
      );
    }

    function chart(id, title, description, builder, meta, opts = {}) {
      ctx.sources.set(id, meta);
      if (!opts.empty) ctx.chartJobs.set(id, { id, title, builder, meta, type: opts.type || '', onClick: opts.onClick || null });
      return (
        <ChartPanel key={id} id={id} title={title} description={description}
          className={opts.class} chartClass={opts.chartClass} empty={opts.empty}
          controls={opts.before ? <ResearchContent markup={opts.before} /> : undefined}
          data={meta.rows?.length ? () => chartData(id) : undefined}
          reveal={() => ctx.revealChart(id)}
        >
          {!opts.empty && opts.after && <ResearchContent markup={opts.after} />}
          {opts.note && <p className="panel-note" dangerouslySetInnerHTML={{ __html: opts.note }} />}
        </ChartPanel>
      );
    }

    function instrumentLegend(checks=false){
      const s=ctx.state(),cues={banks:'●',real_estate:'◆',egx30:'■'},styles={banks:'',real_estate:'dash',egx30:'dot'};
      return`<div class="legend">${Object.entries(C.SECTORS).map(([k,t])=>checks?`<label><input type="checkbox" data-instrument="${k}" ${s.instruments.includes(k)?'checked':''}><i class="${styles[k]}" style="--series:var(--${k==='real_estate'?'real-estate':k})" aria-hidden="true"></i>${cues[k]} ${t}</label>`:`<span><i class="${styles[k]}" style="--series:var(--${k==='real_estate'?'real-estate':k})" aria-hidden="true"></i>${cues[k]} ${t}</span>`).join('')}</div>`;
    }
    const forecastLegend=()=>U.forecastLegend();
    function zoomControls(id) {
      const isForecast = id === 'prediction-timeline';
      return `<div class="chart-view-controls">
        <span class="zoom-caption" id="zoom-${id}">Zoom changes the chart view only.</span>
        <div class="chart-zoom-buttons">
          <button type="button" class="quiet-button" data-action="focus-date" data-chart="${id}">Focus ${isForecast ? 'forecast' : 'selected'} meeting</button>
          <button type="button" class="quiet-button" data-action="reset-zoom" data-chart="${id}">Reset zoom</button>
          <button type="button" class="quiet-button" data-action="apply-zoom" data-chart="${id}">Use visible dates as filter</button>
        </div>
      </div>`;
    }

    function meetingPicker(docs, selected, label) {
      if (!docs.length) return null;
      return (
        <label className="field-inline">{label}
          <select id="timeline-meeting" data-meeting-picker defaultValue={selected ?? ''} key={selected}>
            {docs.slice().reverse().map(doc => (
              <option key={doc.id} value={doc.id}>{date(doc.date)}</option>
            ))}
          </select>
        </label>
      );
    }

    function selectedMeeting(doc) {
      if (!doc) return <aside className="announcement-rail"><h3>No meetings in this selection</h3><p>Market prices may still be available for the selected dates.</p></aside>;
      const rate = m.rates.get(doc.id);
      return (
        <aside className="announcement-rail meeting-summary">
          <h3>{date(doc.date)}</h3>
          <dl>
            <div><dt>Observed rate change</dt><dd>{C.numeric(rate?.bps) ? signed(rate.bps, 0) + ' bps' : '—'}</dd></div>
            {['banks', 'real_estate'].map(sector => {
              const value = doc.inAnalysis ? m.events.get(doc.id + '|' + sector)?.first_session_return_pct : null;
              return <div key={sector}><dt>{C.SECTORS[sector]} first-session return</dt><dd>{C.numeric(value) ? signed(value, 3) + '%' : '—'}</dd></div>;
            })}
          </dl>
          {!doc.inAnalysis && <p className="tiny-note">Outside the matched analysis cohort.</p>}
          <button type="button" className="quiet-button" data-action="inspect" data-doc={doc.id}>Open meeting evidence <Icon name="arrow" /></button>
        </aside>
      );
    }

    function announcementTable(id='announcements',onlyCohort=false){
      const s=ctx.state(),docs=m.selection(s).docs.filter(d=>!onlyCohort||d.inAnalysis),get=(d,sector)=>m.events.get(d.id+'|'+sector),getRate=d=>m.rates.get(d.id),returnCell=(d,sector)=>d.inAnalysis?signed(get(d,sector)?.first_session_return_pct)+'%':'—';
      const columns=[{key:'date',label:'Meeting date',text:true,value:d=>d.date,render:d=>`<button class="row-link" data-action="inspect" data-doc="${esc(d.id)}">${date(d.date)}<span aria-hidden="true">↗</span></button>`},{key:'action',label:'Policy action',text:true,value:d=>getRate(d)?.bps,render:d=>U.decision(d,m)},{key:'after',label:'Deposit · %',value:d=>getRate(d)?.after,render:d=>C.numeric(getRate(d)?.after)?fmt(getRate(d).after)+(getRate(d).conditional?' ◇':''):'—'},{key:'banks',label:'Banks · %',value:d=>d.inAnalysis?C.number(get(d,'banks')?.first_session_return_pct):null,render:d=>returnCell(d,'banks')},{key:'real_estate',label:'Real Estate · %',value:d=>d.inAnalysis?C.number(get(d,'real_estate')?.first_session_return_pct):null,render:d=>returnCell(d,'real_estate')},{key:'firstSession',label:'First session',value:d=>d.firstSession,render:d=>date(d.firstSession)},{key:'status',label:'Analysis status',text:true,value:d=>d.inAnalysis?'In analysis':'Outside analysis',render:U.status},{key:'language',label:'Text source',text:true,value:d=>d.language,render:d=>esc(d.language)},{key:'words',label:'Words',value:d=>+d.words,render:d=>fmt(d.words,0)},{key:'source',label:'Original',text:true,render:d=>`<a class="row-source" href="${esc(d.original)}" target="_blank" rel="noopener" aria-label="Original PDF for ${date(d.date)}">PDF ↗</a>`}];
      return (
        <DataPanel title={onlyCohort ? 'Matched event outcomes' : 'Matching announcements'} description={onlyCohort ? 'First actual session after each eligible meeting.' : 'Select a date to inspect the statement, rate, prices, and forecasts.'} source={'table-' + id} className="table-panel">
          {ctx.tables.render(id,{title:onlyCohort?'matched event outcomes':'announcements',rows:docs,rowKey:d=>d.id,rowLabel:d=>date(d.date),columns,defaultSort:'date',defaultDir:-1,pageSize:onlyCohort?15:10,presets:{'Decisions & returns':['date','action','after','banks','real_estate','firstSession','status','source'],'Market response':['date','firstSession','banks','real_estate','action'],'Sources & eligibility':['date','language','words','status','source']},source:sourceFiles.events,definition:'Selected retained announcements. Event returns use the preceding sector-index close and first eligible session strictly after the recorded meeting date.',search:d=>[d.date,date(d.date),d.text,m.action(d),d.id,d.language].join(' '),placeholder:'Search dates, decisions or statement wording…',export:rows=>m.eventExport(s,rows),caption:'Returns are percentages. ◇ marks a conditional deposit level. Search includes statement wording; source exclusions remain available in the announcement inspector.'})}
        </DataPanel>
      );
    }
    function linkedTimeline(){
      const s=ctx.state(),data=m.selection(s),id=ctx.selectedId(),metaRows=data.docs.map(d=>{const r=m.rates.get(d.id);return{meeting_date:d.date,doc_id:d.id,deposit_after_pct:r?.after,observed_change_bps:r?.bps,conditional_level:r?.conditional,first_session:d.firstSession};});
      const timelineRows=[...metaRows.map(r=>({record_type:'policy',date:r.meeting_date,series:'Deposit after',value:r.deposit_after_pct,unit:'percent',doc_id:r.doc_id,observed_change_bps:r.observed_change_bps,conditional_level:r.conditional_level,first_session:r.first_session,close_index_points:null,daily_return_pct:null,source_cell:null})),...m.marketSeries(s).flatMap(g=>g.rows.filter(r=>r.raw).map(r=>({record_type:'market',date:r.date,series:C.SECTORS[g.instrument],value:r.value,unit:s.market==='indexed'?'segment base 100':s.market==='level'?'index points':'return percent',doc_id:null,observed_change_bps:null,conditional_level:null,first_session:null,close_index_points:r.raw.close,daily_return_pct:r.raw.daily_return_pct,source_cell:r.raw.source_cell})))];
      const meta=source('Policy and market timeline',timelineRows,'Recorded meeting-date rate observations and eligible Refinitiv market context share a calendar axis. The selected meeting and its first session are different dates.',[...sourceFiles.policy,...sourceFiles.market],{unit:'Deposit % · rebased index / points / return %',limits:['Market context uses period only; action/cohort restrict the announcement observations.','Rate levels are observations at retained meetings, not an effective-date schedule.','Sector definitions change in January 2020. Rebased series restart together; missing values and long gaps break the lines.']});
      ctx.sources.set('linked-timeline',meta);ctx.chartJobs.set('linked-timeline',{id:'linked-timeline',title:'Policy and market timeline',builder:(p,small)=>V.timeline(m,s,id,p,small),meta,onClick:p=>{if(p.data?.docId)ctx.selectMeeting(p.data.docId);},type:'timeline'});
      return (
        <ChartPanel id="linked-timeline" title="Policy and market timeline"
          description="Follow a meeting to the original statement, first-session returns, and saved forecasts."
          data={timelineRows.length ? () => chartData('linked-timeline') : undefined}
          reveal={() => ctx.revealChart('linked-timeline')}
          chart={(
            <>
          <div className="legend">
            <span><i style={{ '--series': 'var(--series-deposit)' }} />Deposit rate (%)</span>
            <span><i className="dash" style={{ '--series': 'var(--real-estate)' }} />Conditional level ◇</span>
          </div>
          <div className="control-row">
            {meetingPicker(data.docs, id, 'Select a meeting')}
            <label className="field-inline">Market measure
              <select data-market-mode defaultValue={s.market} key={s.market}>
                <option value="indexed">Rebased to 100</option>
                <option value="level">Index points</option>
                <option value="return">Daily return (%)</option>
              </select>
            </label>
          </div>
          <ResearchContent markup={instrumentLegend(true)} />
          <div className="timeline-layout">
            <div className="timeline-main">
              <ChartSurface id="linked-timeline" className="timeline-chart" title="Aligned deposit-rate observations and market history" />
              <ResearchContent markup={zoomControls('linked-timeline')} />
            </div>
            {selectedMeeting(m.byId.get(id))}
          </div>
            </>
          )}>
          <p className="panel-note">Market context uses the selected period. Rebased lines start at the first common eligible date in each index-definition segment. The policy series shows observed actions.</p>
        </ChartPanel>
      );
    }
    function policy() {
      const tab = ctx.local.policyTab;
      return (
        <>
          <ViewTabs label="Policy views" action="policy-tab" selected={tab}
            options={[[ 'statements', 'Statements', 'policy' ], [ 'records', 'Announcement records', 'calendar' ], [ 'rates', 'Rate history', 'markets' ]]} />
          {tab === 'records' ? announcementTable() : tab === 'rates' ? policyHistory() : statements()}
        </>
      );
    }

    function statements() {
      const s = ctx.state(), l = ctx.local;
      const query = String(l.policyQuery || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const longDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
      const docs = m.selection(s).docs.filter(doc => {
        if (l.policyLanguage && doc.language !== l.policyLanguage) return false;
        if (l.policyType && doc.type !== l.policyType) return false;
        if (!query) return true;
        const full = longDate.format(new Date(doc.date + 'T12:00:00Z'));
        return [doc.date, date(doc.date), full, doc.type, doc.text, m.action(doc)]
          .join(' ').toLowerCase().replace(/\s+/g, ' ').includes(query);
      }).slice().reverse();
      let d=docs.find(x=>x.id===ctx.selectedId())||docs[0];if(d)ctx.setSelected(d.id);
      return (
        <>
          <div className="policy-layout">
            <aside className="policy-list" aria-label="Find a policy document">
              <div className="policy-list-controls">
                <label className="statement-search-label">
                  Search by date or wording
                  <span className="search-field">
                    <Icon name="search" />
                    <input id="policy-search" type="search" placeholder="Search statements…" defaultValue={l.policyQuery} key={l.policyQuery} />
                  </span>
                </label>
                <details className="statement-options" open={Boolean(l.policyLanguage || l.policyType) || undefined}>
                  <summary>Language and document type</summary>
                  <label>Language
                    <select id="policy-language" defaultValue={l.policyLanguage} key={l.policyLanguage}>
                      <option value="">All text sources</option>
                      {[...new Set(m.docs.map(doc => doc.language))].map(language => <option key={language}>{language}</option>)}
                    </select>
                  </label>
                  <label>Document type
                    <select id="policy-type" defaultValue={l.policyType} key={l.policyType}>
                      <option value="">All document types</option>
                      {[...new Set(m.docs.map(doc => doc.type))].map(type => <option key={type}>{type}</option>)}
                    </select>
                  </label>
                </details>
                <p role="status">{docs.length} {query ? 'matching statements' : 'statements and notices'}</p>
                {query && <button type="button" className="text-button" data-action="clear-statement-search">Clear search</button>}
              </div>
              <div className="statement-results">
                <h2 className="statement-list-title">{query ? 'Search results' : 'Recent statements'}</h2>
                <div className="document-list">
                  {docs.map(doc => (
                    <button type="button" key={doc.id} data-action="select-doc" data-doc={doc.id} aria-current={doc.id === d?.id}>
                      <span className="doc-row-heading">
                        <span>{date(doc.date)}</span>
                        <span dangerouslySetInnerHTML={{ __html: U.decision(doc, m) }} />
                      </span>
                      <span className="doc-row-subtitle">{doc.language} · {doc.inAnalysis ? 'In analysis' : 'Outside analysis'}</span>
                    </button>
                  ))}
                  {!docs.length && <p className="note">No matching policy documents.</p>}
                </div>
              </div>
            </aside>
            <article className="statement-preview" id="inline-reader" aria-label="Selected policy statement"
              dangerouslySetInnerHTML={{ __html: d ? ctx.readers.html(d, true) : U.empty('No statement selected', 'Change the document search or research filters.', 'filters') }} />
          </div>
        </>
      );
    }

    function policyHistory() {
      const s = ctx.state();
      const docs = m.selection(s).docs;
      const rateRows = docs.map(doc => ({
        event_date: doc.date, doc_id: doc.id, policy_action: m.action(doc), ...m.rates.get(doc.id),
        filter_scope: s.from + '..' + s.to, source_file: 'policy_rate_provenance_v2.csv;original_text_inventory.csv',
      }));
      return (
        <>
          <div className="control-row">{meetingPicker(docs, ctx.selectedId(), 'Select a meeting')}</div>
          {chart('policy-history', 'Deposit rates and policy decisions',
            'The lines show deposit levels at meetings. Bars show signed changes in basis points.',
            (palette, small) => V.policy(m, s, palette, small),
            source('Policy levels and actions', rateRows,
              'The level shown is the rate after the retained decision. The record inspector explains how before-rates are derived.',
              sourceFiles.policy, {
                unit: 'Deposit rate (%) · change (bps)',
                limits: ['The 5 November 2009 level of 8.25% is conditional on continuity.', 'The 5 October 2005 decision held the deposit rate and cut the lending rate.', 'Release clocks and text versions remain unverified.'],
              }), {
              chartClass: 'timeline-chart',
              before: '<div class="legend"><span><i style="--series:var(--series-deposit)"></i>Deposit after (%)</span><span><i style="--series:var(--real-estate)" class="dash"></i>Conditional level ◇</span><span><i style="--series:var(--hike)"></i>Increase (bps)</span><span><i style="--series:var(--cut)"></i>Cut (bps)</span><span><i style="--series:var(--hold)"></i>Hold (0 bps)</span></div>',
              empty: !rateRows.some(row => C.numeric(row.after) || C.numeric(row.bps)) ? 'No policy observations in this selection' : null,
              after: zoomControls('policy-history'),
              onClick: point => { if (point.data?.docId) ctx.readers.open(point.data.docId); },
            })}
        </>
      );
    }

    function priceTable(){
      const s=ctx.state(),rows=m.selection(s).prices;
      const reasons=r=>r.eligible?'Eligible close':r.close_exclusion_reason==='latest_export_bar_finality_unverified'?'Unverified final bar':(r.close_exclusion_reason||r.missingness_status).replaceAll('_',' ');
      return (
        <DataPanel title={'Daily market records'} description={'Exact retained closes, daily returns, eligibility flags, and source cells.'} source={'table-prices'} className="table-panel">
          {ctx.tables.render('prices',{title:'daily price records',rows,rowKey:r=>r.instrument+'|'+r.date,rowLabel:r=>C.SECTORS[r.instrument]+' '+date(r.date),defaultSort:'date',defaultDir:-1,pageSize:15,priceFilters:true,columns:[{key:'date',label:'Observation date',text:true,render:r=>`<button class="row-link" data-action="price-detail" data-instrument="${r.instrument}" data-date="${r.date}">${date(r.date)}<span>↗</span></button>`},{key:'instrument',label:'Instrument',text:true,render:r=>C.SECTORS[r.instrument]},{key:'value',label:'Close · points',render:r=>fmt(r.value)},{key:'returnValue',label:'Daily return · %',render:r=>signed(r.returnValue,3)},{key:'sector_definition',label:'Definition',text:true,render:r=>r.instrument==='egx30'?'EGX30':r.sector_definition==='legacy_2007'?'Legacy':'Modern'},{key:'eligible',label:'Status',text:true,render:r=>`<span class="badge ${r.eligible?'eligible':'excluded'}">${esc(reasons(r))}</span>`},{key:'source_cell',label:'Source cell',text:true,render:r=>`<span class="mono">${esc(r.source_cell||'—')}</span>`},{key:'previous_session_date',label:'Previous session',render:r=>date(r.previous_session_date)},{key:'return_status',label:'Return status',text:true,render:r=>esc(r.return_status.replaceAll('_',' '))}],presets:{'Price & return':['date','instrument','value','returnValue','eligible','source_cell'],'Source & eligibility':['date','instrument','sector_definition','eligible','source_cell','previous_session_date','return_status']},filter:(r,l)=>(!l.instrument||r.instrument===l.instrument)&&(l.status==='all'||(l.status==='eligible')===r.eligible)&&(!C.numeric(l.min)||r.returnValue!=null&&r.returnValue>=+l.min)&&(!C.numeric(l.max)||r.returnValue!=null&&r.returnValue<=+l.max),search:r=>[r.date,date(r.date),C.SECTORS[r.instrument],r.close,r.daily_return_pct,r.source_cell,r.return_status,r.close_exclusion_reason].join(' '),export:r=>m.priceExport(s,r),source:sourceFiles.market,scope:U.period(s)+' · daily observations; period only',definition:'Source instrument-date records in the selected period. Eligible closes exclude documented calendar/definition/finality issues. Raw daily return fields retain their original calculation and flags.',caption:'Daily source returns can use a preceding session outside the selected period. The descriptive daily-return views require both endpoints inside it. Missing and excluded records are never filled.'})}
        </DataPanel>
      );
    }
    function stats(id,groups,definition,unit=''){
      ctx.sources.set(id,source(definition,U.statsRows(groups),definition+'; quartiles use linear interpolation. Empty/single-record SD is unavailable.',sourceFiles.market,{scope:U.period(ctx.state())+' · period only'}));
      return U.statsTable(groups,definition,unit);
    }
    function marketHistory(){
      const s=ctx.state(),series=m.marketSeries(s),rows=series.flatMap(g=>g.rows.filter(r=>r.raw).map(r=>({date:r.date,instrument:g.instrument,chart_value:r.value,chart_measure:s.market,close:r.raw.close,daily_return_pct:r.raw.daily_return_pct,eligible_close:r.raw.eligible_close,sector_definition:r.raw.sector_definition,source_cell:r.raw.source_cell,filter_scope:s.from+'..'+s.to,source_file:'daily_prices.csv'}))),has=rows.some(r=>r.chart_value!=null);
      const note=s.market==='indexed'?'100 × close / close on the first common eligible date for selected available instruments in each pre/post-2020 segment. All series restart at the January 2020 definition boundary.':s.market==='level'?'Raw index points are shown on one axis. Sector-index levels are not comparable across the January 2020 definition change.':'Retained daily close-to-close returns. This is daily context, separate from first-session event outcomes.';
      const spansBreak=s.from<'2020-01-02'&&s.to>='2020-01-02';
      let statGroups,statDef,statUnit,statTitle,statSubtitle;
      if(s.market==='indexed'){
        statTitle='Selected-period rebased index statistics (base = 100)';
        statSubtitle='Summarizes the plotted rebased index values within the active period.';
        statDef='Rebased index values (segment base = 100 at first common eligible date in each pre/post-2020 segment) · sample SD uses n−1';
        statUnit=' · base 100';
        statGroups=series.map(g=>({label:C.SECTORS[g.instrument]+' (rebased)',stats:C.summarize(g.rows.filter(r=>!r.gap&&C.numeric(r.value)).map(r=>r.value))}));
      }else if(s.market==='return'){
        statTitle='Selected-period daily return statistics (%)';
        statSubtitle='Eligible daily close-to-close returns with both endpoints inside the selected period.';
        statDef='Daily close-to-close returns (%) · sample SD uses n−1';
        statUnit=' · %';
        statGroups=s.instruments.map(k=>({label:C.SECTORS[k],stats:C.summarize(m.daily(s,k,'return').map(r=>r.returnValue))}));
      }else{
        statTitle='Selected-period price-level statistics (index points)';
        statSubtitle=spansBreak?'Pre-2020 Legacy and post-2020 Modern sector index levels are separated across the January 2020 index redefinition.':'Eligible observed closes; each instrument retains its available dates.';
        statDef='Index points · sample SD uses n−1 (Legacy and Modern sector regimes kept separate across Jan 2020)';
        statUnit=' · points';
        statGroups=s.instruments.flatMap(k=>{
          const lv=m.daily(s,k,'level');
          if(spansBreak&&k!=='egx30'){
            return[
              {label:C.SECTORS[k]+' · Legacy (pre-2020)',stats:C.summarize(lv.filter(r=>r.date<'2020-01-02').map(r=>r.value))},
              {label:C.SECTORS[k]+' · Modern (2020+)',stats:C.summarize(lv.filter(r=>r.date>='2020-01-02').map(r=>r.value))}
            ];
          }
          return[{label:C.SECTORS[k],stats:C.summarize(lv.map(r=>r.value))}];
        });
      }
      return (
        <>
          <div className="control-row">
            <label className="field-inline">Measure
              <select data-market-mode defaultValue={s.market} key={s.market}>
                <option value="indexed">Rebased to 100</option>
                <option value="level">Index points</option>
                <option value="return">Daily return (%)</option>
              </select>
            </label>
          </div>
          <p className="scope-note">Index levels and daily returns use the selected observation dates. Meeting filters apply to the first-session and linked-timeline views.</p>
          {chart('market-history','Market history',s.market==='indexed'?'Comparable starts within each index-definition segment.':'Refinitiv .EGBANK, .EGREAL and .EGX30 closes.',p=>V.market(m,s,p),source('Market history',rows,note,sourceFiles.market,{unit:s.market==='level'?'Index points':s.market==='return'?'Return %':'Segment base = 100',scope:U.period(s)+' · daily observations; period only',limits:['Missing values, gaps over seven days and definition boundaries break lines.','Final unverified export bars are excluded.','Select EGX30 alone to reveal its longer history.']}),{chartClass:'chart large-chart',before:instrumentLegend(true),empty:!has?(s.instruments.length?'No eligible market series in this period':'Select at least one instrument'):null,after:zoomControls('market-history'),note:esc(note)})}
          <DataPanel title={statTitle} description={statSubtitle} source="price-stats">
            <div className="panel-body"><ResearchContent markup={stats('price-stats', statGroups, statDef, statUnit)} /></div>
          </DataPanel>
          {priceTable()}
        </>
      );
    }
    function dailyDistribution(){
      const s=ctx.state(),groups=s.instruments.map(k=>({instrument:k,label:C.SECTORS[k],rows:m.daily(s,k),stats:C.box(m.daily(s,k).map(r=>r.returnValue)),hist:C.histogram(m.daily(s,k).map(r=>r.returnValue),m.X.hist.edges)})),max=Math.max(0,...groups.flatMap(g=>g.hist.counts));
      const boxSummaryRows=m.boxExport(s,groups,'daily_prices.csv'),baseDef='Daily returns with both observation date and preceding session inside the selected period. Sample SD uses n−1; quartiles use linear interpolation; whiskers end at 1.5×IQR.';
      return (
        <>
          <p className="scope-note">Both return endpoints must be in the selected period ({U.period(s)}). To reproduce the notebook's daily tables, use <button type="button" className="text-button inline-period-link" data-action="notebook-period">3 Jan 2007–18 Oct 2026</button>.</p>
          <ResearchContent markup={instrumentLegend(true)} />
          <div className="distribution-grid" style={{ margin: '18px 0 23px' }}>
            {groups.map(g => chart('hist-'+g.instrument,g.label+' daily returns',fmt(g.stats.n,0)+' valid returns · 0% boundary marked',p=>V.distribution(g.hist,p,g.instrument,max),source(g.label+' daily histogram',m.priceExport(s,g.rows),baseDef,sourceFiles.market,{unit:'Return % · one-percentage-point bins',scope:U.period(s)+' · period only'}),{chartClass:'chart histogram-chart',empty:!g.stats.n?'No valid daily returns':null}))}
            {!groups.length && <p className="note">Choose at least one instrument.</p>}
          </div>
          {chart('daily-boxes','Daily return distributions','Middle 50% (Q1–Q3), median, 1.5×IQR whiskers and all retained outliers.',p=>V.boxes(groups.filter(g=>g.stats.n),p),source('Daily return boxplots',boxSummaryRows,baseDef+' Whiskers end at the most extreme observed value within 1.5 IQR of the quartiles; outliers are plotted individually.',sourceFiles.market,{unit:'Return %',scope:U.period(s)+' · period only'}),{chartClass:'chart box-chart',empty:!groups.some(g=>g.stats.n)?'No valid daily returns':null,note:'Whiskers are 1.5×IQR bounds, not minima/maxima. Both 1.5×IQR whiskers and exact minima/maxima appear in the table below.'})}
          <DataPanel title="Daily return statistics (including 1.5×IQR whiskers)" description="Descriptive summaries from the current period." source="daily-stats">
            <div className="panel-body"><ResearchContent markup={stats('daily-stats', groups, baseDef, ' · %')} /></div>
          </DataPanel>
        </>
      );
    }
    function eventOutcomes(){
      const s=ctx.state(),groups=['banks','real_estate'].map(k=>{const rows=m.outcomes(s,k);return{instrument:k,label:C.SECTORS[k],rows,stats:C.box(rows.map(r=>r.first_session_return_pct))};}),rows=groups.flatMap(g=>g.rows);
      const boxSummaryRows=m.boxExport(s,groups,['event_sector_modeling.csv','common_event_cohort.csv']);
      const summary=groups.map(g=>({Sector:g.label,n:g.stats.n,mean:g.stats.mean,median:g.stats.median,sd:g.stats.sd,min:g.stats.min,low_whisker_1_5_iqr:g.stats.whiskerLow,q1:g.stats.q1,q3:g.stats.q3,high_whisker_1_5_iqr:g.stats.whiskerHigh,max:g.stats.max,Positive:g.rows.filter(r=>+r.first_session_return_pct>0).length,Negative:g.rows.filter(r=>+r.first_session_return_pct<0).length,Zero:g.rows.filter(r=>+r.first_session_return_pct===0).length}));
      ctx.sources.set('event-stats',source('First-session return statistics',summary,'Matched analysis cohort only. The return is 100 × (first-session close / preceding-session close − 1). Sample SD uses n−1 and quartiles use linear interpolation.',sourceFiles.events,{unit:'Return %',limits:['Meeting-date selection also includes a first session that may fall after the upper meeting-date bound.','Timing alone does not establish a causal communication effect.']}));
      return (
        <>
          <p className="scope-note">First-session outcomes use matched analysis-cohort meetings in {U.scope(s)}.</p>
          {chart('event-boxes','First-session sector returns','Compare both sectors on the same return scale after eligible MPC meetings.',p=>V.boxes(groups.filter(g=>g.stats.n),p),source('First-session return distributions',boxSummaryRows,'First actual eligible session strictly after each matched recorded meeting date. Boxes show Q1/median/Q3; whiskers use 1.5 IQR and outliers remain visible.',sourceFiles.events,{unit:'Return %',limits:['Small, dependent event samples and overlapping evaluations limit interpretation.','Descriptive association is not a causal wording effect.']}),{chartClass:'chart box-chart',empty:!rows.length?'No matched event outcomes':null,note:'Export and keyboard inspection report exact 5-number boxplot summaries and 1.5×IQR whiskers.'})}
          <DataPanel title="Event-return statistics and direction" description="Quartiles, extrema, 1.5×IQR whiskers, and exact sign counts." source="event-stats">
            <div className="panel-body">
              <ResearchContent markup={U.statsTable(groups, 'First-session returns · %', ' · %')} />
              <ResearchContent markup={U.simpleTable(['Sector', 'Positive', 'Negative', 'Exactly flat'], summary.map(r => [r.Sector, fmt(r.Positive, 0), fmt(r.Negative, 0), fmt(r.Zero, 0)]))} />
            </div>
          </DataPanel>
          {announcementTable('outcomes', true)}
        </>
      );
    }
    function markets() {
      const tab = ctx.local.marketTab;
      return (
        <>
          <ViewTabs label="Market views" action="market-tab" selected={tab}
            options={[[ 'history', 'Price history', 'markets' ], [ 'daily', 'Daily returns', 'data' ], [ 'event', 'First-session outcomes', 'forecasts' ], [ 'linked', 'Policy and market timeline', 'link' ]]} />
          {{ history: marketHistory, daily: dailyDistribution, event: eventOutcomes, linked: linkedTimeline }[tab]()}
        </>
      );
    }

    const forecastMetrics = {
      MAE_pp: 'Mean absolute error (MAE)',
      RMSE_pp: 'Root mean squared error (RMSE)',
      direction_accuracy: 'Direction accuracy',
      balanced_direction_accuracy: 'Balanced direction accuracy',
    };
    const forecastSectors = ['banks', 'real_estate'];

    function forecasts() {
      const s = ctx.forecastState();
      const { forecastScope, forecastTab } = ctx.local;
      const saved = forecastScope === 'saved';
      const predictions = m.selection(s).predictions.filter(row => row.case === s.sample);
      const count = new Set(predictions.map(row => row.doc_id)).size;
      const fullCount = Number(m.fullScores(s.sample, 'banks')[0]?.test_events);
      const metric = forecastTab === 'text' && s.metric !== 'RMSE_pp' ? 'MAE_pp' : s.metric;
      const metricKeys = forecastTab === 'text' ? ['MAE_pp', 'RMSE_pp'] : Object.keys(forecastMetrics);
      return (
        <>
          <div className="result-settings panel">
            <div className="forecast-controls">
              <div className="segmented" role="group" aria-label="Results scope">
                <button type="button" data-action="forecast-scope" data-scope="saved" aria-pressed={saved}>Saved evaluation</button>
                <button type="button" data-action="forecast-scope" data-scope="filtered" aria-pressed={!saved}>Filtered meetings</button>
              </div>
              <label className="field">Evaluation
                <select data-sample defaultValue={s.sample} key={s.sample}>
                  {Object.entries(C.CASES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              {forecastTab !== 'meeting' && <label className="field">Measure
                <select data-metric defaultValue={metric} key={metric}>
                  {metricKeys.map(key => <option key={key} value={key}>{forecastMetrics[key]}</option>)}
                </select>
              </label>}
            </div>
            <p className="result-scope" role="status">
              <strong>{saved ? 'Saved evaluation' : 'Filtered meetings'}</strong>
              {' · '}{saved ? count : count + ' of ' + fullCount} scored meetings per sector
              {!saved && count < fullCount && <span> · Saved intervals apply to the full scored set.</span>}
            </p>
          </div>
          <ViewTabs label="Forecast views" action="forecast-tab" selected={forecastTab}
            options={[[ 'benchmarks', 'Benchmarks', 'forecasts' ], [ 'text', 'What text changed', 'compare' ], [ 'meeting', 'Forecasts by meeting', 'calendar' ]]} />
          {!count ? (
            <ResearchContent markup={U.empty('No saved forecasts in this selection', 'Try a wider range, clear meeting filters, or open the saved evaluation.', 'filters')} />
          ) : forecastTab === 'meeting' ? meetingResults(s, predictions) :
            forecastTab === 'text' ? textResults({ ...s, metric }) : benchmarkResults(s)}
        </>
      );
    }

    function benchmarkResults(s) {
      const groups = forecastSectors.map(sector => ({ sector, rows: m.scores(s, sector) }));
      const allRows = groups.flatMap(group => group.rows);
      const direction = s.metric.includes('direction');
      const metricLabel = forecastMetrics[s.metric];
      const values = allRows.filter(row => C.numeric(row[s.metric])).map(row => Number(row[s.metric]));
      const max = direction ? 100 : Math.ceil(Math.max(0, ...values) * 2.3) / 2 || 1;
      const panels = groups.map(({ sector, rows }) => {
        const zero = rows.find(row => row.family === 'zero_return');
        const mean = rows.find(row => row.family === 'historical_mean');
        const value = row => direction ? pct(row?.[s.metric]) : fmt(row?.[s.metric], 3) + ' pp';
        return chart('model-' + sector, C.SECTORS[sector], metricLabel,
          (palette, small) => V.forecasts(rows, s, palette, max, small),
          source(C.SECTORS[sector] + ' forecast comparison', m.scoreExport(s, rows),
            direction ? 'Direction uses meetings with a non-flat return. Balanced accuracy averages the up and down recall when both classes exist.' : 'The average forecast miss, measured in percentage points. Lower values indicate smaller errors.',
            sourceFiles.forecasts, { unit: direction ? 'Accuracy (%)' : 'Error (pp)', population: C.CASES[s.sample] + ' · ' + C.SECTORS[sector] }), {
            chartClass: 'chart forecast-chart',
            empty: !rows.some(row => C.numeric(row[s.metric])) ? (s.metric === 'balanced_direction_accuracy' ? 'Balanced direction needs both up and down outcomes' : 'No non-flat actual returns in this selection') : null,
            before: forecastLegend(),
            note: `◇ 0% return <b>${value(zero)}</b> · + Past average <b>${value(mean)}</b>`,
            onClick: point => { if (point.data?.family) ctx.openForecastFamily(point.data.family, sector); },
          });
      });
      const enrichedScores=m.scoreExport(s,allRows);
      const defaultPresetCols=['sector','family','variant','test_events','MAE_pp','RMSE_pp','paired_mae_diff_pp','direction_accuracy',...(s.metric==='balanced_direction_accuracy'?['balanced_direction_accuracy']:[])];
      const scoreTable=ctx.tables.render('scores',{title:'model scores',rows:enrichedScores,rowKey:r=>r.case+'|'+r.sector+'|'+r.family+'|'+r.variant,rowLabel:r=>C.SECTORS[r.sector]+' '+C.FAMILIES[r.family]+' '+C.VARIANTS[r.variant],defaultSort:'MAE_pp',defaultDir:1,pageSize:20,source:sourceFiles.forecasts,export:rows=>m.scoreExport(s,rows),definition:'Scores for the current evaluation and meeting selection. R² uses the matched saved expanding past-mean reference. Direction excludes exactly flat actual returns.',rowClass:r=>r.variant==='reference'?'reference-row':r.family===s.family?'chosen-family':'',columns:[{key:'sector',label:'Sector',text:true,render:r=>C.SECTORS[r.sector]},{key:'family',label:'Model',text:true,render:r=>C.FAMILIES[r.family]},{key:'variant',label:'Inputs',text:true,render:r=>r.variant==='text_added'?'▲ Numbers + text [+Text]':r.variant==='numerical'?'● Numbers only [Num]':'◇ Reference'},{key:'test_events',label:'Meetings',value:r=>+r.test_events,render:r=>fmt(r.test_events,0)},{key:'MAE_pp',label:'MAE · pp',value:r=>+r.MAE_pp,render:r=>fmt(r.MAE_pp,3)},{key:'RMSE_pp',label:'RMSE · pp',value:r=>+r.RMSE_pp,render:r=>fmt(r.RMSE_pp,3)},{key:'paired_mae_diff_pp',label:'Δ MAE vs Num · pp',value:r=>C.number(r.paired_mae_diff_pp),render:r=>r.variant==='reference'?'Ref':C.numeric(r.paired_mae_diff_pp)?signed(r.paired_mae_diff_pp,3):'—'},{key:'R2_OS',label:'R² vs past mean',value:r=>C.number(r.R2_OS),render:r=>fmt(r.R2_OS,3)},{key:'direction_accuracy',label:'Direction',value:r=>C.number(r.direction_accuracy),render:r=>pct(r.direction_accuracy)},{key:'balanced_direction_accuracy',label:'Balanced direction',value:r=>C.number(r.balanced_direction_accuracy),render:r=>pct(r.balanced_direction_accuracy)},{key:'direction_scored',label:'Non-flat actuals',value:r=>+r.direction_scored,render:r=>fmt(r.direction_scored,0)}],presets:{'Errors & direction':defaultPresetCols,'Full metrics':['sector','family','variant','test_events','MAE_pp','RMSE_pp','paired_mae_diff_pp','R2_OS','direction_accuracy','balanced_direction_accuracy','direction_scored']},search:r=>[C.SECTORS[r.sector],C.FAMILIES[r.family],C.VARIANTS[r.variant]].join(' '),caption:'Lower MAE and RMSE are better. Δ MAE vs Num is Text MAE minus Numbers-only MAE (negative favors text). A negative R² means higher squared error than the expanding past-mean reference.'});
      return (
        <>
          <div className="section-head"><div>
            <h2>How models compare with simple forecasts</h2>
            <p>Both sectors share the same scale. The references predict a 0% return or the average return from earlier meetings.</p>
          </div></div>
          <div className="two-columns workspace-chart-grid">{panels}</div>
          <DataPanel title="All model scores" description="Twenty variants and references across both sectors in this evaluation." source="table-scores" className="table-panel">
            {scoreTable}
          </DataPanel>
        </>
      );
    }

    function textResults(s) {
      const groups = forecastSectors.map(sector => ({ sector, comparisons: m.pairs(s, sector) }));
      const values = groups.flatMap(group => group.comparisons.flatMap(row =>
        row.interval ? [row.difference, row.low, row.high] : [row.difference]));
      const extent = Math.max(.05, ...values.map(value => Math.abs(value))) * 1.18;
      const metric = s.metric === 'RMSE_pp' ? 'RMSE' : 'MAE';
      const panels = groups.map(({ sector, comparisons }) => {
        const intervals = comparisons.some(row => row.interval);
        const summary = U.simpleTable(
          ['Model', 'Numbers only', 'With text', 'Change', intervals ? '95% CI (pp)' : 'Subset'],
          comparisons.map(row => ({
            className: row.family === s.family ? 'active-family' : '',
            current: row.family === s.family,
            cells: [
              `<button type="button" class="row-link" data-action="select-family" data-sector="${sector}" data-family="${esc(row.family)}">${esc(row.label)}</button>`,
              fmt(row.numerical, 3), fmt(row.text_added, 3),
              `<strong>${signed(row.difference, 3)}</strong>`,
              row.interval ? `<span class="mono nowrap">[${signed(row.low, 3)}, ${signed(row.high, 3)}]</span>` : 'Point estimate',
            ],
          }))
        );
        return chart('paired-' + sector, C.SECTORS[sector] + ' · change in ' + metric,
          comparisons[0]?.n + ' matched forecast dates',
          (palette, small) => V.interval(comparisons, palette, [-extent, extent], small, s.metric),
          source('Paired ' + metric + ' differences · ' + C.SECTORS[sector], comparisons,
            'The error with statement text minus the error with numbers alone for the same model and meetings.',
            sourceFiles.forecasts, {
              unit: 'Percentage points',
              limits: intervals ? ['Saved descriptive 95% intervals use 2,000 circular five-announcement block-bootstrap replications.', 'Intervals are unadjusted for multiple comparisons.'] : ['Filtered differences use saved prediction rows.'],
            }), {
            chartClass: 'chart interval-plot',
            after: `<div class="panel-body paired-summary-table">${summary}</div>`,
            note: intervals ? `${comparisons.filter(row => row.interval && row.low <= 0 && row.high >= 0).length} of ${comparisons.length} saved 95% intervals include zero.` : 'Open the saved evaluation to see its 95% intervals.',
            onClick: point => { if (point.data?.family) ctx.openForecastFamily(point.data.family, sector); },
          });
      });
      return (
        <>
          <div className="section-head"><div>
            <h2>Did statement text lower forecast errors?</h2>
            <p>A negative change means the same model had a smaller error with text. Compare the points and their saved intervals against the zero line.</p>
          </div></div>
          <div className="two-columns workspace-chart-grid">{panels}</div>
        </>
      );
    }

    function meetingResults(s, predictionRows) {
      const sector = ctx.local.forecastSector;
      const rows = predictionRows.filter(row => row.sector === sector && (row.family === s.family || row.variant === 'reference'));
      const dates = [...new Set(rows.map(row => row.event_date))].sort();
      if (!dates.includes(ctx.local.forecastEvent)) ctx.local.forecastEvent = dates.at(-1);
      const current = ctx.local.forecastEvent;
      const selected = rows.filter(row => row.event_date === current);
      const variant = name => selected.find(row => row.family === s.family && row.variant === name);
      const mean = selected.find(row => row.family === 'historical_mean');
      const actual = selected[0];
      const position = dates.indexOf(current);
      const description = C.SECTORS[sector] + ' · ' + C.FAMILIES[s.family] + ' · first-session returns';
      const panel = chart('prediction-timeline', 'Predictions and actual returns', description,
        palette => V.prediction(rows, s, sector, palette, current),
        source('Saved predictions and actual returns', rows,
          'The curves compare the saved model variants and references with the observed sector returns.',
          sourceFiles.forecasts, { unit: 'Return (%) · error (pp)' }), {
          chartClass: 'chart large-chart',
          before: '<div class="legend"><span><i style="--series:var(--egx30)"></i>Actual return</span><span><i style="--series:var(--numerical)"></i>● Numbers only</span><span><i style="--series:var(--text-added)" class="dash"></i>▲ Numbers + text</span><span><i style="--series:var(--mean-ref)" class="dot"></i>+ Past average</span><span><i style="--series:var(--zero-ref)" class="dash"></i>◇ 0% return</span></div>',
          after: zoomControls('prediction-timeline'),
          onClick: point => {
            if (!Array.isArray(point.value)) return;
            const date = new Date(point.value[0]).toISOString().slice(0, 10);
            if (dates.includes(date)) {
              ctx.local.forecastEvent = date;
              ctx.render({ preserveScroll: true });
            }
          },
        });
      const values = [
        ['Actual return', actual?.actual_pp], ['Numbers only', variant('numerical')?.prediction_pp],
        ['Numbers + text', variant('text_added')?.prediction_pp], ['Past average', mean?.prediction_pp], ['0% return', 0],
      ];
      return (
        <>
          <div className="control-row meeting-controls">
            <label className="field-inline">Sector
              <select id="forecast-sector" defaultValue={sector} key={sector}>
                {forecastSectors.map(id => <option key={id} value={id}>{C.SECTORS[id]}</option>)}
              </select>
            </label>
            <label className="field-inline">Model
              <select data-family defaultValue={s.family} key={s.family}>
                {['ridge', 'elastic_net', 'rbf_svr', 'random_forest'].map(id => <option key={id} value={id}>{C.FAMILIES[id]}</option>)}
              </select>
            </label>
            <label className="field-inline">Meeting date
              <select id="forecast-event" data-forecast-event defaultValue={current} key={current}>
                {dates.slice().reverse().map(day => <option key={day} value={day}>{date(day)}</option>)}
              </select>
            </label>
          </div>
          {actual && <DataPanel title={date(current) + ' · forecast against the observed return'}>
            <div className="panel-body">
              <dl className="event-value-strip">
                {values.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{C.numeric(value) ? signed(value, 3) + '%' : '—'}</dd></div>)}
              </dl>
              <p className="note">First trading session on {date(actual.first_session_date)}. The model used {actual.training_events} earlier meetings for training.</p>
              <button type="button" className="quiet-button" data-action="inspect" data-doc={actual.doc_id}>Open statement and forecast evidence <Icon name="arrow" /></button>
              <div className="meeting-paging">
                <button type="button" className="quiet-button" data-action="forecast-step" data-direction="-1" disabled={position <= 0}>Earlier meeting</button>
                <button type="button" className="quiet-button" data-action="forecast-step" data-direction="1" disabled={position >= dates.length - 1}>Later meeting</button>
              </div>
            </div>
          </DataPanel>}
          {panel}
        </>
      );
    }

    function annualCoverage(){
      const s=ctx.state(),rows=m.annual(s);
      return chart('annual-coverage','Coverage by meeting year','Selected document inventory and matched policy actions have distinct populations.',p=>V.annual(rows,p),source('Annual coverage and policy actions',rows,'Documents count all matching inventory records. Eligible action counts and percentages use matching analysis-cohort announcements in each year; percentages are unavailable when the cohort count is zero.',['data/original_text_inventory.csv','data/common_event_cohort.csv','data/chapter4/table_4_3.csv']),{empty:!rows.length?'No retained documents in these years':null,before:'<div class="legend"><span><i style="--series:var(--hike)"></i>Increase</span><span><i style="--series:var(--cut)" class="hatch"></i>Cut</span><span><i style="--series:var(--hold)"></i>Hold</span><span><i style="--series:var(--mean-ref,var(--reference))" class="dash"></i>◆ All selected documents</span></div>',note:'Counts describe the retained inventory, not a certified complete CBE archive.'});
    }
    function referenceTables(){
      const id=ctx.local.referenceTable,title={'table_4_1':'Inventory, cohort and exclusions','table_4_2':'Signed rate-change statistics','table_4_3':'Annual inventory and eligible actions','table_4_4':'Daily price-index statistics','table_4_5':'Daily return statistics','table_4_6':'First-session outcome statistics','table_4_7':'Training and evaluation samples'}[id],rows=m.X.tables[id],labels={hike_n:'Increase · n',hike_pct:'Increase · %',cut_n:'Cut · n',cut_pct:'Cut · %',hold_n:'Hold · n',hold_pct:'Hold · %',Policy_candidates:'Policy candidates',English_policy_candidates:'English candidates'},integerKeys=['n','Count','Year','Documents','Policy_candidates','English_policy_candidates','Eligible','hike_n','cut_n','hold_n','Positive','Negative','Zero','Events','Legacy','Modern','Sector outcomes','Initial training events','Evaluation events','Evaluation sector outcomes'];
      const table=ctx.tables.render('reference',{title,rows,rowKey:r=>String(Object.values(r)[0]),rowLabel:r=>String(Object.values(r)[0]),selectable:false,controls:false,pageSize:30,columns:Object.keys(rows[0]).map(k=>({key:k,label:labels[k]||k,text:!rows.some(r=>C.numeric(r[k])),value:r=>C.numeric(r[k])?+r[k]:r[k],render:r=>r[k]==null?'—':k==='Year'?esc(r[k]):C.numeric(r[k])?fmt(r[k],integerKeys.includes(k)?0:3):esc(r[k])})),source:['data/chapter4/'+id+'.csv','data/chapter4/reviewed_data.json'],scope:'Fixed notebook reference · full retained study',definition:'Unrounded reviewed values underlying the revised notebook and report. These reference rows are intentionally independent of current research filters.',caption:'Daily comparison interval: 3 January 2007–18 October 2026. Instrument-specific missingness retained; returns require both endpoints in the interval. SD uses n−1; quartiles use linear interpolation.'});
      const labelsForTable = { table_4_1:'Sample inventory', table_4_2:'Rate changes', table_4_3:'Annual coverage', table_4_4:'Daily prices', table_4_5:'Daily returns', table_4_6:'Event outcomes', table_4_7:'Evaluation samples' };
      return (
        <>
          <p className="scope-note">Notebook tables show their original full-study populations. Markets and Coverage show selected-period descriptions.</p>
          <div className="control-row">
            <label className="field-inline">Reference table<select id="reference-table" defaultValue={id} key={id}>
              {Object.keys(m.X.tables).map(key => <option key={key} value={key}>{key.replace('table_', 'Table ').replace('_', '.')} · {labelsForTable[key]}</option>)}
            </select></label>
            <a className="quiet-button" href={'data/chapter4/' + id + '.csv'} download><Icon name="download" />Original CSV</a>
          </div>
          <DataPanel title={title} description="Fixed values from the current notebook." source="table-reference">
            {table}
          </DataPanel>
        </>
      );
    }
    function studyFiles() {
      const files = [
        ...m.X.manifest.files,
        { href: 'data/DATA_DICTIONARY.md', label: 'Data dictionary', description: 'Column definitions and units' },
        { href: 'data/provenance.json', label: 'Data provenance', description: 'Source and snapshot metadata' },
      ];
      return (
        <DataPanel title="Study files and datasets" className="study-file-panel">
          <div className="panel-body">
            <div className="study-downloads">
              {files.map(file => {
                const opens = /\.(pdf|md)$/i.test(file.href);
                return (
                  <a key={file.href} href={file.href} {...(opens ? { target: '_blank', rel: 'noopener' } : { download: true })}>
                    <span className="file-card-icon"><Icon name={opens ? 'file' : 'data'} /></span>
                    <span><strong>{file.label}</strong><small>{file.description}</small></span>
                    <Icon name={opens ? 'arrow' : 'download'} />
                  </a>
                );
              })}
            </div>
          </div>
        </DataPanel>
      );
    }

    function methods(){
      const rawCsvFiles=[
        ['data/metrics.csv','Full-evaluation model metrics (40 rows)'],
        ['data/predictions.csv','Saved meeting-level predictions (3,100 rows)'],
        ['data/paired_text_differences.csv','Paired Text − Numerical MAE & RMSE differences + 95% CIs (16 rows)'],
        ['data/event_sector_modeling.csv','Event-sector returns & numerical inputs (352 rows: 310 in-cohort + 42 excluded)'],
        ['data/common_event_cohort.csv','Matched English MPC announcement cohort (155 rows / meetings)'],
        ['data/event_exclusions.csv','Excluded announcement-event records & reasons (42 rows)'],
        ['data/original_text_inventory.csv','Retained CBE document inventory (176 rows / documents)'],
        ['data/policy_rate_provenance_v2.csv','Reviewed policy rate levels & basis-point decisions (155 rows)'],
        ['data/daily_prices.csv','Refinitiv daily index closes & return flags (21,051 rows)'],
        ['data/DATA_DICTIONARY.md','Column-by-column data dictionary & units'],
        ['data/provenance.json','Snapshot SHA-256 hashes & provenance manifest']
      ];
      return`<article class="panel"><div class="panel-head"><div><h2>Bundled CSV datasets and documentation</h2></div></div><div class="panel-body"><div class="file-list">${rawCsvFiles.map(([href,desc])=>`<a href="${esc(href)}" ${href.endsWith('.md')?'target="_blank" rel="noopener"':'download'}>${icon('download')}<span><strong>${esc(href.split('/').at(-1))}</strong><small>${esc(desc)}</small></span><span class="external-symbol">↓</span></a>`).join('')}</div></div></article><article class="panel"><div class="panel-head"><div><h2>Definitions and interpretation</h2><p>A local companion to a retrospective study of saved historical predictions.</p></div><button class="icon-button" data-action="source" data-source="study" aria-label="Study sources and limitations">${icon('info')}</button></div><div class="panel-body"><div class="method-columns"><div><h3>How the comparison works</h3><p>Four fixed model families receive prior sector return, prior EGX30 return and signed observed rate change. Full-history models include a legacy-index indicator. Text variants add four past-trained statement components.</p><p>The target is the first actual eligible trading session strictly after each recorded meeting. Word2Vec/PCA features are mathematical coordinates, not validated sentiment scores.</p><h3>What the measures mean</h3><dl class="definition-grid"><dt>MAE</dt><dd>Average absolute forecast miss, in pp. Lower is better.</dd><dt>RMSE</dt><dd>Root mean squared miss; larger misses receive more weight.</dd><dt>Direction</dt><dd>Correct up/down forecasts among non-flat actual returns. Zero predictions do not count as up or down.</dd><dt>Balanced direction</dt><dd>Average of up and down recall; requires both actual classes.</dd><dt>Paired difference</dt><dd>Text MAE (or RMSE) minus numerical MAE (or RMSE). Negative favors text.</dd></dl></div><div><h3>Bounds on interpretation</h3><ul><li>Publication clocks and historical text vintages are unverified. Prior results were inspected.</li><li>Samples are small, dependent and overlapping. The sector-index definition changes in January 2020.</li><li>Saved 95% intervals use 2,000 circular five-announcement block replications and no multiplicity adjustment.</li><li>Observed policy changes are not measured surprises. Event timing alone does not establish causality.</li><li>Before-rate levels are implications. The November 2009 8.25% level remains conditional continuity.</li></ul><h3>People and sources</h3><p>Ahmed Yasser<br>Dr. Shaimaa Masry<br>Dr. Amira Tarek<br>Prof. Dr. Andre Guettler</p><p>CBE original statements and policy decisions; Refinitiv .EGBANK, .EGREAL and .EGX30 closes. This local package establishes no redistribution permission.</p></div></div><div class="source-downloads"><a class="quiet-button" href="data/provenance.json" download>File provenance</a><a class="quiet-button" href="vendor/dependencies.json" download>Local asset versions</a><button class="quiet-button" data-action="print">Print current workspace</button></div></div></article>`;
    }
    function sampleFlow() {
      const matched = m.docs.filter(doc => doc.inAnalysis);
      const legacy = matched.filter(doc => doc.sectorDefinition === 'legacy_2007').length;
      const modern = matched.length - legacy;
      const fullScored = Number(m.fullScores('expanded_legacy_live', 'banks')[0].test_events);
      const modernScored = Number(m.fullScores('modern_live_only', 'banks')[0].test_events);
      const flow = [
        ['Retained documents', m.docs.length, 'Original statements and administrative notices.'],
        ['Matched meetings', matched.length, legacy + ' legacy and ' + modern + ' modern-index meetings with returns for both sectors.'],
        ['Full-history evaluation', fullScored, (matched.length - fullScored) + ' earlier meetings for initial training.'],
        ['Modern-index evaluation', modernScored, (modern - modernScored) + ' earlier modern meetings for initial training.'],
      ];
      return (
        <DataPanel title="From statements to scored forecasts" description="Counts describe the full study. The two evaluations overlap." source="sample-flow">
          <div className="panel-body">
            <table className="sample-flow-table">
              <caption className="sr-only">Study sample construction</caption>
              <thead><tr><th scope="col">Sample</th><th scope="col">Count</th><th scope="col">How it was used</th></tr></thead>
              <tbody>{flow.map(([label, count, description]) => (
                <tr key={label}><th scope="row">{label}</th><td>{count}</td><td>{description}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </DataPanel>
      );
    }

    function filteredCoverage() {
      const s = ctx.state();
      const cohort = m.selection(s).cohort;
      const groups = [
        ['Selected cohort', cohort],
        ['Legacy', cohort.filter(doc => doc.sectorDefinition === 'legacy_2007')],
        ['Modern', cohort.filter(doc => doc.sectorDefinition !== 'legacy_2007')],
      ].map(([label, docs]) => ({ label, stats: C.summarize(docs.map(doc => m.rates.get(doc.id)?.bps)) }));
      ctx.sources.set('rate-stats', source('Signed rate-change statistics', U.statsRows(groups),
        'Observed policy changes, in basis points, for the matching analysis cohort.', sourceFiles.policy));
      return (
        <>
          {sampleFlow()}
          {annualCoverage()}
          <DataPanel title="Rate changes in the selected meetings" description="Signed observations in basis points." source="rate-stats">
            <div className="panel-body"><ResearchContent markup={U.statsTable(groups, 'Selected-period policy actions', ' · bps')} /></div>
          </DataPanel>
        </>
      );
    }

    function data() {
      const tab = ctx.local.dataTab;
      return (
        <>
          <ViewTabs label="Data and methods views" selected={tab} action="data-tab"
            options={[['coverage', 'Study coverage', 'data'], ['tables', 'Notebook tables', 'overview'], ['methods', 'Definitions & files', 'file']]} />
          {tab === 'tables' ? referenceTables() : tab === 'methods' ? (
            <>{studyFiles()}<ResearchContent markup={methods()} /></>
          ) : filteredCoverage()}
        </>
      );
    }
    return { policy, markets, forecasts, data };
}
