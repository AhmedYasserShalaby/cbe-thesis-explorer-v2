# CBE Thesis Explorer — research workstation

Open **index.html** in a browser, or double-click **Open_Explorer.command** on
macOS. The complete Website folder contains the data, PDFs, scripts, chart
library and fonts. No installation, account or third-party connection is needed.
Keep Website beside the current report, notebook, workbook and presentation so
**Study files** links work when the handover folder is moved.

## Six workspaces

- **Overview** answers the study question, compares the benchmarks across both
  sectors and saved evaluations, and offers direct access to the worked example.
- **Walkthrough** follows the 6 March 2024 announcement through six steps. It
  shows where the assumed forecast time falls in the close-to-close return
  window, then compares the saved forecasts and benchmarks.
- **Policy & statements** has one search for dates and wording. Open a result
  to read it, compare wording, or view the original PDF. The **Announcement
  records** and **Rate history** tabs show sortable records and signed actions.
- **Markets** covers index prices, daily returns, and first-session outcomes.
  **Policy and market timeline** links deposit rates and prices to a meeting.
- **Forecast results** opens on the saved 119-meeting evaluation and also offers
  the 36-meeting modern evaluation. Use **Benchmarks**, **What text changed**,
  and **Forecasts by meeting** for scores, paired differences and individual
  predictions. **Filtered meetings** applies the current date and policy filters.
- **Data & methods** shows how the matched meetings fed the two overlapping
  evaluations. It includes filtered coverage, seven notebook tables, definitions,
  and study files.

## Search and view links

Use **Search Explorer** or `Ctrl+K` / `⌘K` to find a view, meeting date, exact
phrase, or bundled file. Search covers the retained statement archive.
**Policy & statements** searches within the dates and filters you select.
Use the arrow keys and Enter in the search dialog.

**View link** keeps the section and research filters in the address. On a
server it provides a complete link. For offline copies, append the fragment
to the Explorer address. **Download settings** keeps chart zoom and table
preferences for the saved-view import.

## Period, filters and chart windows

Use **Filters** to choose an inclusive date range, policy action or announcement
group. Remove a single active filter with its chip. **Reset filters** returns to the 2020–2026 exploration period. The dialog
also offers full record, notebook and legacy period presets. The saved forecast
evaluation uses its original scored meetings and keeps your filters available
for **Filtered meetings**.

Documents, event outcomes and predictions use the recorded meeting date. Daily
market context uses observation dates and the period only. Action/cohort filters
restrict announcement-linked evidence. A first session after an eligible meeting
can fall outside the meeting-date upper bound. Fixed notebook reference tables
and the full-study sample flow keep their original populations; they are labelled.

Chart zoom is independent of the research selection. **Focus selected meeting**
shows a local window. **Reset zoom** restores the chart. **Use visible dates as
filter** explicitly commits that interval to the research selection. Expanded
charts preserve the window. Source previews and chart exports identify any
zoomed window and retain the distinction from the full selection.

## Reading, comparison and keyboard access

Select a date to open the statement-first inspector. Older/newer controls follow
the filtered meetings and preserve the active inspector tab. Search wording, step
between matches with buttons or `Enter` / `Shift+Enter`, read the original PDF,
or compare two same-language texts. **Exact changes** preserves case, punctuation
and paragraph breaks. **Side by side** supports synchronized reading with inline
change highlights, quick-select buttons (previous meeting or previous same-action
meeting) and prev/next change steppers. Earlier documents outside the period are
clearly labelled. Comparison dates/mode and selected records can survive route
reload; Back/Close returns focus to the triggering control.

All main controls support keyboard operation. Focus a chart and use left/right
or Home/End to inspect exact values (including benchmark reference scores, 95%
paired intervals and five-number boxplot summaries). Enter opens a linked
announcement or selects a model where relevant. Source tables provide a numerical
alternative. Mobile navigation has a focus-contained drawer and Escape/Close
controls. Light (default) and dark themes (`light` / `dark`) and
reduced motion are supported.

## Tables, saved views and exports

Sort a column heading, choose a column preset or Columns, and search records.
Daily tables add instrument, eligibility and return-value filters. Select rows
with checkboxes. Export rows includes all matching pages, or the explicitly
selected rows when selection is active. Original numerical precision, text,
missing values and source flags are retained; screen values are rounded.

Save a useful view in this browser. **Saved views → Export settings** (or
**Export → Portable view settings**) creates a JSON file for another local copy;
**Saved views → Import settings** restores it. Settings contain
filters/presentation choices, not the dataset. Storage failure has an in-session
fallback. Browser-local saved views may differ between file locations or
browsers; use JSON to move them reliably.

Switch between **Chart** and **Data** on the chart card. The data view shows
sortable source rows, source notes and a full-precision CSV. Chart actions
offer expansion, SVG, PNG and metadata.
SVG/PNG exports include series legends where needed, period, units, source and
interpretation notes. A zoomed chart exports its visible date window; the global
Export action uses the active research selection or saved evaluation. Table search/selection is local
to table exports. Current workspace print styles retain selection/source context.

## Definitions and retained limits

The full inventory has 176 documents, 155 matched meetings and 310 sector
outcomes. The two overlapping evaluations contain 119 and 36 forecast meetings
per sector, yielding 3,100 repeated prediction rows, 40 original metric groups
and 16 paired comparisons. Repeated rows are not independent observations.

Price lines break at the 2020 sector-definition boundary, missing closes and
gaps over seven days. Rebased series share a first common eligible date within
each selected pre/post-2020 segment, including EGX30. Select EGX30 alone for its
longer history. Daily-return summaries require both endpoints inside the period;
the notebook comparison interval is 3 January 2007–18 October 2026. SD uses n−1;
quartiles use linear interpolation. Boxplots use 1.5 IQR whiskers and retain
outliers, with minima/maxima separately available in statistics.

Selected forecast scores are descriptive arithmetic on saved predictions. Models
are not refitted. Original descriptive intervals appear only for their exact
original evaluation dates. No subset uncertainty interval is generated.
Direction excludes flat actual returns; balanced direction requires both actual
classes. The before-rate is an implication, not an independently observed rate.
5 November 2009's 8.25% level remains conditional continuity. The excluded
5 October 2005 deposit hold/lending cut retains its source-review note.

The study is retrospective/exploratory. Original release clocks and text vintages
are unverified; prior inspection, dependent/overlapping samples and the index
boundary limit interpretation. There is no causal wording, measured-surprise,
live-forecast or profitability claim. The inventory is not a certified complete
CBE archive. The present edition is packaged for local review. Original CBE web links
require internet. The archived PDFs and data open from the local files.

## Implementation and evidence

The local edition uses React, TypeScript, CSS Modules, and the bundled
Apache ECharts with Inter. The compiled browser entry is `explorer.js` and
`explorer.css`. The original data and forecasting core load from their
bundled scripts. Inter and chart-library license files are under `vendor/`.

The standalone folder opens offline. Original CBE web links open the CBE
website when selected. See the local project's QA reports for verification.
