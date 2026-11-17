/* Consistent chart options. Pure builders also render in offline Node SVG QA. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CBECharts=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const palettes={
    light:{
      canvas:'#F7F9FA',surface:'#FFFFFF',raised:'#FFFFFF',text:'#171820',muted:'#535861',grid:'#E4E7EC',border:'#E4E7EC',
      banks:'#6240C3',real_estate:'#926011',egx30:'#A43465',
      numerical:'#6746C5',text_added:'#926011',
      reference:'#983054',zero_ref:'#983054',mean_ref:'#506174',
      accent:'#6240C3',hike:'#9A315F',cut:'#6141AF',hold:'#7B5816',
      danger:'#A32B55',warning:'#76520B'
    },
    dark:{
      canvas:'#080808',surface:'#161616',raised:'#161616',text:'#F4F4F4',muted:'#B5B5B5',grid:'#303030',border:'#303030',
      banks:'#C1AAFE',real_estate:'#F3CB80',egx30:'#F393B8',
      numerical:'#AD93F9',text_added:'#F3CB80',
      reference:'#F59CBD',zero_ref:'#F59CBD',mean_ref:'#AFBDD1',
      accent:'#8FD2DF',hike:'#FFA2C8',cut:'#BEABFC',hold:'#F3CB80',
      danger:'#FFA2BC',warning:'#F4CD80'
    }
  };
  palettes.navy=palettes.dark;
  const names={banks:'Banks',real_estate:'Real Estate',egx30:'EGX30'};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(v,n=2)=>v==null||!Number.isFinite(+v)?'—':(+v).toLocaleString('en-GB',{maximumFractionDigits:n,minimumFractionDigits:n});
  const sgn=(v,n=3)=>v==null||!Number.isFinite(+v)?'—':(+v>0?'+':'')+fmt(v,n);
  const day=v=>new Date(v).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  const ts=s=>Date.parse(s+'T12:00:00Z');
  function base(p){return{animation:false,useUTC:true,textStyle:{fontFamily:'Inter, sans-serif',fontSize:12,color:p.text},backgroundColor:p.surface,aria:{enabled:true},tooltip:{trigger:'axis',renderMode:'html',backgroundColor:p.surface,borderColor:p.grid,textStyle:{color:p.text,fontFamily:'Inter, sans-serif',fontSize:13},extraCssText:'max-width:340px;white-space:normal;box-shadow:0 8px 28px rgba(24,22,18,0.16);',confine:true},grid:{left:59,right:28,top:32,bottom:45,containLabel:false}};}
  function valueAxis(p,name='',extra={}){return{type:'value',name,nameLocation:'end',nameTextStyle:{color:p.muted,fontSize:12,padding:[2,0,5,0]},axisLabel:{color:p.muted,fontSize:12,hideOverlap:true},axisLine:{show:false},axisTick:{show:false},splitLine:{lineStyle:{color:p.grid,width:.7}},...extra};}
  function timeAxis(p,s,extra={}){return{type:'time',min:ts(s.from),max:ts(s.to),axisLine:{lineStyle:{color:p.grid}},axisLabel:{color:p.muted,fontSize:12,hideOverlap:true},axisTick:{show:false},splitLine:{show:false},...extra};}
  const boundary=(p,s)=>{if(!(s.from<'2020-01-01'&&s.to>='2020-01-02'))return undefined;const frac=(ts('2020-01-02')-ts(s.from))/Math.max(1,ts(s.to)-ts(s.from));return{silent:true,symbol:'none',animation:false,lineStyle:{color:p.warning||p.muted,type:'dashed',width:1.4},label:{show:true,formatter:'Jan 2020 break',fontSize:11,fontWeight:500,color:p.text,position:frac<0.08?'insideEndBottom':'insideEndTop',distance:6,backgroundColor:p.surface,borderColor:p.grid,borderWidth:1,padding:[2,6]},data:[{xAxis:ts('2020-01-02')}]};};
  function tooltipLines(params,suffix=''){
    if(!Array.isArray(params))params=[params];const rows=params.filter(x=>x.value!=null&&(!Array.isArray(x.value)||x.value[1]!=null));
    const date=rows[0]?.axisValue||rows[0]?.value?.[0];return`<b>${date?day(+date):''}</b>`+rows.map(r=>`<div style="margin-top:5px">${r.marker||''}${esc(r.seriesName)} <b style="float:right;margin-left:20px">${fmt(Array.isArray(r.value)?r.value[1]:r.value)}${suffix}</b></div>`).join('');
  }
  function zoom(p,axes=[0]){return[{type:'slider',xAxisIndex:axes,filterMode:'none',height:22,bottom:15,left:60,right:28,showDetail:false,borderColor:p.grid,backgroundColor:p.canvas,fillerColor:p.accent+'22',handleStyle:{color:p.accent},dataBackground:{lineStyle:{color:p.muted},areaStyle:{color:p.grid}},selectedDataBackground:{lineStyle:{color:p.accent},areaStyle:{color:p.accent}}},{type:'inside',xAxisIndex:axes,filterMode:'none',zoomOnMouseWheel:'ctrl',moveOnMouseMove:false,moveOnMouseWheel:false}];}
  function marketLines(series,p,index=0){
    const symbols={banks:'circle',real_estate:'diamond',egx30:'rect'};
    const widths={banks:2.2,real_estate:2,egx30:1.8};
    const types={banks:'solid',real_estate:[8,4],egx30:[2,3]};
    return series.map(s=>({id:'market-'+s.instrument,name:names[s.instrument],type:'line',xAxisIndex:index,yAxisIndex:index,symbol:symbols[s.instrument]||'circle',symbolSize:5,showSymbol:false,connectNulls:false,smooth:false,lineStyle:{width:widths[s.instrument]||1.8,color:p[s.instrument],type:types[s.instrument]||'solid'},itemStyle:{color:p[s.instrument]},emphasis:{focus:'series'},data:s.rows.map(r=>[ts(r.date),r.value])}));
  }
  function timeline(model,s,selectedId,p,small=false){
    const data=model.selection(s),rateRows=data.docs.map(d=>({d,r:model.rates.get(d.id)}));
    const option=base(p);option.grid=[{left:57,right:25,top:41,height:small?100:122},{left:57,right:25,top:small?207:251,bottom:75}];
    option.title=[{text:'Deposit rate (%)',left:21,top:11,textStyle:{fontSize:13,fontWeight:600,color:p.muted}},{text:s.market==='indexed'?'Market indices · rebased to 100':s.market==='return'?'Daily market return (%)':'Market indices · points',left:21,top:small?173:216,textStyle:{fontSize:13,fontWeight:600,color:p.muted}}];
    option.xAxis=[timeAxis(p,s,{gridIndex:0,axisLabel:{show:false}}),timeAxis(p,s,{gridIndex:1})];option.yAxis=[valueAxis(p,'',{gridIndex:0,min:0,max:32,interval:8}),valueAxis(p,'',{gridIndex:1,scale:s.market==='return'})];option.axisPointer={link:[{xAxisIndex:'all'}]};
    const selected=model.byId.get(selectedId),selFrac=selected?(ts(selected.date)-ts(s.from))/Math.max(1,ts(s.to)-ts(s.from)):0.5,mark=selected?{silent:true,symbol:'none',lineStyle:{color:p.zero_ref||p.accent,type:[5,3],width:1.6},label:{show:true,position:'end',align:selFrac>0.82?'right':selFrac<0.18?'left':'center',formatter:day(ts(selected.date)),fontSize:11,color:p.zero_ref||p.accent},data:[{xAxis:ts(selected.date)}]}:undefined;
    option.series=[{id:'deposit-level',name:'Deposit rate',type:'line',xAxisIndex:0,yAxisIndex:0,showSymbol:true,symbolSize:5,connectNulls:false,lineStyle:{color:p.accent,width:1.8},itemStyle:{color:p.accent},data:rateRows.map(({d,r})=>({value:[ts(d.date),r?.after??null],docId:d.id,symbol:r?.conditional?'diamond':'circle',symbolSize:r?.conditional?9:5,itemStyle:r?.conditional?{color:p.surface,borderColor:p.real_estate,borderWidth:2}:undefined})),markLine:mark},...marketLines(model.marketSeries(s),p,1)];
    if(option.series[1])option.series[1].markLine=boundary(p,s);option.dataZoom=zoom(p,[0,1]);option.tooltip.formatter=params=>tooltipLines(params);return option;
  }
  function policy(model,s,p,small=false){
    const data=model.selection(s).docs,option=base(p);option.grid=[{left:57,right:25,top:40,height:small?105:135},{left:57,right:25,top:small?210:245,bottom:68}];
    option.title=[{text:'After-decision deposit level (%)',left:20,top:10,textStyle:{fontSize:13,fontWeight:600,color:p.muted}},{text:'Observed change (bps)',left:20,top:small?174:209,textStyle:{fontSize:13,fontWeight:600,color:p.muted}}];
    option.xAxis=[timeAxis(p,s,{gridIndex:0,axisLabel:{show:false}}),timeAxis(p,s,{gridIndex:1})];option.yAxis=[valueAxis(p,'',{gridIndex:0,min:0,max:32,interval:8}),valueAxis(p,'',{gridIndex:1})];option.axisPointer={link:[{xAxisIndex:'all'}]};
    option.series=[{name:'Deposit after',type:'line',showSymbol:true,symbolSize:5,lineStyle:{color:p.accent,width:1.8},itemStyle:{color:p.accent},data:data.map(d=>({value:[ts(d.date),model.rates.get(d.id)?.after??null],docId:d.id,symbol:model.rates.get(d.id)?.conditional?'diamond':'circle',symbolSize:model.rates.get(d.id)?.conditional?9:5,itemStyle:model.rates.get(d.id)?.conditional?{color:p.surface,borderColor:p.real_estate,borderWidth:2}:undefined}))},{name:'Rate change',type:'bar',barMaxWidth:12,xAxisIndex:1,yAxisIndex:1,itemStyle:{color:p.muted},data:data.map(d=>({value:[ts(d.date),model.rates.get(d.id)?.bps??null],docId:d.id,itemStyle:{color:model.action(d)==='hold'?p.hold:model.action(d)==='hike'?p.hike:p.cut}}))}];option.dataZoom=zoom(p,[0,1]);option.tooltip.formatter=params=>tooltipLines(params);return option;
  }
  function market(model,s,p){const o=base(p);o.grid={left:67,right:25,top:25,bottom:75};o.xAxis=timeAxis(p,s);o.yAxis=valueAxis(p,'',{scale:s.market==='return'});o.series=marketLines(model.marketSeries(s),p);if(o.series[0])o.series[0].markLine=boundary(p,s);o.dataZoom=zoom(p);o.tooltip.formatter=params=>tooltipLines(params,s.market==='return'?'%':'');return o;}
  function annual(rows,p){
    const o=base(p);o.grid={left:55,right:26,top:38,bottom:48};o.xAxis={type:'category',data:rows.map(r=>String(r.Year)),axisLine:{lineStyle:{color:p.grid}},axisLabel:{fontSize:12,color:p.muted,hideOverlap:true},axisTick:{show:false}};o.yAxis=valueAxis(p,'Records',{minInterval:1});
    const decals=[undefined,{symbol:'rect',dashArrayX:[1,0],dashArrayY:[3,3],rotation:-Math.PI/4,color:'rgba(255,255,250,0.32)'},{symbol:'circle',dashArrayX:[2,2],dashArrayY:[2,2],color:'rgba(255,255,250,0.28)'}];
    o.series=[...['hike','cut','hold'].map((a,i)=>({name:{hike:'Increase',cut:'Cut',hold:'Hold'}[a],type:'bar',stack:'eligible',barMaxWidth:28,itemStyle:{color:[p.hike,p.cut,p.hold][i],decal:decals[i]},data:rows.map(r=>r[a+'_n'])})),{name:'All selected documents',type:'line',symbol:'diamond',symbolSize:6,lineStyle:{type:'dashed',width:1.8,color:p.mean_ref||p.reference},itemStyle:{color:p.mean_ref||p.reference},data:rows.map(r=>r.Documents)}];
    return o;
  }
  function distribution(hist,p,instrument,maxCount){
    const o=base(p),bins=hist.edges.slice(0,-1).map((x,i)=>`${x} to ${hist.edges[i+1]}`),zeroBin=bins.find(b=>b.startsWith('0 to '));
    o.grid={left:55,right:20,top:34,bottom:55};o.xAxis={type:'category',data:bins,axisLabel:{fontSize:12,color:p.muted,interval:5,formatter:v=>v.split(' to ')[0]},axisTick:{show:false},axisLine:{lineStyle:{color:p.grid}},name:'Daily return (%)',nameLocation:'middle',nameGap:34,nameTextStyle:{fontSize:12,color:p.muted}};o.yAxis=valueAxis(p,'Sessions',{minInterval:1,max:maxCount?Math.ceil(maxCount/100)*100:undefined});
    o.series=[{type:'bar',name:names[instrument]||instrument,barCategoryGap:'6%',itemStyle:{color:p[instrument]||p.accent},data:hist.counts,markLine:zeroBin?{silent:true,symbol:'none',lineStyle:{color:p.zero_ref||p.reference,type:[6,4],width:1.6},label:{show:true,position:'end',distance:6,formatter:'0%',color:p.zero_ref||p.reference,fontWeight:600,fontSize:11,backgroundColor:p.surface,padding:[1,3]},data:[{xAxis:zeroBin}]}:undefined}];
    o.tooltip.formatter=params=>{const r=params[0];return`<b>${esc(r.name)}%</b><div>${r.marker}${fmt(r.value,0)} sessions</div>`;};return o;
  }
  function boxes(groups,p){const o=base(p);o.grid={left:102,right:25,top:36,bottom:47};o.xAxis=valueAxis(p,'Return (%)',{nameLocation:'middle',nameGap:29,scale:true});o.yAxis={type:'category',data:groups.map(g=>names[g.instrument]||g.label),axisLabel:{fontSize:12,color:p.muted},axisTick:{show:false},axisLine:{show:false}};o.tooltip={...o.tooltip,trigger:'item',formatter:r=>{if(r.seriesType!=='boxplot')return`Outlier: ${fmt(r.value[0])}%`;const v=r.data.value||r.value;return`<b>${esc(r.name)}</b><div>Lower whisker (1.5×IQR): ${fmt(v[0])}%</div><div>Q1: ${fmt(v[1])}%</div><div>Median: ${fmt(v[2])}%</div><div>Q3: ${fmt(v[3])}%</div><div>Upper whisker (1.5×IQR): ${fmt(v[4])}%</div>`;}};o.series=[{type:'boxplot',name:'Return distribution',data:groups.map(g=>({name:names[g.instrument]||g.label,value:[g.stats.whiskerLow,g.stats.q1,g.stats.median,g.stats.q3,g.stats.whiskerHigh],itemStyle:{color:p[g.instrument]+'44',borderColor:p[g.instrument],borderWidth:1.6}})),markLine:{silent:true,symbol:'none',label:{show:true,position:'end',distance:6,formatter:'0%',color:p.zero_ref||p.muted,fontWeight:600,fontSize:11,backgroundColor:p.surface,padding:[1,3]},lineStyle:{color:p.zero_ref||p.muted,type:[6,4],width:1.4},data:[{xAxis:0}]}},{type:'scatter',name:'Outliers',symbolSize:4,data:groups.flatMap((g,i)=>g.stats.outliers.map(v=>({value:[v,i],itemStyle:{color:p[g.instrument],opacity:.7}})))}];return o;}
  function forecasts(rows,arg2,arg3,arg4,arg5){
    let metric,p,sharedMax,small=false;
    if(typeof arg2==='string'){metric=arg2;sharedMax=arg3;p=arg4;small=!!arg5;}
    else{metric=arg2?.metric||'MAE_pp';p=arg3;sharedMax=arg4;small=!!arg5;}
    const direction=metric.includes('direction'),mult=direction?100:1,families=['ridge','elastic_net','rbf_svr','random_forest'],labels=['Ridge','Elastic Net','RBF SVR','Random Forest'],o=base(p),get=(f,v)=>rows.find(r=>r.family===f&&r.variant===v),zero=get('zero_return','reference'),mean=get('historical_mean','reference');
    const axisMax=direction?100:sharedMax;
    o.grid={left:small?96:108,right:small?56:76,top:direction?28:56,bottom:48};
    o.xAxis=valueAxis(p,direction?'Accuracy (%)':'Error (pp · lower is better)',{nameLocation:'middle',nameGap:30,min:0,max:axisMax});
    o.yAxis={type:'category',inverse:true,data:labels,axisLine:{show:false},axisTick:{show:false},axisLabel:{fontSize:12,color:p.text,fontWeight:500}};
    o.series=['numerical','text_added'].map((v,i)=>({
      name:i?'Numbers + text':'Numbers only',
      type:'bar',
      barMaxWidth:14,
      barGap:'35%',
      itemStyle:i?{color:p.text_added,borderColor:p.text_added,borderWidth:1.5,borderRadius:[0,2,2,0],decal:{symbol:'rect',dashArrayX:[1,0],dashArrayY:[3,3],rotation:-Math.PI/4,color:'rgba(255,255,250,0.38)'}}:{color:p.numerical,borderRadius:[0,2,2,0]},
      label:{show:true,position:'right',color:p.text,fontSize:11,fontWeight:i?600:400,formatter:r=>r.value==null?'—':fmt(r.value,direction?1:3)+(direction?'%':'')},
      data:families.map(f=>({value:get(f,v)?.[metric]==null?null:+get(f,v)[metric]*mult,family:f}))
    }));
    const markData=[];
    const xAlign=v=>{const frac=axisMax?v/axisMax:.5;return frac<0.18?'left':frac>0.82?'right':'center';};
    if(!direction&&zero&&zero[metric]!=null&&zero[metric]!==''){
      const zv=+zero[metric]*mult;
      markData.push({name:'Zero return reference',xAxis:zv,lineStyle:{color:p.zero_ref||p.reference,type:[7,4],width:2.2},label:{show:true,position:'start',distance:26,align:xAlign(zv),formatter:'◇ Zero: '+fmt(zv,3)+' pp',color:p.zero_ref||p.reference,fontWeight:600,fontSize:11,backgroundColor:p.surface,padding:[1,4]}});
    }
    if(!direction&&mean&&mean[metric]!=null&&mean[metric]!==''){
      const mv=+mean[metric]*mult;
      markData.push({name:'Past mean reference',xAxis:mv,lineStyle:{color:p.mean_ref||p.reference,type:[2,3],width:2},label:{show:true,position:'start',distance:8,align:xAlign(mv),formatter:'+ Mean: '+fmt(mv,3)+' pp',color:p.mean_ref||p.reference,fontWeight:600,fontSize:11,backgroundColor:p.surface,padding:[1,4]}});
    }
    if(direction){
      if(zero&&zero[metric]!=null&&zero[metric]!==''){
        const zv=+zero[metric]*mult;
        markData.push({name:'Zero return reference',xAxis:zv,lineStyle:{color:p.zero_ref||p.reference,type:[7,4],width:2},label:{show:false}});
      }
      if(mean&&mean[metric]!=null&&mean[metric]!==''){
        const mv=+mean[metric]*mult;
        markData.push({name:'Past mean reference',xAxis:mv,lineStyle:{color:p.mean_ref||p.reference,type:[2,3],width:2},label:{show:true,position:'start',distance:8,align:xAlign(mv),formatter:'+ Mean: '+fmt(mv,1)+'%',color:p.mean_ref||p.reference,fontWeight:600,fontSize:11,backgroundColor:p.surface,padding:[1,4]}});
      }
    }
    o.series[0].markLine={silent:true,symbol:'none',data:markData};
    o.tooltip.formatter=params=>{const g=params[0]?.name;return`<b>${esc(g)}</b>`+params.map(r=>`<div>${r.marker}${esc(r.seriesName)}: <b>${fmt(r.value,direction?1:3)}${direction?'%':' pp'}</b></div>`).join('')+(zero&&zero[metric]!=null?`<div style="margin-top:4px;border-top:1px solid ${p.grid};padding-top:4px;font-size:12px">◇ Zero ref: <b>${fmt(+zero[metric]*mult,direction?1:3)}${direction?'%':' pp'}</b> · + Mean ref: <b>${mean&&mean[metric]!=null?fmt(+mean[metric]*mult,direction?1:3)+(direction?'%':' pp'):'—'}</b></div>`:'');};
    return o;
  }
  function prediction(rows,s,sector,p,eventDate){
    const dates=[...new Set(rows.filter(r=>r.sector===sector).map(r=>r.event_date))].sort(),records=rows.filter(r=>r.sector===sector),lookup=new Map(dates.map(d=>[d,records.filter(r=>r.event_date===d)])),first=dates[0],last=dates.at(-1),o=base(p);
    o.grid={left:62,right:66,top:38,bottom:65};o.xAxis=timeAxis(p,{from:first||s.from,to:last||s.to},{min:first===last?ts(first)-30*86400000:ts(first),max:first===last?ts(first)+30*86400000:ts(last)});o.yAxis=valueAxis(p,'Return (%)');
    const actual=dates.map(d=>[ts(d),+lookup.get(d)[0].actual_pp]);
    const markData=[{yAxis:0,lineStyle:{color:p.zero_ref||p.reference,type:[7,4],width:1.6},label:{show:true,position:'end',distance:6,formatter:'◇ 0%',color:p.zero_ref||p.reference,fontWeight:600,fontSize:11,backgroundColor:p.surface,padding:[1,3]}}];
    if(eventDate)markData.push({xAxis:ts(eventDate),lineStyle:{color:p.accent,type:'dotted',width:1.5},label:{show:false}});
    o.series=[
      {name:'Actual return',type:'bar',barMaxWidth:7,itemStyle:{color:p.egx30,opacity:.68},data:actual,markLine:{silent:true,symbol:'none',data:markData}},
      ...['numerical','text_added'].map((v,i)=>({name:i?'Numbers + text':'Numbers only',type:'line',symbol:i?'triangle':'circle',showSymbol:dates.length<18,symbolSize:7,lineStyle:{width:2,color:p[v],type:i?[7,4]:'solid'},itemStyle:{color:p[v]},data:dates.map(d=>[ts(d),+lookup.get(d).find(r=>r.family===s.family&&r.variant===v)?.prediction_pp])})),
      {name:'Past mean',type:'line',symbol:'diamond',showSymbol:dates.length<18,symbolSize:6,lineStyle:{width:1.7,color:p.mean_ref||p.reference,type:[2,3]},itemStyle:{color:p.mean_ref||p.reference},data:dates.map(d=>[ts(d),+lookup.get(d).find(r=>r.family==='historical_mean')?.prediction_pp])}
    ];
    o.dataZoom=zoom(p);o.tooltip.formatter=params=>tooltipLines(params,'%');return o;
  }
  function interval(pairOrPairs,arg2,arg3,arg4,arg5){
    const isRangeSecond=Array.isArray(arg2),p=isRangeSecond?arg3:arg2,sharedRange=isRangeSecond?arg2:arg3,small=!!arg4;
    if(Array.isArray(pairOrPairs)){
      const pairs=pairOrPairs,metricName=(arg5==='RMSE_pp'||pairs[0]?.metric==='RMSE_pp')?'RMSE':'MAE';
      const labels=pairs.map(r=>r.label||r.family);
      const rightLabels=pairs.map(r=>`${sgn(r.difference,3)}${r.low!=null?` [${sgn(r.low,2)}, ${sgn(r.high,2)}]`:''}`);
      const vals=[0,...pairs.flatMap(r=>[r.difference,...(r.low!=null&&r.high!=null?[r.low,r.high]:[])])];
      const lo=Math.min(...vals),hi=Math.max(...vals),pad=Math.max(.02,(hi-lo)*.18),o=base(p);
      o.grid={left:small?96:104,right:small?20:162,top:42,bottom:48};
      o.xAxis=valueAxis(p,`Text − Numbers-only ${metricName} (pp · negative favors text)`,{nameLocation:'middle',nameGap:30,min:sharedRange?sharedRange[0]:lo-pad,max:sharedRange?sharedRange[1]:hi+pad,splitNumber:5,axisLabel:{fontSize:11,color:p.muted,formatter:v=>sgn(v,2),hideOverlap:true}});
      o.yAxis=[
        {type:'category',inverse:true,data:labels,axisLine:{show:false},axisTick:{show:false},axisLabel:{fontSize:12,color:p.text,fontWeight:500}},
        {type:'category',position:'right',inverse:true,show:!small,data:rightLabels,axisLine:{show:false},axisTick:{show:false},splitLine:{show:false},axisLabel:{fontSize:11,fontFamily:'Inter, sans-serif',color:p.text,fontWeight:500,margin:8}}
      ];
      o.tooltip={...o.tooltip,trigger:'item',formatter:param=>{
        const r=pairs[Array.isArray(param.value)?param.value[1]:param.dataIndex];
        if(!r)return'';
        return`<b>${esc(r.label||r.family)}</b><div>Text − Numerical ${metricName}: <b>${sgn(r.difference,3)} pp</b> (${r.difference<0?'favors text':'favors numbers only'})</div><div>Numbers only: <b>${fmt(r.numerical,3)} pp</b> · Numbers + text: <b>${fmt(r.text_added,3)} pp</b></div>`+(r.low!=null&&r.high!=null?`<div>95% block-bootstrap CI: <b>[${sgn(r.low,3)}, ${sgn(r.high,3)}] pp</b></div>`:'<div style="color:'+p.muted+'">Filtered subset · no saved bootstrap interval</div>');
      }};
      const hasCi=pairs.some(r=>r.low!=null&&r.high!=null);
      o.series=[];
      if(hasCi){
        o.series.push({
          name:'Saved 95% block-bootstrap CI',
          type:'custom',
          silent:true,
          yAxisIndex:0,
          renderItem:(params,api)=>{
            const idx=api.value(0),low=api.value(1),high=api.value(2);
            if(!Number.isFinite(low)||!Number.isFinite(high))return null;
            const start=api.coord([low,idx]),end=api.coord([high,idx]),cap=5;
            return{
              type:'group',
              children:[
                {type:'line',shape:{x1:start[0],y1:start[1],x2:end[0],y2:end[1]},style:{stroke:p.muted,lineWidth:2}},
                {type:'line',shape:{x1:start[0],y1:start[1]-cap,x2:start[0],y2:start[1]+cap},style:{stroke:p.muted,lineWidth:2}},
                {type:'line',shape:{x1:end[0],y1:end[1]-cap,x2:end[0],y2:end[1]+cap},style:{stroke:p.muted,lineWidth:2}}
              ]
            };
          },
          data:pairs.map((r,idx)=>[idx,r.low,r.high,r.difference])
        });
      }
      o.series.push({
        name:`Paired ${metricName} difference`,
        type:'scatter',
        yAxisIndex:0,
        z:3,
        data:pairs.map((r,idx)=>({
          value:[r.difference,idx],
          family:r.family,
          symbol:r.difference<0?'triangle':'circle',
          symbolSize:11,
          itemStyle:{color:r.difference<0?p.banks:p.danger,borderColor:p.surface,borderWidth:1.5}
        })),
        markLine:{
          silent:true,
          symbol:'none',
          lineStyle:{color:p.zero_ref||p.reference,type:[7,4],width:2},
          label:{show:true,position:'start',distance:10,formatter:'0.000 pp (no change)',color:p.zero_ref||p.reference,fontWeight:600,fontSize:11,backgroundColor:p.surface,padding:[1,4]},
          data:[{xAxis:0}]
        }
      });
      return o;
    }
    const pair=pairOrPairs,o=base(p),vals=[0,pair.difference,...(pair.interval?[pair.interval.low,pair.interval.high]:[])],lo=Math.min(...vals),hi=Math.max(...vals),pad=Math.max(.015,(hi-lo)*.17);
    o.grid={left:32,right:32,top:34,bottom:34};
    o.xAxis=valueAxis(p,'',{min:sharedRange?sharedRange[0]:lo-pad,max:sharedRange?sharedRange[1]:hi+pad,splitNumber:3,axisLabel:{fontSize:12,color:p.muted,formatter:v=>sgn(v,3)},splitLine:{show:false}});
    o.yAxis={type:'value',min:0,max:1,show:false};
    o.tooltip={...o.tooltip,trigger:'item',formatter:()=>`Text − numerical: ${sgn(pair.difference,4)} pp`};
    o.series=[];
    if(pair.interval)o.series.push({name:'Saved descriptive 95% interval',type:'line',symbol:'rect',symbolSize:[2,14],lineStyle:{width:2,color:p.muted},itemStyle:{color:p.muted},data:[[pair.interval.low,.5],[pair.interval.high,.5]]});
    o.series.push({name:'Paired difference',type:'scatter',symbol:pair.difference<0?'triangle':'circle',symbolSize:11,itemStyle:{color:pair.difference<0?p.banks:p.danger,borderColor:p.surface,borderWidth:2},data:[[pair.difference,.5]],markLine:{silent:true,symbol:'none',lineStyle:{color:p.zero_ref||p.reference,type:[7,4],width:2},label:{show:true,position:'end',distance:8,formatter:'0.000 pp',color:p.zero_ref||p.reference,fontSize:11},data:[{xAxis:0}]}});
    return o;
  }
  return{palettes,base,valueAxis,timeAxis,timeline,policy,market,annual,distribution,boxes,forecasts,prediction,interval};
});
