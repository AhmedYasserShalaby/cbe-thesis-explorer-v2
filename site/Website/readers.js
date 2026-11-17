/* Statement-first evidence reader, exact comparison, and contextual sources. */
(function(){
  'use strict';
  const C=window.CBECore,U=window.CBEUI,{esc,icon,fmt,signed,date}=U;
  window.CBEReaders=function(ctx){
    const m=ctx.model,queries=new Map();
    let comparison={selected:null,earlier:null,mode:'diff',sync:true,changeIndex:0};
    const rate=v=>C.numeric(v)?fmt(v)+'%':'—';
    const returning=v=>C.numeric(v)?signed(v)+'%':'—';
    const docView=id=>ctx.state().inspect===id&&document.getElementById('inspector-dialog')?.open?'dialog':'inline';

    function textMarkup(d,q=''){
      const raw=d.text.trim();
      if(!q)return esc(raw);
      const expression=q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),re=new RegExp(expression,'gi');
      let html='',last=0,index=0;
      for(const match of raw.matchAll(re)){
        html+=esc(raw.slice(last,match.index))+`<mark data-match="${index++}">${esc(match[0])}</mark>`;
        last=match.index+match[0].length;
      }
      return html+esc(raw.slice(last));
    }

    function evidence(d){
      const r=m.rates.get(d.id),a=m.events.get(d.id+'|banks'),b=m.events.get(d.id+'|real_estate');
      return{d,r,a,b,predictions:m.D.predictions.filter(p=>p.doc_id===d.id&&p.case===ctx.state().sample)};
    }

    function pairedForecastRows(predictions,sector){
      const sec=predictions.filter(p=>p.sector===sector);
      if(!sec.length)return{refs:[],pairs:[],actual:null};
      const actual=sec[0]?.actual_pp;
      const refs=['zero_return','historical_mean'].map(f=>sec.find(p=>p.family===f&&p.variant==='reference')).filter(Boolean);
      const families=['ridge','elastic_net','rbf_svr','random_forest'];
      const pairs=families.map(f=>{
        const num=sec.find(p=>p.family===f&&p.variant==='numerical');
        const txt=sec.find(p=>p.family===f&&p.variant==='text_added');
        if(!num&&!txt)return null;
        const numMiss=num?Math.abs(+num.prediction_pp-+num.actual_pp):null;
        const txtMiss=txt?Math.abs(+txt.prediction_pp-+txt.actual_pp):null;
        const diff=(numMiss!=null&&txtMiss!=null)?(txtMiss-numMiss):null;
        return{family:f,label:C.FAMILIES[f],num,txt,actual:+(num||txt).actual_pp,numMiss,txtMiss,diff};
      }).filter(Boolean);
      return{refs,pairs,actual};
    }

    function evidenceAside(d){
      const{r,a,b,predictions}=evidence(d),sampleLabel=C.CASES[ctx.state().sample];
      const banksData=pairedForecastRows(predictions,'banks'),reData=pairedForecastRows(predictions,'real_estate');
      return`<aside class="reader-evidence-aside" aria-label="Linked announcement evidence chain">
        <div class="aside-section">
          <h3 class="aside-heading">1. Policy rate decision</h3>
          <div class="aside-kv-grid">
            <div><small>Before · implied</small><strong class="numeric">${rate(r?.before)}</strong></div>
            <div><small>After${r?.conditional?' · conditional':''}</small><strong class="numeric">${rate(r?.after)}</strong></div>
            <div><small>Observed change</small><strong class="numeric">${C.numeric(r?.bps)?signed(r.bps,0)+' bps':'—'}</strong></div>
          </div>
        </div>
        <div class="aside-section">
          <div class="aside-section-head">
            <h3 class="aside-heading">2. Market closes &amp; returns</h3>
            <button type="button" class="text-button tiny-link" data-action="inspector-tab" data-doc="${esc(d.id)}" data-tab="market">Full inputs →</button>
          </div>
          ${d.inAnalysis&&a&&b?`<p class="tiny-note" style="margin:0 0 8px">Preceding (${date(a.preceding_session_date)}) → First session (${date(a.first_session_date)})</p>
          ${U.simpleTable(['Sector','Preceding','1st close','Return'],[
            ['Banks',fmt(a.preceding_session_sector_close),fmt(a.first_session_sector_close),`<strong>${signed(a.first_session_return_pct)}%</strong>`],
            ['Real Estate',fmt(b.preceding_session_sector_close),fmt(b.first_session_sector_close),`<strong>${signed(b.first_session_return_pct)}%</strong>`]
          ])}`:`<p class="tiny-note" style="margin:0">Outside matched cohort: ${esc(d.notInAnalysisReasons.join('; '))}</p>`}
        </div>
        <div class="aside-section">
          <div class="aside-section-head">
            <h3 class="aside-heading">3. Saved forecasts (${esc(sampleLabel)})</h3>
            <button type="button" class="text-button tiny-link" data-action="inspector-tab" data-doc="${esc(d.id)}" data-tab="forecasts">All 20 rows →</button>
          </div>
          ${predictions.length?['banks','real_estate'].map(sec=>{
            const g=sec==='banks'?banksData:reData,zero=g.refs.find(x=>x.family==='zero_return'),mean=g.refs.find(x=>x.family==='historical_mean');
            const chosen=g.pairs.find(x=>x.family===ctx.state().family)||g.pairs[0];
            return`<div class="aside-sector-block">
              <div class="aside-sector-title"><strong>${C.SECTORS[sec]}</strong> <span class="tiny-note">Actual: <b class="numeric">${signed(g.actual,3)}%</b></span></div>
              <div class="aside-ref-line tiny-note">◇ Zero ref: <b class="numeric">0.000%</b> (miss <span class="numeric">${zero?fmt(Math.abs(+zero.prediction_pp-+zero.actual_pp),3):'—'}</span> pp) · + Mean: <b class="numeric">${mean?signed(mean.prediction_pp,3)+'%':'—'}</b></div>
              ${chosen?`<div class="aside-pair-line tiny-note">${esc(chosen.label)}: Num <b class="numeric">${signed(chosen.num?.prediction_pp,3)}%</b> vs +Text <b class="numeric">${signed(chosen.txt?.prediction_pp,3)}%</b> (<span class="numeric">${chosen.diff!=null?signed(chosen.diff,3)+' pp':'—'}</span>)</div>`:''}
            </div>`;
          }).join(''):`<p class="tiny-note" style="margin:0">${d.inAnalysis?'Training-only or outside selected evaluation.':'Outside analysis cohort.'}</p>`}
        </div>
      </aside>`;
    }

    function sourceBody(d){
      const{r,a,b}=evidence(d);
      return`<h3>What this record establishes</h3><p class="note">${esc(r?.note||'Retained source record; no fresh source certification.')}</p>${r?.conditional?'<div class="warning-note">5 November 2009: the 8.25% after-level is conditional continuity from adjacent retained statements. It is not independently stated in this meeting’s document.</div>':''}${d.reviewNote?`<div class="warning-note">${esc(d.reviewNote)}</div>`:''}<dl class="definition-grid"><dt>Original document</dt><dd><a href="${esc(d.original)}" target="_blank" rel="noopener">Bundled CBE PDF ↗</a> · <a href="${esc(d.source)}" target="_blank" rel="noopener">Original CBE link ↗</a></dd><dt>Text source</dt><dd>${esc(d.language)}. Word comparisons use retained extracted text, including extraction artifacts.</dd><dt>Publication clock</dt><dd>${d.releaseTimeVerified?'Verified in the retained record':'Unverified; recorded meeting date only'}</dd><dt>Rate-effective date</dt><dd>${r?.effectiveDate?esc(r.effectiveDate):'Not systematically established; meeting date is not substituted'}</dd><dt>Before level</dt><dd>${C.numeric(r?.before)?'Arithmetic implication: after − signed observed bps / 100.':'No reviewed implied before-level bundled for this record.'}</dd><dt>After-level basis</dt><dd>${esc(r?.basis)}</dd><dt>Eligibility</dt><dd>${d.inAnalysis?'Matched English analysis cohort.':esc(d.notInAnalysisReasons.join('; '))}</dd><dt>Document ID</dt><dd class="mono">${esc(d.id)}</dd></dl><details open><summary>Price cells and file provenance</summary>${U.simpleTable(['Series','Preceding close cell','First-session close cell'],[a,b].filter(Boolean).map(e=>[C.SECTORS[e.sector],`<span class="mono">${esc(e.preceding_session_sector_source_cell||'—')}</span>`,`<span class="mono">${esc(e.first_session_sector_source_cell||'—')}</span>`]))}<dl class="definition-grid"><dt>PDF SHA-256</dt><dd class="mono">${esc(d.originalSha256)}</dd><dt>Text SHA-256</dt><dd class="mono">${esc(d.textSha256)}</dd></dl><div class="source-downloads"><a class="quiet-button" href="data/provenance.json" download>Artifact provenance</a><a class="quiet-button" href="data/event_sector_modeling.csv" download>Original event-sector rows</a><a class="quiet-button" href="data/policy_rate_provenance_v2.csv" download>Reviewed rate sidecar</a></div></details>`;
    }

    function body(d,tab){
      const{r,a,b,predictions}=evidence(d),query=queries.get(d.id)||{q:'',index:0};
      if(tab==='statement'){
        return`<div class="reader-tools"><label class="search-field">${icon('search')}<span class="sr-only">Find wording in this statement</span><input type="search" data-reader-search="${esc(d.id)}" placeholder="Find wording… (Enter = next)" value="${esc(query.q)}"></label><button type="button" class="quiet-button" data-action="reader-match" data-doc="${esc(d.id)}" data-direction="-1" aria-label="Previous wording match">↑</button><button type="button" class="quiet-button" data-action="reader-match" data-doc="${esc(d.id)}" data-direction="1" aria-label="Next wording match">↓</button><span class="reader-match-count" role="status"></span></div><div class="statement-text" data-reader-text="${esc(d.id)}" dir="auto" tabindex="0" aria-label="Retained extracted statement text">${textMarkup(d,query.q)}</div><div class="inspector-bottom"><span>Retained extracted text · ${esc(d.words)} words in source record</span><button type="button" class="text-button" data-action="compare" data-doc="${esc(d.id)}">${icon('compare')}Compare wording with earlier statement</button></div>${r?.conditional?'<p class="warning-note">The displayed November 2009 rate level is conditional continuity. See Source details.</p>':''}`;
      }
      if(tab==='market'){
        return`<h3>First actual session after the meeting</h3><p class="note">The preceding close and first-session close define the recorded event return. These observations do not establish a causal statement effect.</p>${U.simpleTable(['Sector','Preceding date','Close · points','First session','Close · points','Return · %'],[a,b].filter(Boolean).map(e=>[C.SECTORS[e.sector],date(e.preceding_session_date),fmt(e.preceding_session_sector_close),date(e.first_session_date),fmt(e.first_session_sector_close),signed(e.first_session_return_pct)]))}${!d.inAnalysis?`<div class="warning-note">These observations are outside the matched cohort: ${esc(d.notInAnalysisReasons.join('; '))}</div>`:''}${d.inAnalysis?`<h3>Numerical model inputs</h3>${U.simpleTable(['Sector','Prior sector return · %','Prior EGX30 return · %','Rate change · bps','Index definition'],[a,b].filter(Boolean).map(e=>[C.SECTORS[e.sector],signed(e.pre_event_sector_return_pct,3),signed(e.pre_event_egx30_return_pct,3),signed(r.bps,0),d.sectorDefinition==='legacy_2007'?'Legacy':'Modern']))}<p class="note" style="margin-top:16px">Full-history models also include a legacy-index indicator. Text variants add four training-only statement components, not validated sentiment scores.</p>`:''}<button type="button" class="text-button" data-action="inspector-tab" data-doc="${esc(d.id)}" data-tab="source">Inspect source cells and rate evidence →</button>`;
      }
      if(tab==='forecasts'){
        const inOther=m.D.predictions.some(p=>p.doc_id===d.id),n=d.inAnalysis?(!inOther?'This announcement is training-only in the saved evaluations.':'No prediction is retained for this announcement in the selected evaluation.'):d.notInAnalysisReasons.join('; ');
        if(!predictions.length){
          return`<div class="control-row"><label class="field-inline">Evaluation <select data-reader-sample><option value="expanded_legacy_live" ${ctx.state().sample==='expanded_legacy_live'?'selected':''}>Full history</option><option value="modern_live_only" ${ctx.state().sample==='modern_live_only'?'selected':''}>Modern indices</option></select></label></div><p class="note">${C.CASES[ctx.state().sample]} · ${date(d.date)}. Predictions are not refitted when filters change.</p>${U.empty('No saved forecast for this evaluation',n,null)}`;
        }
        const sectorTables=['banks','real_estate'].map(sec=>{
          const g=pairedForecastRows(predictions,sec);
          const refRows=g.refs.map(ref=>[
            `<strong>${esc(C.FAMILIES[ref.family])}</strong> <span class="badge">Benchmark</span>`,
            C.SECTORS[sec],
            signed(ref.prediction_pp,3),
            '—',
            signed(ref.actual_pp,3),
            fmt(Math.abs(+ref.prediction_pp-+ref.actual_pp),3),
            '—',
            '—'
          ]);
          const modelRows=g.pairs.map(p=>[
            esc(p.label),
            C.SECTORS[sec],
            signed(p.num?.prediction_pp,3),
            signed(p.txt?.prediction_pp,3),
            signed(p.actual,3),
            fmt(p.numMiss,3),
            fmt(p.txtMiss,3),
            `<strong>${signed(p.diff,3)}</strong>`
          ]);
          return`<h3 style="margin-top:18px">${C.SECTORS[sec]} · First-session actual return: <span class="numeric">${signed(g.actual,3)}%</span></h3>`+U.simpleTable(
            ['Model / Benchmark','Sector','Numbers only · %','Numbers + text · %','Actual · %','Num miss · pp','Text miss · pp','Δ Miss (Text − Num) · pp'],
            [...refRows,...modelRows],
            `${C.SECTORS[sec]} saved predictions and paired miss differences (${C.CASES[ctx.state().sample]})`
          );
        }).join('');
        return`<div class="control-row"><label class="field-inline">Evaluation <select data-reader-sample><option value="expanded_legacy_live" ${ctx.state().sample==='expanded_legacy_live'?'selected':''}>Full history</option><option value="modern_live_only" ${ctx.state().sample==='modern_live_only'?'selected':''}>Modern indices</option></select></label><button type="button" class="quiet-button" data-action="reader-export" data-doc="${esc(d.id)}">${icon('download')}<span>Export this announcement’s forecasts</span></button></div><p class="note">${C.CASES[ctx.state().sample]} · ${date(d.date)}. Benchmarks appear at the top of each sector; negative Δ Miss means adding text reduced forecast error on this announcement.</p>${sectorTables}`;
      }
      return sourceBody(d);
    }

    function html(d,inline=false){
      const{r}=evidence(d),s=ctx.state(),list=m.selection(s).docs,i=list.findIndex(x=>x.id===d.id),tab=s.inspectTab;
      const outside=!m.docMatch(d,s);
      return`<div class="inspector-header"><div class="inspector-heading-row"><div><h2 id="${inline?'inline':'inspector'}-title">${date(d.date)}</h2><div class="inspector-meta">${U.decision(d,m)}${U.status(d)}${outside?'<span class="badge conditional">Outside applied filters</span>':''}<a class="quiet-button reader-top-link" href="${esc(d.original)}" target="_blank" rel="noopener">Original PDF ↗</a><a class="quiet-button reader-top-link" href="${esc(d.source)}" target="_blank" rel="noopener">CBE source ↗</a><button type="button" class="quiet-button reader-top-link" data-action="compare" data-doc="${esc(d.id)}">${icon('compare')}<span>Compare wording</span></button></div></div><div class="inspector-controls"><button type="button" class="quiet-button" data-action="reader-step" data-doc="${esc(d.id)}" data-direction="-1" aria-label="Older announcement" ${i<=0?'disabled':''}>←</button><button type="button" class="quiet-button" data-action="reader-step" data-doc="${esc(d.id)}" data-direction="1" aria-label="Newer announcement" ${i<0||i===list.length-1?'disabled':''}>→</button>${inline?'':`<button type="button" class="icon-button" data-action="view-link" aria-label="View link" title="View link">${icon('link')}</button><button type="button" class="icon-button" data-close="inspector-dialog" aria-label="Close announcement">${icon('close')}</button>`}</div></div><div class="rate-strip"><div><small>Deposit before · implied</small><strong class="numeric">${rate(r?.before)}</strong></div><span class="rate-arrow" aria-hidden="true">→</span><div><small>Deposit after${r?.conditional?' · conditional':''}</small><strong class="numeric">${rate(r?.after)}</strong></div><div><small>Observed change</small><strong class="numeric">${C.numeric(r?.bps)?signed(r.bps,0)+' <small style="display:inline">bps</small>':'—'}</strong></div></div></div><div class="inspector-tabs" role="tablist" aria-label="Announcement evidence">${[['statement','Statement'],['market','Market observations'],['forecasts','Forecasts'],['source','Source details']].map(([v,t])=>`<button type="button" role="tab" id="reader-${inline?'inline':'modal'}-${v}" aria-controls="reader-body-${inline?'inline':'modal'}" aria-selected="${v===tab}" tabindex="${v===tab?'0':'-1'}" data-action="inspector-tab" data-doc="${esc(d.id)}" data-tab="${v}">${t}</button>`).join('')}</div><div class="reader-split"><div class="inspector-body" id="reader-body-${inline?'inline':'modal'}" role="tabpanel" aria-labelledby="reader-${inline?'inline':'modal'}-${tab}">${!d.inAnalysis&&tab==='statement'?`<p class="note">Outside the forecast cohort: ${esc(d.notInAnalysisReasons.join('; '))}</p>`:''}${body(d,tab)}</div>${evidenceAside(d)}</div>`;
    }

    function refresh(id,inline){
      const d=m.byId.get(id);if(!d)return;
      const target=document.getElementById(inline?'inline-reader':'inspector-dialog');
      if(!target)return;
      target.innerHTML=html(d,inline);
      updateMatchCount(target,id);
    }

    function open(id){
      const d=m.byId.get(id);if(!d)return;
      ctx.setSelected(id);
      ctx.patch({inspect:id,inspectTab:ctx.state().inspectTab||'statement'},{render:false,push:true});
      refresh(id,false);
      ctx.openDialog('inspector-dialog');
    }

    function updateMatchCount(root,id){
      const q=queries.get(id)||{q:'',index:0},marks=root.querySelectorAll('[data-reader-text] mark'),label=root.querySelector('.reader-match-count');
      if(label)label.textContent=q.q?(marks.length?`${Math.min(q.index+1,marks.length)} / ${marks.length} matches`:'No wording matches'):'';
      marks.forEach((el,i)=>{
        el.style.outline=i===q.index?'2px solid var(--focus-ring, var(--reference))':'';
        if(i===q.index)el.setAttribute('data-active-match','true');else el.removeAttribute('data-active-match');
      });
    }

    function search(id,input){
      const target=input.closest('.inspector-body'),q={q:input.value,index:0};
      queries.set(id,q);
      target.querySelector('[data-reader-text]').innerHTML=textMarkup(m.byId.get(id),q.q);
      updateMatchCount(target,id);
    }

    function moveMatch(id,direction){
      const inline=docView(id)==='inline',root=document.getElementById(inline?'inline-reader':'inspector-dialog');
      if(!root)return;
      const marks=root.querySelectorAll('[data-reader-text] mark');
      if(!marks.length)return;
      const q=queries.get(id)||{q:'',index:0};
      q.index=(q.index+direction+marks.length)%marks.length;
      queries.set(id,q);
      updateMatchCount(root,id);
      const text=root.querySelector('[data-reader-text]'),mark=marks[q.index];
      if(text&&mark)text.scrollTop+=mark.getBoundingClientRect().top-text.getBoundingClientRect().top-80;
    }

    function wordParagraphStarts(text){
      const paras=text.trim().split(/\n\s*\n+/).filter(Boolean);
      const starts=new Set();
      let count=0;
      for(let p=0;p<paras.length;p++){
        const words=paras[p].trim().split(/\s+/).filter(Boolean);
        if(p>0&&words.length)starts.add(count);
        count+=words.length;
      }
      return starts;
    }

    function buildDiffViews(earlierText,selectedText){
      const ops=C.diffWords(earlierText,selectedText);
      const aStarts=wordParagraphStarts(earlierText),bStarts=wordParagraphStarts(selectedText);
      const added=ops.filter(o=>o[0]==='+').length,removed=ops.filter(o=>o[0]==='-').length,kept=ops.length-added-removed;

      let diffParas=[''],earlierParas=[''],selectedParas=[''];
      let ai=0,bi=0,changeIdx=0;
      for(const[op,w]of ops){
        const ew=esc(w);
        if(op==='='){
          if(bStarts.has(bi)&&diffParas.at(-1).trim())diffParas.push('');
          if(aStarts.has(ai)&&earlierParas.at(-1).trim())earlierParas.push('');
          if(bStarts.has(bi)&&selectedParas.at(-1).trim())selectedParas.push('');
          diffParas[diffParas.length-1]+=ew+' ';
          earlierParas[earlierParas.length-1]+=ew+' ';
          selectedParas[selectedParas.length-1]+=ew+' ';
          ai++;bi++;
        }else if(op==='-'){
          if(aStarts.has(ai)&&earlierParas.at(-1).trim())earlierParas.push('');
          diffParas[diffParas.length-1]+=`<del data-diff-change="${changeIdx}">${ew}</del> `;
          earlierParas[earlierParas.length-1]+=`<del data-diff-change="${changeIdx}">${ew}</del> `;
          ai++;changeIdx++;
        }else if(op==='+'){
          if(bStarts.has(bi)&&diffParas.at(-1).trim())diffParas.push('');
          if(bStarts.has(bi)&&selectedParas.at(-1).trim())selectedParas.push('');
          diffParas[diffParas.length-1]+=`<ins data-diff-change="${changeIdx}">${ew}</ins> `;
          selectedParas[selectedParas.length-1]+=`<ins data-diff-change="${changeIdx}">${ew}</ins> `;
          bi++;changeIdx++;
        }
      }
      const mergeAdjacentTags=html=>html
        .replace(/<\/ins>\s+<ins[^>]*>/g,' ')
        .replace(/<\/del>\s+<del[^>]*>/g,' ');
      const toParaHTML=arr=>arr.map(p=>p.trim()).filter(Boolean).map(p=>`<p class="diff-para">${mergeAdjacentTags(p)}</p>`).join('');
      return{
        added,
        removed,
        kept,
        diffHTML:toParaHTML(diffParas),
        earlierHTML:toParaHTML(earlierParas),
        selectedHTML:toParaHTML(selectedParas)
      };
    }

    function compare(id){
      comparison.selected=id;
      const selected=m.byId.get(id),earlier=m.docs.filter(d=>d.date<selected.date&&d.language.startsWith('Arabic')===selected.language.startsWith('Arabic'));
      comparison.earlier=earlier.at(-1)?.id||null;
      comparison.mode='diff';
      comparison.changeIndex=0;
      renderCompare();
      ctx.openDialog('compare-dialog');
      ctx.syncRoute(true);
    }

    function stepCompareChange(direction){
      const root=document.getElementById('compare-dialog');
      if(!root)return;
      const container=root.querySelector('#exact-diff')||root.querySelector('[data-compare-scroll="selected"]');
      if(!container)return;
      const changes=[...root.querySelectorAll('#exact-diff ins, #exact-diff del, [data-compare-scroll] ins, [data-compare-scroll] del')];
      if(!changes.length)return;
      comparison.changeIndex=(comparison.changeIndex+direction+changes.length)%changes.length;
      changes.forEach((el,i)=>{el.style.outline=i===comparison.changeIndex?'2px solid var(--focus-ring, var(--primary))':'';});
      const target=changes[comparison.changeIndex];
      const scroller=target.closest('.diff-output, .statement-text');
      if(scroller)scroller.scrollTop+=target.getBoundingClientRect().top-scroller.getBoundingClientRect().top-70;
      const status=root.querySelector('#compare-change-status');
      if(status)status.textContent=`Change ${comparison.changeIndex+1} of ${changes.length}`;
    }

    function quickCompareSelect(kind){
      const b=m.byId.get(comparison.selected);
      if(!b)return;
      const earlier=m.docs.filter(d=>d.date<b.date&&d.language.startsWith('Arabic')===b.language.startsWith('Arabic'));
      if(!earlier.length)return;
      if(kind==='prev'){
        comparison.earlier=earlier.at(-1).id;
      }else if(kind==='same-action'){
        const targetAction=m.action(b);
        const match=earlier.filter(d=>m.action(d)===targetAction).at(-1)||earlier.at(-1);
        comparison.earlier=match.id;
      }
      comparison.changeIndex=0;
      renderCompare();
    }

    function renderCompare(){
      const a=m.byId.get(comparison.earlier),b=m.byId.get(comparison.selected);
      if(!b)return;
      const all=m.docs.filter(d=>d.language.startsWith('Arabic')===b.language.startsWith('Arabic')).slice().reverse();
      const earlier=all.filter(d=>d.date<b.date);
      if(!a||a.date>=b.date)comparison.earlier=earlier[0]?.id||null;
      const first=m.byId.get(comparison.earlier),outside=d=>d&&!m.docMatch(d,ctx.state());
      const prevId=earlier[0]?.id||null;
      const sameActionDoc=earlier.find(d=>m.action(d)===m.action(b))||null;
      let content;
      if(!first){
        content=U.empty('No earlier document','This is the earliest retained document in this language.',null);
      }else{
        const views=buildDiffViews(first.text,b.text);
        const summaryBar=`<div class="compare-toolbar-row"><p class="note" style="margin:0"><strong class="numeric">${views.added}</strong> words added · <strong class="numeric">${views.removed}</strong> removed · <strong class="numeric">${views.kept}</strong> kept in order</p><div class="compare-step-controls"><button type="button" class="quiet-button" data-action="compare-step" data-direction="-1" aria-label="Previous wording change">↑ Prev change</button><button type="button" class="quiet-button" data-action="compare-step" data-direction="1" aria-label="Next wording change">↓ Next change</button><span id="compare-change-status" class="tiny-note" role="status"></span></div></div><div class="diff-legend"><ins>Added in selected statement (${date(b.date)})</ins><del>Removed from earlier statement (${date(first.date)})</del></div>`;
        if(comparison.mode==='diff'){
          content=summaryBar+`<div class="diff-output" id="exact-diff" tabindex="0" dir="auto" aria-label="Paragraph-preserving exact word diff">${views.diffHTML}</div>`;
        }else{
          content=summaryBar+`<label class="checkbox-label" style="margin-bottom:14px"><input type="checkbox" id="compare-sync" ${comparison.sync?'checked':''}>Keep reading positions synchronized</label><div class="compare-texts"><div class="statement-text" data-compare-scroll="earlier" tabindex="0" dir="auto" aria-label="Earlier statement (${date(first.date)})">${views.earlierHTML}</div><div class="statement-text" data-compare-scroll="selected" tabindex="0" dir="auto" aria-label="Selected statement (${date(b.date)})">${views.selectedHTML}</div></div>`;
        }
      }
      document.getElementById('compare-dialog').innerHTML=`<div class="dialog-header"><h2 id="compare-title">Compare policy wording</h2><div class="dialog-header-actions"><button type="button" class="icon-button" data-action="view-link" aria-label="View link" title="View link">${icon('link')}</button><button type="button" class="icon-button" data-close="compare-dialog" aria-label="Close wording comparison">${icon('close')}</button></div></div><div class="dialog-content"><div class="compare-controls"><label class="field">Earlier statement<select id="compare-earlier">${earlier.map(d=>`<option value="${esc(d.id)}" ${d.id===comparison.earlier?'selected':''}>${date(d.date)} · ${m.action(d)}${outside(d)?' · outside filters':''}</option>`).join('')}</select></label><label class="field">Selected statement<select id="compare-selected">${all.map(d=>`<option value="${esc(d.id)}" ${d.id===b.id?'selected':''}>${date(d.date)} · ${m.action(d)}${outside(d)?' · outside filters':''}</option>`).join('')}</select></label></div><div class="compare-quick-bar"><div class="segmented" role="group" aria-label="Wording comparison mode"><button type="button" data-action="compare-mode" data-mode="diff" aria-pressed="${comparison.mode==='diff'}">Exact changes</button><button type="button" data-action="compare-mode" data-mode="side" aria-pressed="${comparison.mode==='side'}">Side by side</button></div>${earlier.length?`<div class="preset-row" role="group" aria-label="Quick earlier statement selection"><button type="button" class="quiet-button" data-action="compare-quick" data-target="prev" ${comparison.earlier===prevId?'aria-pressed="true"':''}>Previous meeting (${date(earlier[0].date)})</button>${sameActionDoc&&sameActionDoc.id!==prevId?`<button type="button" class="quiet-button" data-action="compare-quick" data-target="same-action" ${comparison.earlier===sameActionDoc.id?'aria-pressed="true"':''}>Previous ${m.action(b)} (${date(sameActionDoc.date)})</button>`:''}</div>`:''}</div>${first?`<div class="compare-meta"><div><small>Earlier ${outside(first)?'· outside applied filters':''}</small><strong>${date(first.date)}</strong>${U.decision(first,m)}</div><div><small>Selected ${outside(b)?'· outside applied filters':''}</small><strong>${date(b.date)}</strong>${U.decision(b,m)}</div></div>`:''}${content}<p class="tiny-note" style="margin:18px 0 0">Exact case-sensitive word comparison of retained extracted text with paragraph boundaries preserved. Headers, punctuation and extraction changes can appear as differences. This is not a sentiment or market-effect score.</p></div>`;
      if(document.getElementById('compare-dialog').open)ctx.syncRoute();
      let syncing=false;
      document.querySelectorAll('[data-compare-scroll]').forEach(el=>el.addEventListener('scroll',()=>{
        if(!comparison.sync||syncing)return;
        const other=document.querySelector(`[data-compare-scroll="${el.dataset.compareScroll==='earlier'?'selected':'earlier'}"]`);
        if(!other)return;
        syncing=true;
        const fraction=el.scrollTop/Math.max(1,el.scrollHeight-el.clientHeight);
        other.scrollTop=fraction*(other.scrollHeight-other.clientHeight);
        requestAnimationFrame(()=>syncing=false);
      }));
    }

    function source(id){
      const meta=ctx.sourceMetadata(id)||ctx.sources.get('study'),rows=meta.rows||[],columns=rows.length?(meta.preferredColumns||Object.keys(rows[0]).slice(0,9)):[];
      const preview=rows.length?U.simpleTable(columns,rows.slice(0,12).map(r=>columns.map(k=>`<span title="${esc(r[k])}">${esc(String(r[k]??'—').slice(0,180))}</span>`))):'';
      document.getElementById('source-dialog').innerHTML=`<div class="dialog-header"><h2 id="source-title">${esc(meta.title)}</h2><button type="button" class="icon-button" data-close="source-dialog" aria-label="Close source details">${icon('close')}</button></div><div class="dialog-content"><p class="source-summary">${esc(meta.definition||'')}</p><div class="source-period"><span class="badge">${esc(meta.scope||ctx.scope())}</span>${meta.unit?`<span class="badge">${esc(meta.unit)}</span>`:''}</div>${meta.population?`<p class="note">Population: ${esc(meta.population)}</p>`:''}${meta.limits?.length?`<h3>How to read this view</h3><ul class="source-limits">${meta.limits.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`:''}${meta.files?.length?`<h3>Source files</h3><div class="file-list">${meta.files.map(f=>{const file=typeof f==='string'?{href:f,label:f.split('/').at(-1)}:f;return`<a href="${esc(file.href)}" ${file.href.endsWith('.pdf')?'target="_blank" rel="noopener"':'download'}>${icon('file')}<span><strong>${esc(file.label)}</strong>${file.description?`<small>${esc(file.description)}</small>`:''}</span><span class="external-symbol">↓</span></a>`;}).join('')}</div>`:''}${rows.length?`<h3>Rows behind this view</h3><p class="tiny-note">First ${Math.min(12,rows.length)} of ${fmt(rows.length,0)} rows. Export retains all matching rows and source precision.</p><div class="source-preview">${preview}</div><button type="button" class="quiet-button" style="margin-top:17px" data-action="source-export" data-source="${esc(id)}">${icon('download')}Export underlying rows</button>`:''}${id==='study'?`<h3>Study team</h3><p class="note">Ahmed Yasser<br>Dr. Shaimaa Masry · Dr. Amira Tarek · Prof. Dr. Andre Guettler</p><details><summary>Snapshot and file provenance</summary><p class="note" style="margin-top:15px">Statements through 24 September 2026. Eligible market closes through 18 October 2026. Accepted forecast snapshot: 28 October 2026.</p><a href="data/provenance.json" download>Download provenance manifest</a><p class="tiny-note" style="margin-top:13px">This local artifact fits no models and establishes no redistribution permission for Refinitiv-derived data. No live data feed or official CBE affiliation.</p></details>`:''}</div>`;
      ctx.openDialog('source-dialog');
    }

    return{html,refresh,open,search,moveMatch,compare,renderCompare,stepCompareChange,quickCompareSelect,comparison,source,docView,evidence};
  };
})();
