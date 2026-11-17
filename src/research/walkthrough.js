/* Source-linked walkthrough copy from the supervisor edition. */
const C = window.CBECore;
const {date, esc, fmt, icon, signed, simpleTable} = window.CBEUI;
import { exampleMeeting as exampleId, studyHeadline } from './snapshot';
const sectors = ['banks', 'real_estate'];

function question(model) {
  const matched = model.docs.filter(doc => doc.inAnalysis).length;
  return `
    <p class="walkthrough-lead">Does the wording of a Central Bank of Egypt (CBE) policy statement help forecast Egyptian bank and real estate stock-index returns once the rate decision and recent market moves are known?</p>
    <dl class="walkthrough-facts">
      <div><dt>CBE documents collected</dt><dd>${fmt(model.docs.length, 0)}</dd></div>
      <div><dt>Announcements matched to both indices</dt><dd>${fmt(matched, 0)}</dd></div>
      <div><dt>Sector returns, two per meeting</dt><dd>${fmt(matched * sectors.length, 0)}</dd></div>
    </dl>
    <details class="walkthrough-details">
      <summary>How the dataset was built</summary>
      <p>The study pairs official English policy statements with Refinitiv closing prices. Meetings enter the analysis when both sector returns and the earlier market inputs can be calculated. The prior EGX30 return represents the broader Egyptian stock market.</p>
      <button class="text-button" data-page="data">See sample coverage ${icon('arrow')}</button>
    </details>`;
}

function announcement(model) {
  const doc = model.byId.get(exampleId);
  const rate = model.rates.get(exampleId);
  return `
    <p class="walkthrough-lead">On ${date(doc.date)}, the CBE announced a rate increase and discussed its inflation outlook. The study uses the rate change and the statement wording as separate inputs.</p>
    <div class="walkthrough-inputs">
      <section>
        <h3>The rate decision</h3>
        <p><strong>${signed(rate.bps, 0)} basis points</strong> raised the deposit rate to ${fmt(rate.after)}%. The increase equals ${fmt(rate.bps / 100, 0)} percentage points.</p>
      </section>
      <section>
        <h3>The statement wording</h3>
        <blockquote>“The MPC reiterates that the path of future policy rates remains a function of forecasted inflation.”</blockquote>
      </section>
    </div>
    <a href="${esc(doc.original)}" class="quiet-button" target="_blank" rel="noopener">${icon('file')} Read the original CBE statement (PDF)</a>`;
}

function sessionReturn(model) {
  const rows = sectors.map(sector => model.events.get(exampleId + '|' + sector));
  const {preceding_session_date: before, first_session_date: after} = rows[0];
  return `
    <p class="walkthrough-lead">The first-session return measures the change from the 6 March close to the 7 March close. The assumed forecast time is just before trading opens on 7 March.</p>
    <figure class="walkthrough-timeline">
      <figcaption>The assumed forecast time falls inside the return window</figcaption>
      <ol>
        <li><time datetime="${esc(before)}">${date(before)}</time><strong>Preceding close</strong><span>Return starts</span></li>
        <li class="walkthrough-cutoff"><time datetime="${esc(after)}">${date(after)}</time><strong>Just before the open</strong><span>Assumed forecast time</span></li>
        <li><time datetime="${esc(after)}">${date(after)}</time><strong>First-session close</strong><span>Return ends</span></li>
      </ol>
    </figure>
    ${simpleTable(['Sector index', '6 Mar close', '7 Mar close', 'Return'], rows.map(row => [
      esc(C.SECTORS[row.sector]), fmt(row.preceding_session_sector_close),
      fmt(row.first_session_sector_close), signed(row.first_session_return_pct) + '%'
    ]), 'Refinitiv closing levels in index points')}
    <p class="walkthrough-note">The market inputs use closes before the meeting date. The original statement release time remains unverified.</p>`;
}

function comparison(model) {
  const saved = model.D.predictions.filter(row =>
    row.doc_id === exampleId && row.case === 'expanded_legacy_live' && row.sector === 'banks'
  );
  const numerical = saved.find(row => row.family === 'ridge' && row.variant === 'numerical');
  const textAdded = saved.find(row => row.family === 'ridge' && row.variant === 'text_added');
  const zero = saved.find(row => row.family === 'zero_return');
  const actual = Number(numerical.actual_pp);
  return `
    <p class="walkthrough-lead">The same model forecasts the same meetings twice. The second forecast also uses four features from the statement.</p>
    <div class="walkthrough-inputs">
      <section><h3>Numbers only</h3><p>The rate change and earlier returns for the sector index and EGX30. The full-history model also gets an indicator for the older index definition.</p></section>
      <section><h3>Numbers plus text</h3><p>The same model and numbers, with four features derived from the statement.</p></section>
    </div>
    <h3>How one forecast was scored</h3>
    <p>The observed Banks return was <strong>${signed(actual)}%</strong>. The error is the absolute distance between the forecast and the actual return, in percentage points.</p>
    ${simpleTable(['Forecast', 'Predicted return', 'Absolute error'], [
      ['Numbers only', numerical], ['Numbers plus text', textAdded], ['No change', zero]
    ].map(([label, row]) => [
      label, signed(row.prediction_pp) + '%', fmt(Math.abs(Number(row.prediction_pp) - actual)) + ' pp'
    ]), '6 March 2024 · Banks · Ridge model · Full-history evaluation')}
    <details class="walkthrough-details">
      <summary>How the words became model inputs</summary>
      <p>Word2Vec learned word vectors from earlier statements. The study averaged the vectors it recognized in the new statement, then used principal component analysis fitted on earlier data to reduce the average to four features. The study made the same comparison with Ridge, Elastic Net, support vector regression and random forest.</p>
    </details>`;
}

function results(model) {
  const scores = model.X.fullMetrics;
  const { zeroWins, learned, lowerMAE, pairs, includesZero } = studyHeadline(model);
  const exampleScores = scores.filter(row => row.case === 'modern_live_only' && row.sector === 'real_estate');
  const bars = [
    ['Predict no change', exampleScores.find(row => row.family === 'zero_return'), 'reference'],
    ['Forest with numbers plus text', exampleScores.find(row => row.family === 'random_forest' && row.variant === 'text_added'), 'text-added'],
    ['Forest with numbers only', exampleScores.find(row => row.family === 'random_forest' && row.variant === 'numerical'), 'numerical']
  ];
  const scale = Math.max(...bars.map(([, row]) => Number(row.MAE_pp))) * 1.08;
  return `
    <p class="walkthrough-lead">Predicting a 0% return gave lower errors on both main measures in ${zeroWins} of ${learned} comparisons with fitted models. Adding text lowered average absolute error in ${lowerMAE.length} of ${pairs} matched comparisons.</p>
    <figure class="walkthrough-bars">
      <figcaption><strong>Real Estate example · ${fmt(bars[0][1].test_events, 0)} scored meetings with modern indices</strong><span>Mean absolute error in percentage points. Lower is better.</span></figcaption>
      <ul>
        ${bars.map(([label, row, color]) => `
          <li>
            <span>${esc(label)}</span>
            <span class="walkthrough-bar-track" aria-hidden="true"><span style="width:${100 * Number(row.MAE_pp) / scale}%;background:var(--${color})"></span></span>
            <strong>${fmt(row.MAE_pp)} pp</strong>
          </li>`).join('')}
      </ul>
    </figure>
    <p>In this comparison, text lowered the forest's average error. The 0% forecast still had the smallest error. The full study also compared models with a forecast based on the historical average.</p>
    <details class="walkthrough-details">
      <summary>How to read the error measures and intervals</summary>
      <p>The model comparisons cover two sectors and two overlapping evaluations. Real Estate returns were more variable than Banks returns in the matched sample.</p>
      <p>Mean absolute error (MAE) averages the size of each miss. Root mean squared error (RMSE) gives larger misses more weight. In ${includesZero} of ${pairs} paired text comparisons, the descriptive interval for the change in MAE included zero.</p>
    </details>`;
}

function interpretation(model) {
  const report = model.X.manifest.files.find(file => file.label === 'Full report');
  return `
    <p class="walkthrough-lead">The selected text features gave limited forecasting gains in this historical comparison. Linking the original statements to market data makes it possible to trace each forecast and check it against simple alternatives.</p>
    <dl class="walkthrough-interpretation">
      <div><dt>Forecast accuracy</dt><dd>The test compares prediction errors. Measuring a causal effect of wording would require separating the statement from the rate action and other news.</dd></div>
      <div><dt>Real-time use</dt><dd>A real-time test would record when the full statement became available and measure returns from a point after the forecast could be made.</dd></div>
      <div><dt>Sample coverage</dt><dd>The sector indices changed in 2020. The study checks the newer definitions using an overlapping 2020-onward sample. The historical outcomes had already been inspected.</dd></div>
    </dl>
    <div class="walkthrough-links">
      <a href="${esc(report.href)}" class="quiet-button" target="_blank" rel="noopener">${icon('file')} Read the thesis (PDF)</a>
      <button class="quiet-button" data-page="data">Explore data and methods</button>
    </div>`;
}

export const steps = {
  question: {label:'Question', title:'What did the thesis ask?', body:question},
  announcement: {label:'Announcement', title:'What did the CBE announce?', body:announcement},
  return: {label:'Return', title:'Which return did the study forecast?', body:sessionReturn},
  comparison: {label:'Comparison', title:'How did the study compare the forecasts?', body:comparison},
  results: {label:'Results', title:'How well did the forecasts do?', body:results},
  interpretation: {label:'Interpretation', title:'What does the study establish?', body:interpretation}
};
