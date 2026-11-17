import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from './icons';
import { evaluations, exampleMeeting, sectors, studyHeadline } from './research/snapshot';
import type { Evaluation, ResearchSnapshot } from './research/snapshot';
import s from './Overview.module.css';

const fullDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' });

function ForecastBenchmarks({ model }: { model: ResearchSnapshot }) {
  const { CBECore: core, CBEUI: format } = window;
  const [selected, select] = useState<Evaluation>(evaluations[0]);
  const rows = evaluations.flatMap(evaluation => sectors.map(sector => {
    const scores = model.fullScores(evaluation, sector);
    const zero = scores.find(score => score.family === 'zero_return');
    const mean = scores.find(score => score.family === 'historical_mean');
    const best = scores.filter(score => score.variant !== 'reference')
      .sort((a, b) => Number(a.MAE_pp) - Number(b.MAE_pp))[0];
    return { evaluation, sector, zero, mean, best };
  }));
  const scoreKeys = ['zero', 'mean', 'best'] as const;
  const labels = { zero: '0% return', mean: 'Past average', best: 'Best learned model' };
  const maxError = Math.max(...rows.flatMap(row => scoreKeys.map(key => Number(row[key]?.MAE_pp ?? 0))));
  const scale = Math.max(1, Math.ceil(maxError));
  const selectedRows = rows.filter(row => row.evaluation === selected);
  return (
    <section className={s.card} aria-labelledby="benchmark-title">
      <div className={s.cardHeading}>
        <span className={s.cardIcon}><Icon name="forecasts" /></span>
        <h2 id="benchmark-title">How the forecasts compare</h2>
      </div>
      <p className={s.note} id="benchmark-description">
        Mean absolute error (MAE) in percentage points. Lower is better.
      </p>
      <div className={s.cohortSwitch} role="group" aria-label="Benchmark evaluation">
        {evaluations.map(evaluation => (
          <button key={evaluation} type="button" aria-pressed={evaluation === selected}
            aria-controls="benchmark-bars" onClick={() => select(evaluation)}>
            {core.CASES[evaluation]}
          </button>
        ))}
      </div>
      <div id="benchmark-bars" className={s.benchmarkPlot} aria-label={core.CASES[selected]} role="group">
        {selectedRows.map(row => (
          <section className={s.sectorPlot} key={selected + row.sector} aria-labelledby={'benchmark-' + row.sector}>
            <h3 id={'benchmark-' + row.sector}>{core.SECTORS[row.sector]}</h3>
            <ul>
              {scoreKeys.map(key => (
                <li key={key} data-score={key}>
                  <span>{labels[key]}</span>
                  <strong>{format.fmt(row[key]?.MAE_pp, 3)}</strong>
                  <span className={s.barTrack} aria-hidden="true">
                    <span style={{ width: (100 * Number(row[key]?.MAE_pp ?? 0) / scale) + '%' }} />
                  </span>
                </li>
              ))}
            </ul>
            <div className={s.scale} aria-hidden="true"><span>0</span><span>{scale / 2}</span><span>{scale} pp</span></div>
          </section>
        ))}
      </div>
      <div className={s.benchmarkFooter}>
        <p role="status">{selectedRows[0]?.zero?.test_events} scored meetings per sector</p>
        <a href={'#forecasts?scope=saved&sample=' + selected} data-page="forecasts"
          data-study-results data-study-sample={selected} className="text-button">
          Open this evaluation <Icon name="arrow" />
        </a>
      </div>
      <details className={s.benchmarkDetails}>
        <summary>Exact values and model names <Icon name="down" /></summary>
        <table className={s.benchmarks} aria-describedby="benchmark-description">
          <caption className="sr-only">Forecast errors in both saved evaluations</caption>
          <thead>
            <tr>
              <th scope="col">Sector and evaluation</th>
              <th scope="col">0% return</th>
              <th scope="col">Past average</th>
              <th scope="col">Best learned model</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ evaluation, sector, zero, mean, best }) => (
              <tr key={evaluation + sector}>
                <th scope="row">
                  {core.SECTORS[sector]}
                  <span className={s.sample} data-evaluation={evaluation}>{core.CASES[evaluation]} · {zero?.test_events} meetings</span>
                </th>
                <td className={s.lowest}><b className={s.cellLabel} aria-hidden="true">0% return</b>{format.fmt(zero?.MAE_pp, 3)}</td>
                <td><b className={s.cellLabel} aria-hidden="true">Past average</b>{format.fmt(mean?.MAE_pp, 3)}</td>
                <td>
                  <b className={s.cellLabel} aria-hidden="true">Best model</b>{format.fmt(best?.MAE_pp, 3)}
                  {best && <span>{core.FAMILIES[best.family]} · {best.variant === 'text_added' ? 'with text' : 'numbers only'}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

function MeetingExample({ model }: { model: ResearchSnapshot }) {
  const doc = model.byId.get(exampleMeeting);
  if (!doc) return null;
  const rate = model.rates.get(doc.id);
  const { CBECore: core, CBEUI: format } = window;
  return (
    <section className={s.card + ' ' + s.example} aria-labelledby="meeting-example-title">
      <div className={s.exampleHeading}>
        <span className={s.exampleIcon}><Icon name="policy" /></span>
        <div>
          <p className={s.exampleLabel}>Worked example</p>
          <h2 id="meeting-example-title"><time dateTime={doc.date}>{fullDate.format(new Date(doc.date + 'T12:00:00Z'))}</time></h2>
        </div>
      </div>
      <ol className={s.meetingTimeline}>
        <li>
          <h3>6 March · Policy decision</h3>
          <dl><div><dt>Deposit rate change</dt><dd>{format.signed(rate?.bps, 0)} bps</dd></div></dl>
          <a className={'text-button ' + s.detailLink} href={doc.original} target="_blank" rel="noopener">
            <Icon name="file" /> Original CBE statement (PDF)
          </a>
        </li>
        <li>
          <h3>7 March · First-session close</h3>
          <dl>{sectors.map(sector => (
            <div key={sector}>
              <dt>{core.SECTORS[sector]} return</dt>
              <dd>{format.signed(model.events.get(doc.id + '|' + sector)?.first_session_return_pct, 3)}%</dd>
            </div>
          ))}</dl>
          <p className={s.note}>Returns measured from the 6 March close.</p>
        </li>
      </ol>
      <button type="button" className="quiet-button" data-action="trace-demo" data-doc={doc.id}>
        Trace 6 March 2024 <Icon name="arrow" />
      </button>
    </section>
  );
}

function TextEvidence({ model, summary }: {
  model: ResearchSnapshot;
  summary: ReturnType<typeof studyHeadline>;
}) {
  return (
    <section className={s.textEvidence} aria-labelledby="text-evidence-title">
      <h2 id="text-evidence-title">What statement text added</h2>
      <p className={s.statline}>
        <strong>{summary.lowerMAE.length}<span> / {summary.pairs}</span></strong>
        <span>matched comparisons with lower average error</span>
      </p>
      <ul className={s.comparisons}>
        {evaluations.map(evaluation => {
          const pairs = model.D.pairs.filter(pair => pair.case === evaluation);
          const improved = pairs.filter(pair => Number(pair.MAE_difference_pp) < 0).length;
          return (
            <li key={evaluation} data-evaluation={evaluation}>
              <div className={s.comparisonLabel}>
                <span>{window.CBECore.CASES[evaluation]}</span>
                <span>{improved} of {pairs.length} lower</span>
              </div>
              <div className={s.tiles} aria-hidden="true">
                {pairs.map((pair, index) => (
                  <span key={pair.sector + pair.family} className={s.tile}
                    data-improved={Number(pair.MAE_difference_pp) < 0 ? '' : undefined}
                    style={{ '--comparison-index': index } as CSSProperties} />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <p className={s.intervals}>
        <strong>{summary.includesZero} of {summary.pairs}</strong> saved 95% intervals for the change in average error included zero.
      </p>
      <a href="#forecasts?scope=saved&view=text" data-page="forecasts" data-study-results="text" className={'text-button ' + s.detailLink}>
        See paired results <Icon name="arrow" />
      </a>
    </section>
  );
}

const evidenceLinks = [
  ['policy', 'Policy & statements', 'Read the original CBE releases and trace rate decisions.', 'policy'],
  ['markets', 'Markets', 'Explore index closes, daily returns, and first-session outcomes.', 'markets'],
  ['data', 'Data & methods', 'Check sample coverage, definitions, and bundled study files.', 'data'],
] as const;

export function Overview({ model }: { model: ResearchSnapshot }) {
  const summary = studyHeadline(model);
  return (
    <div id="overview-dashboard" className={s.overview}>
      <div id="overview-finding" className={s.hero}>
        <div className={s.heroCopy}>
          <p className={s.studyArea}>Egyptian banks and real estate</p>
          <h1 id="overview-title">Do central bank statements improve stock-return forecasts?</h1>
          <p className={s.answer}>
            <strong>Predicting no change gave the lowest errors.</strong>
            {' '}A 0% return forecast beat all {summary.zeroWins} learned variants on both error measures across the two saved evaluations.
          </p>
          <div className={s.actions}>
            <a href="#forecasts?scope=saved" className="button" data-page="forecasts" data-study-results>
              See forecast results <Icon name="arrow" />
            </a>
            <a href="#walkthrough" className="quiet-button" data-page="walkthrough" data-start-walkthrough>
              <Icon name="guide" /> Start walkthrough
            </a>
          </div>
        </div>
        <TextEvidence model={model} summary={summary} />
      </div>
      <div className={s.evidence}>
        <ForecastBenchmarks model={model} />
        <MeetingExample model={model} />
      </div>
      <section className={s.evidenceLinks} aria-labelledby="evidence-links-title">
        <h2 id="evidence-links-title">Explore the evidence</h2>
        <div className={s.linkGrid}>
          {evidenceLinks.map(([page, label, description, glyph]) => (
            <a key={page} className={s.evidenceLink} href={'#' + page} data-page={page}>
              <span className={s.cardIcon}><Icon name={glyph} /></span>
              <span><strong>{label}</strong><small>{description}</small></span>
              <span className={s.linkArrow}><Icon name="arrow" /></span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
