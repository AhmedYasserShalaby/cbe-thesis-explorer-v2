"""Descriptive analysis of retained inputs. No model fitting or source mutation.

Run beside Code_and_Processed_Data.zip with Chapter4/policy_rate_provenance_v2.csv.
The script also supplies the functions used by the revised review notebook.
"""
from pathlib import Path
from zipfile import ZipFile
import io
import json
import hashlib
import numpy as np
import pandas as pd
import matplotlib
if __name__ == '__main__':
    matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from matplotlib.ticker import MaxNLocator

START = '2007-01-03'
END = '2026-10-18'
BOUNDARY = '2020-01-02'
ORDER = ['banks', 'real_estate', 'egx30']
NAMES = {'banks': 'EGBANK', 'real_estate': 'EGREAL', 'egx30': 'EGX30'}
COLORS = {'banks': '#185B89', 'real_estate': '#B16B18', 'egx30': '#596166'}
ACTION_COLORS = {'hike': '#185B89', 'cut': '#B16B18', 'hold': '#B4BBC1'}
STATS = ['n', 'mean', 'median', 'sd', 'min', 'q1', 'q3', 'max']


def summarize(values):
    a = pd.to_numeric(values, errors='raise').dropna().to_numpy(float)
    assert np.isfinite(a).all()
    return dict(n=len(a), mean=float(np.mean(a)), median=float(np.median(a)),
                sd=float(np.std(a, ddof=1)), min=float(np.min(a)),
                q1=float(np.quantile(a, .25, method='linear')),
                q3=float(np.quantile(a, .75, method='linear')), max=float(np.max(a)))


def prepare(inventory, panel, prices, rates):
    common = panel.loc[panel['in_common_event_cohort'].eq(True)].copy()
    events = common.loc[common.sector.eq('banks')].sort_values('event_date').copy()
    assert len(inventory) == 176 and inventory.doc_id.nunique() == 176
    assert len(events) == events.doc_id.nunique() == 155 and len(common) == 310
    assert not common.duplicated(['doc_id', 'sector']).any()
    assert events.legacy_regime.value_counts().to_dict() == {1: 99, 0: 56}
    assert set(events.doc_id) == set(rates.doc_id) and len(rates) == 155
    assert np.allclose(events.set_index('doc_id').reported_rate_change_bps.sort_index(),
                       rates.set_index('doc_id').reported_change_bps.sort_index(), rtol=0, atol=1e-12)
    # Common calendar interval, instrument-specific missingness retained.
    daily = prices.loc[prices.date.between(START, END)].copy()
    closes = daily.loc[daily.eligible_close.eq(True)].copy()
    returns = daily.loc[daily.return_status.eq('available') &
                        daily.previous_session_date.ge(START)].copy()
    assert not prices.duplicated(['instrument', 'date']).any()
    assert (closes.close > 0).all()
    assert np.isfinite(returns.daily_return_pct).all()
    recomputed = 100 * (returns.close.to_numpy() / returns.previous_close.to_numpy() - 1)
    assert np.allclose(recomputed, returns.daily_return_pct, rtol=0, atol=1e-10)
    assert not returns.loc[returns.instrument.ne('egx30'), 'date'].eq(BOUNDARY).any()
    assert closes.date.max() == END
    return dict(inventory=inventory, events=events, common=common, rates=rates.sort_values('event_date'),
                prices=prices, closes=closes, returns=returns)


def tables(d):
    inv, e = d['inventory'], d['events']
    t1 = pd.DataFrame([
        ['All original documents', 176, 'Document inventory'],
        ['Policy-statement candidates', 174, '173 English and 1 Arabic only'],
        ['English policy candidates', 173, 'Language-eligible inventory'],
        ['Arabic-only policy candidate', 1, 'Excluded from English model'],
        ['Administrative notices', 2, 'Excluded from policy model'],
        ['English candidates before sector history', 16, 'Excluded before January 2007'],
        ['English candidates in shared 2011 reopening window', 2, 'Excluded by event-window rules'],
        ['Common eligible English policy events', 155, '99 legacy and 56 modern-live'],
        ['First-session sector outcomes', 310, '155 Banks and 155 Real Estate'],
    ], columns=['Population or exclusion', 'Count', 'Meaning'])
    t2 = pd.DataFrame([dict(Sample=name, **summarize(g.reported_rate_change_bps)) for name,g in [
        ('Common cohort', e), ('Legacy', e[e.legacy_regime.eq(1)]),
        ('Modern-live', e[e.legacy_regime.eq(0)])]])
    annual = []
    for year in range(2005, 2027):
        original = inv[inv.event_date.str.startswith(str(year))]
        g = e[e.event_date.str.startswith(str(year))]
        row = dict(Year=year, Documents=len(original),
                   Policy_candidates=int(original.record_status.eq('policy_statement_candidate').sum()),
                   English_policy_candidates=int((original.record_status.eq('policy_statement_candidate') &
                                                  original.source_language.eq('Official_English')).sum()),
                   Eligible=len(g))
        for action in ['hike', 'cut', 'hold']:
            n = int(g.policy_action.eq(action).sum())
            row[action + '_n'] = n
            row[action + '_pct'] = 100 * n / len(g) if len(g) else None
        assert sum(row[a+'_n'] for a in ['hike','cut','hold']) == len(g)
        annual.append(row)
    t3 = pd.DataFrame(annual)
    t4 = pd.DataFrame([dict(Index=NAMES[k], **summarize(d['closes'].loc[d['closes'].instrument.eq(k), 'close'])) for k in ORDER])
    t5 = pd.DataFrame([dict(Index=NAMES[k], **summarize(d['returns'].loc[d['returns'].instrument.eq(k), 'daily_return_pct'])) for k in ORDER])
    eventrows = []
    for k in ORDER[:2]:
        a = d['common'].loc[d['common'].sector.eq(k), 'first_session_return_pct']
        eventrows.append(dict(Sector='Banks' if k == 'banks' else 'Real Estate', **summarize(a),
                              Positive=int(a.gt(0).sum()), Negative=int(a.lt(0).sum()), Zero=int(a.eq(0).sum())))
    t6 = pd.DataFrame(eventrows)
    t7 = pd.DataFrame([
        ['Full history', '1 Feb 2007 to 24 Sep 2026', 155, 99, 56, 310, 36, 119, 238,
         '24 Nov 2011 to 24 Sep 2026'],
        ['Modern-live', '16 Jan 2020 to 24 Sep 2026', 56, 0, 56, 112, 20, 36, 72,
         '19 May 2022 to 24 Sep 2026'],
    ], columns=['Sample','Announcement dates','Events','Legacy','Modern','Sector outcomes',
                'Initial training events','Evaluation events','Evaluation sector outcomes','Evaluation meeting dates'])
    return {f'table_4_{i}': t for i,t in enumerate([t1,t2,t3,t4,t5,t6,t7],1)}


def style():
    plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.titlesize':11,
        'axes.labelsize':10,'legend.fontsize':9,'axes.spines.top':False,'axes.spines.right':False,
        'axes.edgecolor':'#72787C','axes.linewidth':.7,'grid.color':'#DCE0E3',
        'grid.linewidth':.55,'savefig.facecolor':'white','figure.facecolor':'white'})


def save_figure(fig, folder, name):
    folder = Path(folder); folder.mkdir(parents=True, exist_ok=True)
    fig.savefig(folder/(name+'.png'), dpi=220, bbox_inches='tight', pad_inches=.12)
    fig.savefig(folder/(name+'.svg'), bbox_inches='tight', pad_inches=.12)


def policy_plot(d):
    fig, ax = plt.subplots(figsize=(9, 3.9), layout='constrained')
    r = d['rates']; x = pd.to_datetime(r.event_date)
    # Event markers are observations. Thin connectors interpolate only between retained meetings.
    observed = r.source_deposit_after_rate_pct.notna()
    ax.plot(x, r.resolved_after_rate_pct, color=COLORS['banks'], lw=1.0, alpha=.7,
            label='After-decision deposit level, connected at retained meetings')
    ax.scatter(x[observed], r.loc[observed,'resolved_after_rate_pct'], s=14,
               color=COLORS['banks'], zorder=3, label='After level stated in retained text (n=154)')
    ax.plot(x, r.resolved_before_rate_pct, color=COLORS['real_estate'], ls='--', lw=.9,
            alpha=.8, label='Before level, arithmetic implication (n=155)')
    conditional = r.event_date.eq('2009-11-05')
    ax.scatter(x[conditional],r.loc[conditional,'resolved_after_rate_pct'],s=75,
               facecolors='white',edgecolors=COLORS['real_estate'],marker='D',zorder=5,
               label='5 Nov 2009 after level, conditional continuity')
    ax.annotate('5 Nov 2009: 8.25%\nconditional continuity',
        (pd.Timestamp('2009-11-05'),8.25),xytext=(pd.Timestamp('2011-01-01'),13.2),
        fontsize=8.5,arrowprops={'arrowstyle':'-','color':'#777777','lw':.7})
    ax.set_ylabel('Overnight deposit rate (%)'); ax.set_xlabel('Meeting date')
    ax.set_ylim(0,32);ax.set_xlim(pd.Timestamp('2007-01-01'),pd.Timestamp('2026-12-31'))
    ax.set_xticks(pd.to_datetime(['2007-02-01','2012-01-01','2017-01-01','2022-01-01','2026-09-24']),
                  ['2007','2012','2017','2022','Sep 2026'])
    ax.grid(axis='y');ax.legend(loc='upper left',frameon=False,fontsize=8)
    return fig


def index_plot(d):
    fig, axes = plt.subplots(1,2,figsize=(9,3.7),layout='constrained')
    c = d['closes']
    for ax, modern in zip(axes,[False,True]):
        lower, upper = (START,'2020-01-01') if not modern else (BOUNDARY,END)
        g = c[c.date.between(lower,upper)]
        base_date = max(g[g.instrument.eq(k)].date.min() for k in ORDER)
        for k, ls in zip(ORDER,['-','--',':']):
            a = g[g.instrument.eq(k)].sort_values('date')
            base = a.loc[a.date.eq(base_date),'close'].iloc[0]
            ax.plot(pd.to_datetime(a.date),100*a.close/base,color=COLORS[k],ls=ls,lw=1,label=NAMES[k])
        ax.set_title(('Legacy definition' if not modern else 'Modern-live definition')+'\n'+base_date+' = 100')
        ax.set_ylabel('Normalized price-index level');ax.grid(axis='y')
        ax.set_xlim(pd.Timestamp(lower),pd.Timestamp(upper))
        dates = [lower,'2011-01-01','2015-01-01','2019-12-31'] if not modern else [BOUNDARY,'2022-01-01','2024-01-01',END]
        labels = ['Jan 2007','2011','2015','Dec 2019'] if not modern else ['Jan 2020','2022','2024','Oct 2026']
        ax.set_xticks(pd.to_datetime(dates),labels,fontsize=8)
    axes[1].axvline(pd.Timestamp(BOUNDARY),color='#222222',ls='--',lw=1)
    axes[0].legend(frameon=False)
    return fig


def daily_plot(d):
    fig = plt.figure(figsize=(9,5.5),layout='constrained')
    grid = fig.add_gridspec(2,3,height_ratios=[1.4,1])
    # Shared one-percentage-point bins include both tails; no observations clipped.
    bins = np.arange(-23,15,1,dtype=float)
    for i,k in enumerate(ORDER):
        ax=fig.add_subplot(grid[0,i]);a=d['returns'].loc[d['returns'].instrument.eq(k),'daily_return_pct']
        counts,_=np.histogram(a,bins); assert int(counts.sum()) == len(a)
        ax.hist(a,bins=bins,color=COLORS[k],edgecolor='white',linewidth=.25)
        ax.set_title(f'{NAMES[k]} (n={len(a):,})');ax.set_xlim(-23,14);ax.set_ylim(0,2000)
        ax.set_xlabel('Daily return (%)');ax.set_ylabel('Sessions');ax.grid(axis='y')
    ax=fig.add_subplot(grid[1,:])
    a=[d['returns'].loc[d['returns'].instrument.eq(k),'daily_return_pct'].to_numpy() for k in ORDER]
    bp=ax.boxplot(a,orientation='horizontal',tick_labels=[NAMES[k] for k in ORDER],patch_artist=True,whis=1.5,
         flierprops={'marker':'.','markersize':2,'alpha':.5},medianprops={'color':'#222222','linewidth':1.4})
    for b,k in zip(bp['boxes'],ORDER):b.set_facecolor(COLORS[k]);b.set_alpha(.4)
    ax.axvline(0,color='#777777',lw=.6);ax.set_xlim(-23,14);ax.set_xlabel('Daily return (%)');ax.grid(axis='x')
    return fig


def event_plot(d):
    fig,ax=plt.subplots(figsize=(9,3.4),layout='constrained')
    a=[d['common'].loc[d['common'].sector.eq(k),'first_session_return_pct'].to_numpy() for k in ORDER[:2]]
    bp=ax.boxplot(a,orientation='horizontal',tick_labels=['Banks (n=155)','Real Estate (n=155)'],patch_artist=True,whis=1.5,
        flierprops={'marker':'o','markersize':3,'markerfacecolor':'white','markeredgecolor':'#555555'},
        medianprops={'color':'#222222','linewidth':1.5})
    for b,k in zip(bp['boxes'],ORDER[:2]):b.set_facecolor(COLORS[k]);b.set_alpha(.45)
    ax.axvline(0,color='#777777',lw=.7);ax.grid(axis='x');ax.set_xlabel('First-session sector return (%)')
    ax.set_xlim(-9,9)
    return fig


def annual_plot(d):
    t=tables(d)['table_4_3'];fig,ax=plt.subplots(figsize=(9,3.4),layout='constrained')
    bottom=np.zeros(len(t));x=np.arange(len(t))
    for a,label in [('hike','Increase'),('cut','Decrease'),('hold','Hold')]:
        y=t[a+'_n'].to_numpy();ax.bar(x,y,bottom=bottom,color=ACTION_COLORS[a],label=label,width=.78,
                                     edgecolor='white',linewidth=.4);bottom+=y
    ax.set_xticks(x,t.Year.astype(str),rotation=0,fontsize=8)
    ax.set_ylabel('Eligible announcements');ax.set_ylim(0,12);ax.yaxis.set_major_locator(MaxNLocator(integer=True))
    ax.grid(axis='y');ax.set_axisbelow(True);ax.legend(ncol=3,frameon=False,loc='upper right')
    ax.set_xlabel('Meeting year (common cohort only; 2026 through 24 September)')
    return fig


def flow_plot(labels, width=9, height=5):
    fig,ax=plt.subplots(figsize=(width,height));ax.set_axis_off();ax.set_xlim(0,1);ax.set_ylim(0,1)
    n=len(labels);step=.90/n;h=step*.72
    for i,label in enumerate(labels):
        y=.96-i*step-h
        ax.add_patch(FancyBboxPatch((.05,y),.90,h,boxstyle='round,pad=0.006,rounding_size=0.008',
                      facecolor='#F4F6F8',edgecolor='#8996A0',linewidth=.8))
        ax.text(.5,y+h/2,label,ha='center',va='center',fontsize=10,linespacing=1.25)
        if i<n-1:ax.annotate('',xy=(.5,y-step+h+.004),xytext=(.5,y-.004),
            arrowprops={'arrowstyle':'-|>','color':'#526579','lw':.9})
    fig.subplots_adjust(left=0,right=1,top=1,bottom=0)
    return fig


def sample_plot(d, height=6):
    return flow_plot([
        '176 original CBE documents\n174 policy candidates and 2 administrative notices',
        '173 English policy candidates\nExclude 2 notices and 1 Arabic-only candidate',
        '155 common eligible announcements\nExclude 16 before sector history and 2 shared 2011 reopening windows',
        '99 legacy events and 56 modern-live events\nOne statement per announcement',
        '310 first-session sector outcomes\n155 Banks returns and 155 Real Estate returns',
        'Overlapping modern-live sensitivity: 56 events, 112 outcomes\n20 initial training events and 36 evaluation events per sector',
    ],height=height)


def workflow_plot():
    return flow_plot([
        'Raw CBE statements and Refinitiv price data',
        'Data extraction and organization\nPDF text or reviewed OCR, dates, RIC identities and source hashes',
        'Cleaning, validation and exclusions\nMissing values retained, observed calendar and definition checks',
        'Event matching and return calculation\nFirst actual eligible session after the meeting',
        'Numerical and textual feature construction\nStatic numerical inputs, past-trained Word2Vec and training-only PCA/scaling',
        'Final analytical dataset\n155 announcements, 310 outcomes; fold-specific text features remain separate',
    ],height=6)


def result_plot(metrics):
    fig,axes=plt.subplots(2,2,figsize=(9,6.2),sharey=True,layout='constrained')
    families=['ridge','elastic_net','rbf_svr','random_forest']
    for ax,(case,sector) in zip(axes.ravel(),[(c,s) for c in ['expanded_legacy_live','modern_live_only'] for s in ORDER[:2]]):
        g=metrics[metrics.case.eq(case)&metrics.sector.eq(sector)]
        for v,label,color,offset in [('numerical','Numerical only','#185B89',-.18),('text_added','Plus text','#B16B18',.18)]:
            y=[float(g[g.family.eq(f)&g.variant.eq(v)].MAE_pp.iloc[0]) for f in families]
            ax.bar(np.arange(4)+offset,y,width=.34,label=label,color=color)
        for f,label,color,pos in [('historical_mean','Historical mean','#8B939A',4.8),('zero_return','Zero return','#333333',5.7)]:
            ax.bar(pos,float(g[g.family.eq(f)].MAE_pp.iloc[0]),width=.55,label=label,color=color)
        ax.set_xticks([0,1,2,3,4.8,5.7],['Ridge','Elastic\nNet','SVR','Random\nForest','Mean','Zero'],fontsize=8)
        ax.set_title(('Full history' if case=='expanded_legacy_live' else 'Modern-live')+' / '+('Banks' if sector=='banks' else 'Real Estate'))
        ax.set_ylabel('MAE (percentage points)');ax.grid(axis='y');ax.set_axisbelow(True)
    handles,labels=axes[0,0].get_legend_handles_labels()
    fig.legend(handles,labels,loc='outside lower center',ncol=4,frameon=False)
    return fig


def chart_data(d):
    """Exact reviewed data bindings for native slide charts, without display rounding."""
    ts=tables(d)
    bins=np.arange(-23,15,1,dtype=float)
    h={k:np.histogram(d['returns'].loc[d['returns'].instrument.eq(k),'daily_return_pct'],bins)[0].tolist() for k in ORDER}
    # Month-end observed points for slide readability, not month-end returns.
    idx=[]
    for modern in [False,True]:
        low,high=(START,'2020-01-01') if not modern else (BOUNDARY,END)
        p=d['closes'][d['closes'].date.between(low,high)].pivot(index='date',columns='instrument',values='close')
        base_date=p.dropna().index[0];base=p.loc[base_date]
        p.index=pd.to_datetime(p.index)
        m=p.groupby(p.index.to_period('M')).tail(1).copy()
        m.loc[p.index[0]]=p.iloc[0]
        m=m.sort_index();m=100*m/base
        idx.append(dict(period='modern' if modern else 'legacy',base_date=base_date,
                        dates=[x.strftime('%Y-%m-%d') for x in m.index],
                        values={k:m[k].tolist() for k in ORDER}))
    return dict(tables={k:v.where(pd.notna(v),None).to_dict('records') for k,v in ts.items()},
        hist=dict(edges=bins.tolist(),counts=h), rates=d['rates'][['event_date','resolved_before_rate_pct',
          'resolved_after_rate_pct','source_deposit_after_rate_pct']].where(pd.notna(d['rates']),None).to_dict('records'),
        normalized_monthly_indices=idx,
        event_returns={k:d['common'].loc[d['common'].sector.eq(k),'first_session_return_pct'].tolist() for k in ORDER[:2]})


def main():
    folder=Path(__file__).resolve().parent
    package=folder.parent
    with ZipFile(package/'Code_and_Processed_Data.zip') as z:
        def read(name):return pd.read_csv(io.BytesIO(z.read('04_data/processed/first_session_only_2026-10-28/'+name)))
        inv,panel,prices=read('original_text_inventory.csv'),read('event_sector_modeling.csv'),read('daily_prices.csv')
        metrics=pd.read_csv(io.BytesIO(z.read('06_results/first_session_only_2026-10-28/run_001/metrics.csv')))
    rates=pd.read_csv(folder/'policy_rate_provenance_v2.csv')
    d=prepare(inv,panel,prices,rates);style();ts=tables(d)
    (folder/'tables').mkdir(exist_ok=True)
    for k,t in ts.items():t.to_csv(folder/'tables'/(k+'.csv'),index=False,float_format='%.12g')
    figs=[policy_plot(d),index_plot(d),daily_plot(d),event_plot(d),annual_plot(d),sample_plot(d,height=4.8)]
    for i,fig in enumerate(figs,1):save_figure(fig,folder/'figures',f'figure_4_{i}');plt.close(fig)
    fig=workflow_plot();save_figure(fig,folder/'figures','figure_3_1');plt.close(fig)
    fig=result_plot(metrics);save_figure(fig,folder/'figures','figure_5_1');plt.close(fig)
    data=chart_data(d)
    # Strict JSON, including the one unavailable source-stated rate level.
    def clean(v):
        if isinstance(v,dict):return {k:clean(x) for k,x in v.items()}
        if isinstance(v,list):return [clean(x) for x in v]
        if isinstance(v,float) and not np.isfinite(v):return None
        return v
    (folder/'reviewed_data.json').write_text(json.dumps(clean(data),indent=2,allow_nan=False)+'\n')
    print(ts['table_4_2'].round(4).to_string(index=False))
    print(ts['table_4_4'].round(4).to_string(index=False))
    print(ts['table_4_5'].round(4).to_string(index=False))
    print(ts['table_4_6'].round(4).to_string(index=False))
    print('Wrote seven descriptive tables and seven figures. No models fitted.')


if __name__=='__main__':main()
