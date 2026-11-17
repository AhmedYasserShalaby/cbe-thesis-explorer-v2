/* Research data/model layer. Pure saved-output arithmetic; no model fitting. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CBECore=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const SECTORS={banks:'Banks',real_estate:'Real Estate',egx30:'EGX30'};
  const FAMILIES={ridge:'Ridge',elastic_net:'Elastic Net',rbf_svr:'RBF SVR',random_forest:'Random Forest',zero_return:'Zero return',historical_mean:'Past mean'};
  const CASES={expanded_legacy_live:'Full history',modern_live_only:'Modern indices'};
  const VARIANTS={numerical:'Numbers only',text_added:'Numbers + text',reference:'Reference'};
  const RMSE_PAIRS={
    'expanded_legacy_live|banks|ridge':{diff:0.096418395769028109,low:-0.0059520804716275515,high:0.19534536991791862},
    'expanded_legacy_live|banks|elastic_net':{diff:0.081728172536229104,low:-0.013688633315775833,high:0.17650702849164859},
    'expanded_legacy_live|banks|rbf_svr':{diff:0.01412163517665177,low:-0.023100321366109799,high:0.055523129789419756},
    'expanded_legacy_live|banks|random_forest':{diff:-0.022603630447233014,low:-0.09288688595341775,high:0.055871450019859846},
    'expanded_legacy_live|real_estate|ridge':{diff:0.06240808984447499,low:0.0083796271350832559,high:0.12152935979990992},
    'expanded_legacy_live|real_estate|elastic_net':{diff:0.050123990266061735,low:0.0038990093948491349,high:0.10122370960177249},
    'expanded_legacy_live|real_estate|rbf_svr':{diff:0.020101715184322355,low:-0.050390356675180006,high:0.094948611992449597},
    'expanded_legacy_live|real_estate|random_forest':{diff:-0.013915379213422341,low:-0.089129263310180243,high:0.065222535183353983},
    'modern_live_only|banks|ridge':{diff:0.016703673400978891,low:-0.02127974477655541,high:0.059740269257494219},
    'modern_live_only|banks|elastic_net':{diff:0.0073182272221437028,low:-0.029087898395393705,high:0.043957618329851449},
    'modern_live_only|banks|rbf_svr':{diff:-0.043496450233901474,low:-0.091419222809974762,high:0.012881751067391495},
    'modern_live_only|banks|random_forest':{diff:0.0071784351644494926,low:-0.030557383515753506,high:0.041666688038546736},
    'modern_live_only|real_estate|ridge':{diff:-0.071054225858566245,low:-0.2171105347530477,high:0.09278966174780863},
    'modern_live_only|real_estate|elastic_net':{diff:-0.058099654494357278,low:-0.20121080248964579,high:0.097357586669832977},
    'modern_live_only|real_estate|rbf_svr':{diff:0.015499988730910186,low:-0.15617485878522405,high:0.16143802441354044},
    'modern_live_only|real_estate|random_forest':{diff:-0.079040276372359664,low:-0.18561853381071886,high:0.02240075116076921}
  };
  const numeric=v=>v!==''&&v!=null&&Number.isFinite(Number(v));
  const number=v=>numeric(v)?Number(v):null;
  const dateValid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
  const defaults=()=>({page:'overview',from:'2020-01-01',to:'2026-12-31',action:'',cohort:'',sample:'expanded_legacy_live',family:'ridge',metric:'MAE_pp',market:'indexed',instruments:['banks','real_estate','egx30'],inspect:null,inspectTab:'statement'});
  function quantile(a,q){if(!a.length)return null;const i=(a.length-1)*q,k=Math.floor(i);return a[k]+(a[k+1]==null?0:(a[k+1]-a[k])*(i-k));}
  function summarize(values){
    const a=values.filter(numeric).map(Number).sort((x,y)=>x-y),n=a.length;
    if(!n)return{n:0,mean:null,median:null,sd:null,min:null,q1:null,q3:null,max:null};
    const mean=a.reduce((x,y)=>x+y,0)/n;
    return{n,mean,median:quantile(a,.5),sd:n>1?Math.sqrt(a.reduce((s,v)=>s+(v-mean)**2,0)/(n-1)):null,min:a[0],q1:quantile(a,.25),q3:quantile(a,.75),max:a[n-1]};
  }
  function box(values){const a=values.filter(numeric).map(Number).sort((x,y)=>x-y),s=summarize(a);if(!a.length)return{...s,whiskerLow:null,whiskerHigh:null,outliers:[]};const lo=s.q1-1.5*(s.q3-s.q1),hi=s.q3+1.5*(s.q3-s.q1);return{...s,whiskerLow:a.find(x=>x>=lo),whiskerHigh:a.slice().reverse().find(x=>x<=hi),outliers:a.filter(x=>x<lo||x>hi)};}
  function histogram(values,initialEdges){
    const a=values.filter(numeric).map(Number);if(!a.length)return{edges:[],counts:[],n:0};
    let edges=initialEdges?initialEdges.slice():Array.from({length:38},(_,i)=>i-23);
    const step=edges[1]-edges[0];while(Math.min(...a)<edges[0])edges.unshift(edges[0]-step);while(Math.max(...a)>edges.at(-1))edges.push(edges.at(-1)+step);
    const counts=Array(edges.length-1).fill(0);for(const v of a){const i=Math.min(counts.length-1,Math.max(0,Math.floor((v-edges[0])/step)));counts[i]++;}
    return{edges,counts,n:a.length};
  }
  function forecastStats(rows,meanRows){
    const refs=new Map(meanRows.map(r=>[r.doc_id,r])),n=rows.length;
    if(!n)return{test_events:0,MAE_pp:null,RMSE_pp:null,R2_OS:null,R2_OS_status:'no_selected_rows',direction_accuracy:null,balanced_direction_accuracy:null};
    let abs=0,sse=0,base=0,correct=0,up=0,down=0,upCorrect=0,downCorrect=0,flat=0,predFlat=0;
    for(const r of rows){const p=+r.prediction_pp,a=+r.actual_pp,e=p-a;abs+=Math.abs(e);sse+=e*e;const ref=refs.get(r.doc_id);base+=ref?(+ref.prediction_pp-a)**2:NaN;if(p===0)predFlat++;if(a>0){up++;if(p>0){correct++;upCorrect++;}}else if(a<0){down++;if(p<0){correct++;downCorrect++;}}else flat++;}
    return{test_events:n,MAE_pp:abs/n,RMSE_pp:Math.sqrt(sse/n),model_SSE_pp2:sse,expanding_mean_SSE_pp2:base,R2_OS:base>0?1-sse/base:null,R2_OS_status:base>0?'defined':'undefined_zero_or_missing_reference_SSE',direction_accuracy:up+down?correct/(up+down):null,balanced_direction_accuracy:up&&down?(upCorrect/up+downCorrect/down)/2:null,actual_up:up,actual_down:down,actual_flat:flat,predicted_flat:predFlat,direction_scored:up+down,direction_correct:correct,up_recall:up?upCorrect/up:null,down_recall:down?downCorrect/down:null};
  }
  function normalizeState(input){
    const s={...defaults(),...input};
    if(!['overview','policy','markets','forecasts','data'].includes(s.page))s.page='overview';
    if(!dateValid(s.from))s.from=defaults().from;if(!dateValid(s.to))s.to=defaults().to;
    if(!['','hike','hold','cut','other'].includes(s.action))s.action='';if(!['','in','out'].includes(s.cohort))s.cohort='';
    if(!Object.hasOwn(CASES,s.sample))s.sample=defaults().sample;if(!['ridge','elastic_net','rbf_svr','random_forest'].includes(s.family))s.family='ridge';
    if(!['MAE_pp','RMSE_pp','direction_accuracy','balanced_direction_accuracy'].includes(s.metric))s.metric='MAE_pp';
    if(!['indexed','level','return'].includes(s.market))s.market='indexed';
    if(!Array.isArray(s.instruments))s.instruments=defaults().instruments;s.instruments=[...new Set(s.instruments.filter(x=>Object.hasOwn(SECTORS,x)))];
    if(!['statement','market','forecasts','source'].includes(s.inspectTab))s.inspectTab='statement';
    return s;
  }
  function parseRoute(hash){
    const [page,q='']=hash.replace(/^#/,'').split('?'),p=new URLSearchParams(q),s=defaults();
    const old={dashboard:'overview',documents:'policy',results:'forecasts',start:'data'};s.page=old[page]||page||'overview';
    for(const k of ['from','to','action','cohort','sample','family','metric','market','inspect','inspectTab'])if(p.has(k))s[k]=p.get(k);
    if(/^\d{4}$/.test(s.from))s.from+='-01-01';if(/^\d{4}$/.test(s.to))s.to+='-12-31';
    if(p.has('evaluation'))s.sample=p.get('evaluation');if(p.has('model'))s.family=p.get('model');if(p.has('instruments'))s.instruments=p.get('instruments').split(',');
    if(p.has('doc'))s.inspect=p.get('doc');return normalizeState(s);
  }
  function route(s){const p=new URLSearchParams(),d=defaults();for(const k of ['from','to','action','cohort','sample','family','metric','market','inspect','inspectTab'])if(s[k]!=null&&s[k]!==d[k]&&s[k]!=='')p.set(k,s[k]);if(s.instruments.join(',')!==d.instruments.join(','))p.set('instruments',s.instruments.join(','));return'#'+s.page+(p.size?'?'+p:'');}
  function diffWords(earlier,selected){
    const a=(earlier||'').trim().split(/\s+/).filter(Boolean);
    const bParas=(selected||'').trim().split(/\r?\n\s*\r?\n+/).map(p=>p.trim().split(/\s+/).filter(Boolean)).filter(p=>p.length);
    const b=[],bParaEnds=new Set();
    for(let p=0;p<bParas.length;p++){for(const w of bParas[p])b.push(w);if(p<bParas.length-1&&b.length)bParaEnds.add(b.length-1);}
    const n=a.length,m=b.length,w=m+1,L=new Uint16Array((n+1)*w);
    for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)L[i*w+j]=a[i]===b[j]?L[(i+1)*w+j+1]+1:Math.max(L[(i+1)*w+j],L[i*w+j+1]);
    const ops=[];let i=0,j=0;
    while(i<n&&j<m){
      if(a[i]===b[j]){ops.push(['=',b[j]]);if(bParaEnds.has(j))ops.push(['=','\n\n']);i++;j++;}
      else if(L[(i+1)*w+j]>=L[i*w+j+1])ops.push(['-',a[i++]]);
      else{ops.push(['+',b[j]]);if(bParaEnds.has(j))ops.push(['=','\n\n']);j++;}
    }
    while(i<n)ops.push(['-',a[i++]]);
    while(j<m){ops.push(['+',b[j]]);if(bParaEnds.has(j))ops.push(['=','\n\n']);j++;}
    return ops;
  }
  function diffParagraphs(earlier,selected){
    const ops=diffWords(earlier,selected),paras=[];let cur=[];
    for(const op of ops){
      if(op[1]==='\n\n'){if(cur.length){paras.push(cur);cur=[];}}
      else cur.push(op);
    }
    if(cur.length)paras.push(cur);
    return paras;
  }
  function create(D,M,X){
    const docs=D.docs.slice().sort((a,b)=>a.date.localeCompare(b.date)),byId=new Map(docs.map(d=>[d.id,d]));
    const rates=new Map(M.rates.map(r=>[r.id,r])),events=new Map(M.eventPrices.map(r=>[r.doc_id+'|'+r.sector,r]));
    const prices=M.prices.map(r=>{const raw=Object.fromEntries(M.priceKeys.map((k,i)=>[k,r[i]]));return{...raw,value:number(raw.close),returnValue:number(raw.daily_return_pct),eligible:raw.eligible_close==='True'};});
    const priceMap=new Map(prices.map(r=>[r.instrument+'|'+r.date,r]));
    const action=d=>['hike','cut','hold'].includes(d.displayAction||d.action)?(d.displayAction||d.action):'other';
    const valid=s=>dateValid(s.from)&&dateValid(s.to)&&s.from<=s.to;
    const dateMatch=(d,s)=>valid(s)&&d>=s.from&&d<=s.to;
    const docMatch=(d,s)=>!!d&&dateMatch(d.date,s)&&(!s.action||action(d)===s.action)&&(!s.cohort||(s.cohort==='in')===d.inAnalysis);
    const key=s=>[s.from,s.to,s.action,s.cohort].join('|');const cache=new Map();
    function selection(s){const k=key(s);if(cache.has(k))return cache.get(k);const documents=docs.filter(d=>docMatch(d,s)),ids=new Set(documents.map(d=>d.id)),p=prices.filter(r=>dateMatch(r.date,s)),f=D.predictions.filter(r=>ids.has(r.doc_id));const value={docs:documents,ids,prices:p,predictions:f,cohort:documents.filter(d=>d.inAnalysis)};if(cache.size>24)cache.delete(cache.keys().next().value);cache.set(k,value);return value;}
    function daily(s,instrument,measure='return'){
      return selection(s).prices.filter(r=>r.instrument===instrument&&(measure==='level'?r.eligible:r.return_status==='available'&&r.previous_session_date>=s.from&&r.previous_session_date<=s.to&&r.returnValue!=null));
    }
    function outcomes(s,sector){return selection(s).cohort.map(d=>events.get(d.id+'|'+sector)).filter(r=>r&&numeric(r.first_session_return_pct));}
    function annual(s){if(!valid(s))return[];const selected=selection(s),first=Math.max(+s.from.slice(0,4),+docs[0].date.slice(0,4)),last=Math.min(+s.to.slice(0,4),+docs.at(-1).date.slice(0,4)),years=last>=first?Array.from({length:last-first+1},(_,i)=>first+i):[];return years.map(year=>{const d=selected.docs.filter(d=>+d.date.slice(0,4)===year),e=d.filter(d=>d.inAnalysis);const r={Year:year,Documents:d.length,Policy_candidates:d.filter(d=>d.type==='MPC statement').length,English_policy_candidates:d.filter(d=>d.type==='MPC statement'&&d.language==='English (official)').length,Eligible:e.length};for(const a of ['hike','cut','hold']){r[a+'_n']=e.filter(d=>action(d)===a).length;r[a+'_pct']=e.length?100*r[a+'_n']/e.length:null;}return r;});}
    function fullScores(sample=defaults().sample,sector='banks'){
      return X.fullMetrics.filter(m=>m.case===sample&&m.sector===sector).map(r=>({...r,subset:false}));
    }
    function scores(s,sector){
      const selected=selection(s).predictions.filter(r=>r.case===s.sample&&r.sector===sector),full=X.fullMetrics.filter(m=>m.case===s.sample&&m.sector===sector);
      if(!selected.length)return[];const orig=D.predictions.filter(r=>r.case===s.sample&&r.sector===sector);
      if(selected.length===orig.length)return full.map(r=>({...r,subset:false}));
      const mean=selected.filter(r=>r.family==='historical_mean');return full.map(r=>({...r,...forecastStats(selected.filter(p=>p.family===r.family&&p.variant===r.variant),mean),subset:true}));
    }
    function pairs(s,sector){
      const rows=scores(s,sector),useRmse=s.metric==='RMSE_pp';
      return ['ridge','elastic_net','rbf_svr','random_forest'].map(family=>{
        const a=rows.find(r=>r.family===family&&r.variant==='numerical'),b=rows.find(r=>r.family===family&&r.variant==='text_added');
        if(!a||!b)return null;
        const original=D.pairs.find(r=>r.case===s.sample&&r.sector===sector&&r.family===family);
        const rmseOrig=RMSE_PAIRS[s.sample+'|'+sector+'|'+family];
        const maeDiff=+b.MAE_pp-+a.MAE_pp,rmseDiff=+b.RMSE_pp-+a.RMSE_pp;
        const maeInterval=!a.subset&&original?{low:+original.MAE_difference_pp_low,high:+original.MAE_difference_pp_high}:null;
        const rmseInterval=!a.subset&&rmseOrig?{low:rmseOrig.low,high:rmseOrig.high}:null;
        const interval=useRmse?rmseInterval:maeInterval;
        const difference=useRmse?rmseDiff:maeDiff;
        return{
          case:s.sample,sector,family,label:FAMILIES[family],
          test_events:+a.test_events,n:+a.test_events,metric:useRmse?'RMSE_pp':'MAE_pp',
          numerical:useRmse?+a.RMSE_pp:+a.MAE_pp,text_added:useRmse?+b.RMSE_pp:+b.MAE_pp,
          numerical_MAE_pp:+a.MAE_pp,text_added_MAE_pp:+b.MAE_pp,
          numerical_RMSE_pp:+a.RMSE_pp,text_added_RMSE_pp:+b.RMSE_pp,
          MAE_difference_pp:maeDiff,RMSE_difference_pp:rmseDiff,difference,
          low:interval?.low??null,high:interval?.high??null,
          interval_low_pp:interval?.low??null,interval_high_pp:interval?.high??null,
          MAE_interval_low_pp:maeInterval?.low??null,MAE_interval_high_pp:maeInterval?.high??null,
          RMSE_interval_low_pp:rmseInterval?.low??null,RMSE_interval_high_pp:rmseInterval?.high??null,
          interval,subset:!!a.subset
        };
      }).filter(Boolean);
    }
    function pair(s,sector){return pairs(s,sector).find(r=>r.family===s.family)||null;}
    function marketSeries(s){
      const raw=selection(s).prices,segments=[{id:'legacy',from:'0000',to:'2020-01-02'},{id:'modern',from:'2020-01-02',to:'9999'}];
      for(const g of segments){const available=s.instruments.map(ins=>raw.filter(r=>r.instrument===ins&&r.eligible&&r.date>=g.from&&r.date<g.to)).filter(a=>a.length);const sets=available.map(a=>new Set(a.map(r=>r.date)));g.base=available[0]?.find(r=>sets.every(set=>set.has(r.date)))?.date||null;}
      return s.instruments.map(instrument=>{
        const base=new Map(),rows=[];let prev=null;
        for(const r of raw.filter(r=>r.instrument===instrument)){
          const g=segments.find(g=>r.date>=g.from&&r.date<g.to);let value=null;
          if(r.eligible){if(s.market==='level')value=r.value;else if(s.market==='return')value=r.returnValue;else if(g.base&&r.date>=g.base){if(!base.has(g.id))base.set(g.id,r.value);value=100*r.value/base.get(g.id);}}
          const definition=s.market==='indexed'?g.id:r.sector_definition;
          if(prev&&(prev.definition!==definition||Date.parse(r.date)-Date.parse(prev.date)>7*86400000))rows.push({date:r.date,value:null,gap:true});
          rows.push({date:r.date,value,definition,raw:r});prev=value==null?null:{date:r.date,definition};
        }
        return{instrument,rows,baseDates:segments.filter(g=>g.base).map(g=>({segment:g.id,date:g.base}))};
      });
    }
    function scopeTag(s){if(!s||!s.from||!s.to)return'';return s.from+'..'+s.to+(s.action?' action='+s.action:'')+(s.cohort?' cohort='+s.cohort:'');}
    function eventExport(s,documents=selection(s).docs){const scopeStr=scopeTag(s);return documents.map(d=>{const r=rates.get(d.id),b=events.get(d.id+'|banks'),e=events.get(d.id+'|real_estate');return{doc_id:d.id,event_date:d.date,policy_action:action(d),observed_change_bps:r?.bps,deposit_before_implied_pct:r?.before,deposit_after_pct:r?.after,rate_basis:r?.basis,rate_note:r?.note,conditional_level:r?.conditional,in_analysis:d.inAnalysis,source_language:d.language,word_count:d.words,first_session_date:b?.first_session_date,banks_preceding_close:b?.preceding_session_sector_close,banks_first_session_close:b?.first_session_sector_close,banks_return_pct:b?.first_session_return_pct,real_estate_preceding_close:e?.preceding_session_sector_close,real_estate_first_session_close:e?.first_session_sector_close,real_estate_return_pct:e?.first_session_return_pct,exclusion_reasons:d.notInAnalysisReasons.join('; '),local_pdf:d.original||'',source_url:d.source,original_pdf_sha256:d.originalSha256,extracted_txt_sha256:d.textSha256||d.txtSha||'',filter_scope:scopeStr,source_files:'original_text_inventory.csv;policy_rate_provenance_v2.csv;common_event_cohort.csv;event_sector_modeling.csv',statement_text:d.text};});}
    function priceExport(arg1,arg2){const isRowsFirst=Array.isArray(arg1),s=isRowsFirst?(arg2||null):(arg1||defaults()),rows=isRowsFirst?arg1:(arg2||selection(s).prices),scopeStr=s&&s.from&&s.to?s.from+'..'+s.to:'';return(rows||[]).map(r=>({...Object.fromEntries(M.priceKeys.map(k=>[k,r[k]])),price_unit:'index_points',filter_scope:scopeStr,source_file:'daily_prices.csv'}));}
    function boxExport(arg1,arg2,sourceFile='daily_prices.csv'){
      const isGroupsFirst=Array.isArray(arg1),s=isGroupsFirst?(arg2||null):arg1,groups=isGroupsFirst?arg1:(arg2||[]);
      const scopeStr=scopeTag(s),src=Array.isArray(sourceFile)?sourceFile.join(';'):sourceFile;
      return groups.map(g=>{
        const st=g.stats||(Array.isArray(g.values)?box(g.values):{});
        return{
          series:g.label||SECTORS[g.instrument]||g.instrument,
          n:st.n??0,
          min_pct:st.min??null,
          low_whisker_1_5_iqr_pct:st.whiskerLow??null,
          q1_pct:st.q1??null,
          median_pct:st.median??null,
          q3_pct:st.q3??null,
          high_whisker_1_5_iqr_pct:st.whiskerHigh??null,
          max_pct:st.max??null,
          mean_pct:st.mean??null,
          sd_pct:st.sd??null,
          outlier_count:st.outliers?st.outliers.length:0,
          filter_scope:scopeStr,
          source_file:src
        };
      });
    }
    function scoreExport(arg1,arg2){
      const isRowsFirst=Array.isArray(arg1),s=isRowsFirst?(arg2||null):arg1,rows=isRowsFirst?arg1:(arg2||[]);
      const scopeStr=scopeTag(s);
      return rows.map(r=>{
        const numRow=rows.find(x=>x.case===r.case&&x.sector===r.sector&&x.family===r.family&&x.variant==='numerical');
        const txtRow=rows.find(x=>x.case===r.case&&x.sector===r.sector&&x.family===r.family&&x.variant==='text_added');
        const pairedMae=r.variant!=='reference'&&numRow&&txtRow&&numeric(numRow.MAE_pp)&&numeric(txtRow.MAE_pp)?(+txtRow.MAE_pp-+numRow.MAE_pp):null;
        const pairedRmse=r.variant!=='reference'&&numRow&&txtRow&&numeric(numRow.RMSE_pp)&&numeric(txtRow.RMSE_pp)?(+txtRow.RMSE_pp-+numRow.RMSE_pp):null;
        return{
          ...r,
          paired_mae_diff_pp:pairedMae,
          paired_rmse_diff_pp:pairedRmse,
          direction_accuracy_pct:numeric(r.direction_accuracy)?+(+r.direction_accuracy*100).toFixed(6):null,
          balanced_direction_accuracy_pct:numeric(r.balanced_direction_accuracy)?+(+r.balanced_direction_accuracy*100).toFixed(6):null,
          up_recall_pct:numeric(r.up_recall)?+(+r.up_recall*100).toFixed(6):null,
          down_recall_pct:numeric(r.down_recall)?+(+r.down_recall*100).toFixed(6):null,
          filter_scope:scopeStr,
          source_file:'metrics.csv;predictions.csv'
        };
      });
    }
    return{D,M,X,docs,byId,rates,events,prices,priceMap,action,valid,dateMatch,docMatch,selection,daily,outcomes,annual,fullScores,scores,pairs,pair,marketSeries,eventExport,priceExport,boxExport,scoreExport};
  }
  function csv(rows){if(!rows.length)return'';const headers=Object.keys(rows[0]),cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return'\ufeff'+[headers.map(cell).join(','),...rows.map(r=>headers.map(k=>cell(r[k])).join(','))].join('\r\n')+'\r\n';}
  return{SECTORS,FAMILIES,CASES,VARIANTS,RMSE_PAIRS,numeric,number,dateValid,defaults,normalizeState,parseRoute,route,quantile,summarize,box,histogram,forecastStats,diffWords,diffParagraphs,create,csv};
});
