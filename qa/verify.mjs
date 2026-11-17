import { strict as assert } from 'node:assert';
import { createReadStream } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const project = fileURLToPath(new URL('../', import.meta.url));
const site = join(project, 'site');
const qa = join(project, 'qa', 'monochrome');
const shots = join(qa, 'screenshots');
const prefix = '/cbe-thesis-explorer/';
const evidence = { cases: [], layout: [], accessibility: [], failures: [] };
const meeting = 'central_bank_of_egypt_2024_06-03-2024';
const studyViews = ['overview', 'walkthrough?step=return', 'policy', 'markets', 'forecasts', 'data'];
const extraViews = [
  'policy?view=records', 'policy?view=rates', 'markets?view=daily', 'markets?view=event', 'markets?view=linked',
  'forecasts?scope=saved&view=text', 'forecasts?scope=saved&view=meeting', 'data?dataView=tables', 'data?dataView=methods',
];
const chartless = ['overview', 'walkthrough?step=return', 'policy', 'policy?view=records', 'data?dataView=tables', 'data?dataView=methods'];
const types = new Map([['.html', 'text/html'], ['.js', 'text/javascript'], ['.css', 'text/css'], ['.pdf', 'application/pdf'], ['.json', 'application/json'], ['.csv', 'text/csv']]);

const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    assert(path.startsWith(prefix));
    const relative = path.slice(prefix.length) || 'index.html';
    const file = resolve(site, relative);
    assert(file.startsWith(site + sep));
    const info = await stat(file);
    assert(info.isFile());
    res.writeHead(200, { 'Content-Type': types.get(extname(file)) || 'application/octet-stream', 'Content-Length': info.size });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
});
await mkdir(shots, { recursive: true });
await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
const origin = 'http://127.0.0.1:' + server.address().port;
const url = origin + prefix + 'Website/index.html';
const browser = await chromium.launch({ channel: 'chrome' });
evidence.chrome = browser.version();

const layoutViewports = [
  ['desktop', 1440, 900],
  ['laptop', 1280, 720],
  ['tablet', 1024, 768],
  ['zoom', 720, 450],
  ['phone', 390, 844],
  ['small-phone', 375, 667],
  ['landscape', 667, 375],
];
const a11yTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

function monitor(page, allowedOrigin) {
  const faults = { errors: [], requests: [], failed: [] };
  page.on('pageerror', error => faults.errors.push(error.message));
  page.on('console', line => { if (line.type() === 'error') faults.errors.push(line.text()); });
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== allowedOrigin) faults.requests.push(request.url());
  });
  page.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') faults.failed.push(request.url());
  });
  return faults;
}

async function logged(name, run) {
  try {
    await run();
    evidence.cases.push({ name, status: 'pass' });
    console.log('PASS', name);
  } catch (error) {
    evidence.failures.push({ name, error: error.stack || String(error) });
    console.error('FAIL', name, error.message);
  }
}

async function open(page, hash, base = url) {
  const pageName = hash.split('?')[0];
  await page.goto(base + '#' + hash);
  await page.waitForFunction(name => document.body.dataset.workspace === name && !!window.CBE_RESEARCH, pageName);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function readDownload(page, click) {
  const [download] = await Promise.all([page.waitForEvent('download'), click()]);
  const path = await download.path();
  return { name: download.suggestedFilename(), bytes: await readFile(path) };
}

async function scan(page, name) {
  const scan = await new AxeBuilder({ page }).withTags(a11yTags).analyze();
  const violations = scan.violations.map(v => ({ rule: v.id, targets: v.nodes.map(node => node.target.join(' ')) }));
  evidence.accessibility.push({ name, passes: scan.passes.length, violations });
  assert.deepEqual(violations, [], name);
}

async function waitCount(page, expected) {
  await page.waitForFunction(count => window.CBE_RESEARCH.snapshot().counts.documents === count, expected);
}

async function applyMeetingFilters(page, action = 'hike', cohort = 'in') {
  await page.click('#period-button');
  await page.selectOption('#filter-action', action);
  await page.selectOption('#filter-cohort', cohort);
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await page.locator('#filter-dialog').waitFor({ state: 'hidden' });
}

async function showResultsTab(page, name) {
  await page.getByRole('group', { name: 'Forecast views' }).getByRole('button', { name, exact: true }).click();
}

async function pickSearchResult(page, query) {
  const search = page.locator('#explorer-search');
  await search.fill(query);
  await page.locator('#search-results [role="option"]').first().waitFor();
  await search.press('Enter');
}

function mobileTargets() {
  const selectors = [
    '#menu-toggle', '#search-statements', '#view-link', '#open-exports', '#period-button',
    '[data-action="save-view"]', '[data-action="trace-demo"]', '.workspace a[data-page]', '#reset-filters',
    '.workspace button.icon-button', '.workspace select', '.workspace .tabs-row button',
    '.result-settings .segmented button', '.chart-mode button', '.filter-tag', 'dialog[open] button.icon-button',
    'dialog[open] .inspector-tabs button', '#sidebar.open nav a',
    '[aria-controls="benchmark-bars"]', '.walkthrough-steps button',
  ];
  return [...document.querySelectorAll(selectors.join(','))]
    .filter(el => el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true }) && !el.disabled)
    .map(el => {
      const rect = el.getBoundingClientRect();
      return { target: el.id || el.getAttribute('aria-label') || el.textContent.trim(), width: rect.width, height: rect.height };
    }).filter(rect => rect.width < 43.9 || rect.height < 43.9);
}

try {
  await logged('Responsive routes, black palette under both system schemes, charts, and touch sizes', async () => {
    for (const theme of ['light', 'dark']) {
      for (const [layout, width, height] of layoutViewports) {
        const ctx = await browser.newContext({
          viewport: { width, height }, reducedMotion: layout === 'zoom' ? 'reduce' : 'no-preference',
          deviceScaleFactor: layout === 'zoom' ? 2 : 1, colorScheme: theme,
        });
        await ctx.addInitScript(value => { localStorage.setItem('cbe-research-workstation.theme.v1', JSON.stringify(value)); }, theme);
        const page = await ctx.newPage();
        const faults = monitor(page, origin);
        const routes = layout === 'desktop' || layout === 'phone' ? [...studyViews, ...extraViews] : studyViews;
        try {
          for (const route of routes) {
            await open(page, route);
            const data = await page.evaluate(() => ({
              page: document.body.dataset.workspace,
              theme: document.documentElement.dataset.theme,
              viewport: innerWidth,
              document: document.documentElement.scrollWidth,
              overflowElements: ['#main', '#view', '#overview-dashboard', '.policy-layout', '.statement-preview'].flatMap(selector => {
                const el = document.querySelector(selector);
                return el && el.scrollWidth > el.clientWidth + 1 ? [selector] : [];
              }),
              charts: document.querySelectorAll('.chart-surface svg').length,
              innerScroll: ['auto', 'scroll', 'hidden'].includes(getComputedStyle(document.getElementById('main')).overflowY),
              heading: document.querySelector('#overview-title, #page-tools:not([hidden]) h1').getBoundingClientRect().bottom,
              firstActions: [...document.querySelectorAll('#overview-finding .button[data-study-results], #overview-finding [data-start-walkthrough]')].map(el => el.getBoundingClientRect().bottom),
              errors: window.CBE_RESEARCH.snapshot().errors,
              inter: [...document.fonts].some(font => font.family === 'Inter' && font.status === 'loaded'),
            }));
            evidence.layout.push({ layout, route, systemScheme: theme, ...data });
            assert.equal(data.theme, 'dark');
            assert.equal(data.document, width);
            assert.deepEqual(data.overflowElements, [], layout + ' ' + route);
            assert.deepEqual(data.errors, []);
            assert(data.inter);
            assert.equal(data.innerScroll, false, layout + ' ' + route);
            if (chartless.includes(route)) assert.equal(data.charts, 0, route);
            else assert(data.charts > 0, route);
            if (route === 'overview' && ['desktop', 'laptop', 'phone'].includes(layout)) {
              assert(data.heading > 0 && data.firstActions.length === 2);
              assert(Math.max(...data.firstActions) <= height);
            }
            if (layout === 'phone' || layout === 'small-phone') assert.deepEqual(await page.evaluate(mobileTargets), [], layout + ' ' + route);

            const shot = route === 'overview' ||
              (!route.includes('?') || route.startsWith('walkthrough')) && ['desktop', 'tablet', 'phone'].includes(layout);
            if (shot && (layout !== 'small-phone' || theme === 'light')) {
              await page.screenshot({
                  animations: 'disabled',
                fullPage: route === 'overview' && layout === 'desktop',
                path: join(shots, data.page + '-' + layout + '-' + theme + '.png'),
              });
            }
            if (layout === 'desktop' || layout === 'phone') {
              if (studyViews.includes(route)) await scan(page, data.page + ' ' + layout + ' ' + theme);
            }
            if (layout === 'desktop' && theme === 'light' && route === 'overview') {
              const geometry = await page.evaluate(() => {
                const rect = selector => {
                  const r = document.querySelector(selector).getBoundingClientRect();
                  return [r.left, r.top, r.right, r.bottom];
                };
                return {
                  sidebar: rect('#sidebar'), header: rect('header'), heading: rect('#overview-title'),
                  finding: rect('#overview-finding'), benchmarkTable: rect('#benchmark-title'),
                  trace: rect('[data-action="trace-demo"]'),
                  documentHeight: document.scrollingElement.scrollHeight,
                  documentWidth: document.scrollingElement.clientWidth,
                };
              });
              assert.equal(geometry.sidebar[0], 0);
              assert.equal(geometry.sidebar[1], 0);
              assert.equal(geometry.header[1], 0);
              assert.equal(geometry.header[2], width);
              await writeFile(join(qa, 'geometry.json'), JSON.stringify(geometry, null, 2));
            }
          }
          assert.deepEqual(faults, { errors: [], requests: [], failed: [] });
        } finally { await ctx.close(); }
      }
    }
  });

  await logged('Filters, date and wording search, and Back/Forward', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const faults = monitor(page, origin);
    try {
      await open(page, 'overview');
      const hero = await page.locator('#overview-dashboard').innerText();
      for (const value of ['32 learned variants', 'matched comparisons', '15 of 16', '+600 bps', '+4.597%', '+2.169%']) assert(hero.includes(value));
      assert.equal(await page.locator('#overview-dashboard tbody tr').count(), 4);
      assert.equal(await page.locator('#overview-finding [data-improved]').count(), 3);
      const full = page.locator('#overview-finding li[data-evaluation="expanded_legacy_live"]');
      const modern = page.locator('#overview-finding li[data-evaluation="modern_live_only"]');
      assert.match(await full.innerText(), /2 of 8 lower/);
      assert.match(await modern.innerText(), /1 of 8 lower/);
      await page.getByRole('link', { name: 'See paired results' }).click();
      assert.match(await page.locator('.result-scope').innerText(), /119 scored meetings/);
      assert(await page.locator('#chart-paired-banks').isVisible());
      await page.goBack();
      await page.waitForSelector('#overview-title');
      assert.equal(await page.locator('#research-tools').isVisible(), false);

      await page.keyboard.press('Control+k');
      await page.waitForFunction(() => document.activeElement.id === 'explorer-search');
      await pickSearchResult(page, 'policy & statements');
      await page.waitForSelector('#policy-search');
      await applyMeetingFilters(page);
      await waitCount(page, 8);
      await page.fill('#policy-search', '6 March 2024');
      await page.waitForFunction(() => document.querySelectorAll('.document-list [data-doc]').length === 1);
      await page.waitForSelector('.document-list [data-doc="' + meeting + '"]');
      await page.getByRole('button', { name: 'Announcement records', exact: true }).click();
      await page.waitForSelector('#table-announcements');
      assert.match(await page.locator('#table-announcements .table-footer').innerText(), /of 8 rows/);
      await page.goBack();
      await page.waitForSelector('#policy-search');
      assert.equal(await page.locator('#policy-search').inputValue(), '6 March 2024');
      await page.goForward();
      await page.waitForSelector('#table-announcements');
      await page.click('#search-statements');
      await page.waitForFunction(() => document.activeElement.id === 'explorer-search');
      await pickSearchResult(page, 'policy & statements');
      await page.waitForSelector('#policy-search');
      assert.equal(await page.locator('#policy-search').count(), 1);
      await page.fill('#policy-search', 'function of forecasted inflation');
      await page.waitForFunction(() => location.hash.includes('function+of+forecasted+inflation'));
      await page.getByRole('button', { name: 'Clear search' }).click();
      await page.waitForFunction(() => !new URLSearchParams(location.hash.split('?')[1]).has('q'));
      await page.goto(url + '#policy?from=1998-01-01&to=1998-01-01');
      await waitCount(page, 0);
      assert(await page.getByText('No matching policy documents.').isVisible());
      await page.click('#period-button');
      if (await page.locator('#filter-dialog .date-details').getAttribute('open') === null) {
        await page.getByText('Choose exact dates').click();
      }
      await page.fill('#filter-from', '2024-12-31');
      await page.fill('#filter-to', '2024-01-01');
      await page.getByRole('button', { name: 'Apply filters' }).click();
      assert(await page.locator('#filter-error').isVisible());
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'period-button');
      await page.click('#reset-filters');
      await waitCount(page, 56);
      assert.deepEqual(faults, { errors: [], requests: [], failed: [] });
    } finally { await page.close(); }
  });

  await logged('Global search locates study views, exact dates, wording, and bundled files', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const faults = monitor(page, origin);
    try {
      await open(page, 'overview');
      await page.keyboard.press('Control+k');
      await page.waitForFunction(() => document.activeElement.id === 'explorer-search');
      const search = page.locator('#explorer-search');
      await search.press('ArrowDown');
      assert.equal(await search.getAttribute('aria-activedescendant'), 'search-result-1');
      await search.press('Enter');
      await page.waitForSelector('#walkthrough-step-title');
      await page.click('#search-statements');
      await search.fill('no such statement 446812');
      assert(await page.getByText('No matches. Try a meeting date', { exact: false }).isVisible());
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.activeElement.id === 'search-statements');

      await page.click('#search-statements');
      await search.fill('6 March 2024');
      await page.getByRole('option', { name: /6 March 2024/ }).waitFor();
      await page.screenshot({ animations: 'disabled', path: join(shots, 'search-desktop.png') });
      await scan(page, 'search results desktop');
      await search.press('Enter');
      await page.waitForSelector('#inspector-dialog[open]');
      assert.match(await page.locator('#inspector-title').innerText(), /6 Mar 2024/);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.activeElement.id === 'search-statements');

      await page.click('#search-statements');
      await pickSearchResult(page, 'function of forecasted inflation');
      await page.waitForSelector('#inspector-dialog[open] mark');
      await page.keyboard.press('Escape');
      await page.waitForSelector('#inspector-dialog[open]', { state: 'hidden' });

      await page.click('#search-statements');
      await search.fill('ipynb');
      const downloaded = await readDownload(page, () => search.press('Enter'));
      assert.equal(downloaded.name, 'Thesis.ipynb');
      assert(downloaded.bytes.length > 0);
      assert.deepEqual(faults, { errors: [], requests: [], failed: [] });
    } finally { await context.close(); }
  });

  await logged('Chart data displays scoped rows, retains chart state, and exports exact values', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const faults = monitor(page, origin);
    try {
      await open(page, 'forecasts?scope=saved');
      const display = page.getByRole('group', { name: 'Banks display', exact: true });
      await page.evaluate(() => { window.dataAuditChart = window.echarts.getInstanceByDom(document.getElementById('chart-model-banks')); });
      await display.getByRole('button', { name: 'Data', exact: true }).click();
      const table = page.locator('#table-chart-data-model-banks');
      await table.waitFor();
      assert.match(await table.locator('thead').innerText(), /MAE \(pp\)/);
      assert.match(await table.locator('.table-footer').innerText(), /of 10 rows/);
      await table.getByRole('button', { name: 'MAE (pp)', exact: true }).click();
      assert.match(await table.locator('tbody tr').first().innerText(), /Zero return|Zero-return|No change/i);
      await page.screenshot({ animations: 'disabled', path: join(shots, 'forecast-data-desktop.png') });
      await scan(page, 'forecast chart data desktop');
      const numericData = await readDownload(page, () => page.locator('[aria-labelledby="model-banks-title"]').getByRole('button', { name: 'Download CSV' }).click());
      assert.equal(numericData.bytes.toString('utf8').trim().split(/\r?\n/).length, 11);
      await display.getByRole('button', { name: 'Chart', exact: true }).click();
      await page.waitForSelector('#chart-model-banks svg');
      assert(await page.evaluate(() => window.dataAuditChart === window.echarts.getInstanceByDom(document.getElementById('chart-model-banks'))));

      await open(page, 'markets?view=linked');
      await page.getByLabel('Select a meeting').selectOption(meeting);
      await page.locator('[data-action="focus-date"][data-chart="linked-timeline"]').click();
      await page.getByRole('group', { name: 'Policy and market timeline display' }).getByRole('button', { name: 'Data', exact: true }).click();
      assert.match(await page.locator('.chart-table-view').innerText(), /chart window/);
      const slice = await readDownload(page, () => page.getByRole('button', { name: 'Download CSV' }).click());
      const rows = slice.bytes.toString('utf8').trim().split(/\r?\n/).slice(1);
      const dates = rows.map(row => row.split(',')[1].replaceAll('"', ''));
      assert(dates.includes('2024-03-06'));
      assert(dates.every(date => date >= '2023-12-06' && date <= '2024-06-06'));
      assert.deepEqual(faults, { errors: [], requests: [], failed: [] });
    } finally { await context.close(); }
  });

  await logged('Filter chips can be removed individually and restored with Back', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await open(page, 'policy?from=2024&to=2024&action=hike&cohort=in');
      const tags = page.getByRole('group', { name: 'Active filters' });
      assert.equal(await tags.getByRole('button').count(), 3);
      assert.deepEqual(await page.evaluate(mobileTargets), []);
      await page.screenshot({ animations: 'disabled', path: join(shots, 'filters-phone.png') });
      await tags.getByRole('button', { name: 'Remove Rate increases filter' }).press('Enter');
      await page.waitForFunction(() => document.activeElement.id === 'period-button');
      const state = await page.evaluate(() => window.CBE_RESEARCH.snapshot().state);
      assert.equal(state.action, '');
      assert.equal(state.cohort, 'in');
      assert.equal(state.from, '2024-01-01');
      assert.equal(await tags.getByRole('button').count(), 2);
      await page.goBack();
      await tags.getByRole('button', { name: 'Remove Rate increases filter' }).waitFor();
      await open(page, 'markets?action=hike&cohort=in');
      assert.equal(await page.locator('#active-filters').isVisible(), false);
    } finally { await page.close(); }
  });

  await logged('View links retain selections online and portable fragments retain meeting evidence offline', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.copiedExplorerLink = text; } } });
    });
    const page = await context.newPage();
    try {
      await open(page, 'forecasts?scope=filtered&view=text&from=2024&to=2024&action=hike&cohort=in');
      await page.locator('#view-link').click();
      const link = await page.locator('#view-link-value').inputValue();
      assert(link.startsWith(url));
      assert(link.includes('action=hike') && link.includes('cohort=in') && link.includes('view=text'));
      await page.getByRole('button', { name: 'Copy link', exact: true }).click();
      assert.equal(await page.evaluate(() => window.copiedExplorerLink), link);
      assert.equal(await page.locator('[data-action="copy-view-link"] use').getAttribute('href'), '#i-check');
      const recipient = await context.newPage();
      await recipient.goto(link);
      await recipient.waitForSelector('#chart-paired-banks svg');
      assert.match(await recipient.locator('.result-scope').innerText(), /2 of 119/);

      const file = pathToFileURL(join(site, 'Website', 'index.html')).href;
      await open(page, 'overview', file);
      await page.getByRole('button', { name: 'Trace 6 March 2024' }).click();
      await page.locator('#inspector-dialog').getByRole('button', { name: 'View link' }).click();
      const fragment = await page.locator('#view-link-value').inputValue();
      assert(fragment.startsWith('#'));
      assert(fragment.includes('inspect=' + meeting));
      await page.getByRole('button', { name: 'Copy fragment', exact: true }).click();
      assert.equal(await page.evaluate(() => window.copiedExplorerLink), fragment);
      await page.evaluate(() => {
        navigator.clipboard.writeText = async () => { throw new Error('Clipboard unavailable'); };
      });
      await page.getByRole('button', { name: 'Copy fragment', exact: true }).click();
      await page.waitForFunction(() => document.getElementById('view-link-status').textContent.includes('selected'));
      assert(await page.locator('#view-link-value').evaluate(input => input.selectionStart === 0 && input.selectionEnd === input.value.length));
      assert.equal(await page.locator('[data-action="copy-view-link"] use').getAttribute('href'), '#i-link');
      await recipient.goto(file + fragment);
      await recipient.waitForSelector('#inspector-dialog[open]');
      assert.match(await recipient.locator('#inspector-title').innerText(), /6 Mar 2024/);
    } finally { await context.close(); }
  });

  await logged('6 March statement, market closes, exact wording comparison, and saved-forecast CSV', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    try {
      await open(page, 'overview');
      await page.getByRole('button', { name: 'Trace 6 March 2024' }).click();
      const dialog = page.locator('#inspector-dialog');
      assert.match(await dialog.innerText(), /6 Mar 2024[\s\S]*\+600 bps/);
      const pdf = await dialog.getByRole('link', { name: 'Original PDF' }).getAttribute('href');
      assert.equal(pdf, 'documents/155.pdf');
      assert.equal((await page.request.head(new URL(pdf, url).href)).status(), 200);
      const search = dialog.locator('input[data-reader-search]');
      await search.fill('inflation');
      await search.press('Enter');
      assert(await dialog.locator('mark').count() > 0);

      await dialog.getByRole('tab', { name: 'Market observations' }).click();
      const text = await dialog.innerText();
      for (const expected of ['2,755.93', '2,882.62', '3,153.55', '3,221.96', '+4.597', '+2.169']) assert(text.includes(expected), expected);

      await dialog.getByRole('tab', { name: 'Forecasts' }).click();
      assert.match(await dialog.innerText(), /Banks[\s\S]*Real Estate/);
      const file = await readDownload(page, () => dialog.locator('[data-action="reader-export"]').click());
      const rows = file.bytes.toString('utf8').trim().split(/\r?\n/);
      assert.equal(rows.length, 21);
      assert(rows.slice(1).every(line => line.includes(meeting)));
      await scan(page, 'forecast inspector phone');
      assert.deepEqual(await page.evaluate(mobileTargets), []);
      await page.screenshot({ animations: 'disabled', path: join(shots, 'trace-phone-light.png') });

      await dialog.getByRole('button', { name: 'Compare wording' }).click();
      const compare = page.locator('#compare-dialog');
      await compare.locator('.diff-para').first().waitFor();
      assert(await compare.locator('ins,del').count() > 0);
      await compare.getByRole('button', { name: 'Side by side' }).click();
      await compare.locator('.compare-texts').waitFor();
      await page.keyboard.press('Escape');
      await compare.waitFor({ state: 'hidden' });
      assert(await dialog.isVisible());
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.activeElement.matches('[data-action="trace-demo"]'));
    } finally { await context.close(); }
  });

  await logged('Overview benchmark switching, exact scores, and handoff to saved results', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await open(page, 'overview?action=hike');
      const benchmarks = page.getByRole('region', { name: 'How the forecasts compare' });
      const bars = benchmarks.locator('#benchmark-bars');
      const values = [['1.021', '1.050', '1.073', '1.603', '1.629', '1.620'],
        ['1.002', '1.016', '1.019', '1.457', '1.511', '1.531']];
      assert.deepEqual(await bars.locator('li strong').allTextContents(), values[0]);
      const modern = benchmarks.getByRole('button', { name: 'Modern indices' });
      await modern.focus();
      await page.keyboard.press('Space');
      assert.equal(await modern.getAttribute('aria-pressed'), 'true');
      assert.deepEqual(await bars.locator('li strong').allTextContents(), values[1]);
      assert.match(await benchmarks.innerText(), /36 scored meetings per sector/);
      await benchmarks.locator('summary').click();
      assert.deepEqual(await benchmarks.locator('tbody tr').evaluateAll(rows => rows.flatMap(row =>
        [...row.cells].slice(1).map(cell => [...cell.childNodes].find(node => node.nodeType === Node.TEXT_NODE)?.textContent)
      )), values.flat());
      const source = page.getByRole('link', { name: 'Original CBE statement (PDF)' });
      assert.equal(await source.getAttribute('href'), 'documents/155.pdf');
      assert((await page.request.head(new URL(await source.getAttribute('href'), page.url()).href)).ok());
      const resultsLink = benchmarks.getByRole('link', { name: 'Open this evaluation' });
      const resultsHash = await resultsLink.getAttribute('href');
      await resultsLink.click();
      await page.waitForSelector('#chart-model-banks svg');
      assert.match(page.url(), /sample=modern_live_only/);
      assert.match(page.url(), /action=hike/);
      assert.match(await page.locator('.result-scope').innerText(), /36 scored meetings/);
      await page.goto(url + resultsHash);
      await page.waitForSelector('#chart-model-banks svg');
      assert.match(await page.locator('.result-scope').innerText(), /36 scored meetings/);
    } finally { await page.close(); }
  });

  await logged('Compact rail persists, resizes charts, and keeps the mobile drawer accessible', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    try {
      await open(page, 'forecasts?scope=saved');
      const chart = page.locator('#chart-model-banks svg');
      const initialWidth = (await chart.boundingBox()).width;
      const toggle = page.locator('#rail-toggle');
      await toggle.focus();
      await page.keyboard.press('Space');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      await page.waitForFunction(width => document.querySelector('#chart-model-banks svg').getBoundingClientRect().width > width, initialWidth);
      assert(await page.getByRole('link', { name: 'Policy & statements', exact: true }).isVisible());
      await page.reload();
      await page.waitForSelector('body[data-compact-rail]');
      assert.equal(await toggle.getAttribute('aria-label'), 'Expand navigation');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#menu-toggle').click();
      const policy = page.locator('#sidebar nav [data-page="policy"]');
      assert.match(await policy.innerText(), /Policy & statements/);
      await policy.click();
      await page.locator('#period-button').click();
      const sheet = page.locator('#filter-dialog');
      const box = await sheet.boundingBox();
      assert(box.y + box.height >= 843 && box.width === 390);
      await page.keyboard.press('Escape');
      assert(await page.locator('#period-button').evaluate(button => button === document.activeElement));
    } finally { await page.close(); }
  });

  await logged('Narrow Walkthrough keeps the next heading in view and focuses it', async () => {
    const page = await browser.newPage({ viewport: { width: 320, height: 640 } });
    try {
      await open(page, 'walkthrough?step=return');
      await page.getByRole('button', { name: 'Next · Comparison' }).click();
      await page.waitForFunction(() => {
        const heading = document.querySelector('#walkthrough-step-title');
        const rect = heading.getBoundingClientRect();
        return heading === document.activeElement && rect.top >= 64 && rect.bottom <= innerHeight;
      });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
    } finally { await page.close(); }
  });

  await logged('Six Walkthrough steps, aliases, shared filters, and linked timeline keyboard zoom', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      await open(page, 'walkthrough?step=question&action=hike');
      const nav = page.getByRole('navigation', { name: 'Walkthrough steps' });
      for (const step of ['Question', 'Announcement', 'Return', 'Comparison', 'Results', 'Interpretation']) {
        await nav.getByRole('button', { name: step, exact: false }).click();
        assert.equal(await nav.locator('[aria-current="step"]').count(), 1);
        assert(page.url().includes('action=hike'));
        assert(await page.locator('#walkthrough-step-title').isVisible());
      }
      await page.goBack();
      await page.waitForFunction(() => location.hash.includes('step=results'));
      assert.match(await page.locator('.walkthrough-copy').innerText(), /32 of 32[\s\S]*3 of 16/);
      await page.goto(url + '#results?evaluation=modern_live_only&model=ridge');
      await page.waitForSelector('#chart-model-banks svg');
      await page.goto(url + '#documents?doc=' + meeting);
      await page.waitForSelector('#inspector-dialog[open]');
      await page.keyboard.press('Escape');
      await page.goto(url + '#overview?series=deposit');
      await page.waitForSelector('#chart-policy-history svg');
      await page.locator('#chart-policy-history').press('ArrowRight');
      assert.match(await page.locator('#chart-reading-policy-history').innerText(), /Deposit %/);
      await open(page, 'markets');
      await page.getByRole('button', { name: 'Policy and market timeline', exact: true }).click();
      await page.waitForSelector('#chart-linked-timeline svg');
      await page.getByRole('button', { name: 'Expand Policy and market timeline' }).click();
      await page.waitForSelector('#expanded-chart svg');
      await page.locator('#expanded-chart').press('ArrowRight');
      assert.match(await page.locator('#chart-reading-linked-timeline-expanded').innerText(), /Change bps/);
      const svg = await readDownload(page, () => page.locator('#chart-dialog [data-format="svg"]').click());
      assert(svg.bytes.toString('utf8').includes('<svg'));
      assert(svg.bytes.toString('utf8').includes('Policy and market timeline'));
      const png = await readDownload(page, () => page.locator('#chart-dialog [data-format="png"]').click());
      assert.deepEqual([...png.bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      await page.keyboard.press('Escape');
      const before = await page.evaluate(() => window.CBE_RESEARCH.snapshot().counts);
      await page.getByLabel('Select a meeting').selectOption(meeting);
      await page.locator('[data-action="focus-date"][data-chart="linked-timeline"]').click();
      assert.deepEqual(await page.evaluate(() => window.CBE_RESEARCH.snapshot().counts), before);
      assert.match(await page.locator('#zoom-linked-timeline').innerText(), /Focused on 6 Mar 2024.*analytical counts unchanged/);
    } finally { await page.close(); }
  });

  await logged('Saved-view JSON, table criteria, table selections, and exact source exports', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      await open(page, 'markets');
      const prices = page.locator('#table-prices');
      await prices.locator('[data-table-query]').fill('2024-03-07');
      await page.waitForFunction(() => document.querySelector('#table-prices .table-footer').textContent.includes('of 3 rows'));
      await prices.locator('[data-table-sort="value"]').click();
      assert(await prices.locator('[aria-sort]').count() === 1);
      await prices.locator('tbody [data-table-row]').first().check();
      const csv = await readDownload(page, () => prices.getByRole('button', { name: 'Export 1 selected' }).click());
      const lines = csv.bytes.toString('utf8').trim().split(/\r?\n/);
      assert.equal(lines.length, 2);
      assert(lines[1].includes('2024-03-07'));
      assert(lines[1].includes('2882.62') || lines[1].includes('3221.96') || lines[1].includes('31300.54'));
      await prices.getByRole('button', { name: 'Columns' }).click();
      await page.locator('#utility-dialog').waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Policy and market timeline', exact: true }).click();
      await applyMeetingFilters(page);
      await page.getByRole('button', { name: 'Price history', exact: true }).click();
      await page.click('#period-button');
      assert.equal(await page.locator('#filter-announcement-fields').isVisible(), false);
      await page.keyboard.press('Escape');
      await page.locator('#sidebar [data-action="saved-views"]').click();
      await page.getByRole('button', { name: 'Save current view' }).click();
      await page.fill('#saved-view-name', 'Modern hikes audit');
      await page.locator('[data-action="save-view-confirm"]').click();
      await page.locator('#sidebar [data-action="saved-views"]').click();
      assert(await page.getByText('Modern hikes audit', { exact: false }).first().isVisible());
      const json = await readDownload(page, () => page.getByRole('button', { name: 'Export settings', exact: true }).click());
      const settings = JSON.parse(json.bytes.toString('utf8'));
      assert.equal(settings.format, 'cbe-explorer-view');
      assert.equal(settings.version, 1);
      assert.equal(settings.state.action, 'hike');
      assert.equal(settings.state.cohort, 'in');
      await page.keyboard.press('Escape');
      await open(page, 'overview');
      await page.locator('#import-view-file').setInputFiles({ name: json.name, mimeType: 'application/json', buffer: json.bytes });
      await page.waitForSelector('#table-prices');
      assert.equal(await page.locator('#table-prices [data-table-query]').inputValue(), '2024-03-07');
      assert.equal((await page.evaluate(() => window.CBE_RESEARCH.snapshot())).state.action, 'hike');

      const legacy = { format: 'cbe-explorer-view', version: 1, state: { page: 'forecasts' }, local: { forecastSector: 'real_estate' } };
      await page.locator('#import-view-file').setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)) });
      await page.waitForFunction(() => document.querySelector('.result-scope')?.textContent.includes('56 of 119'));
      assert(page.url().includes('scope=filtered'));
    } finally { await page.close(); }
  });

  await logged('Full and filtered forecast scopes, chart reuse, scroll restoration and scoped results exports', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const faults = monitor(page, origin);
    try {
      await open(page, 'overview?from=2024&to=2024&action=hike&cohort=in');
      await page.getByRole('link', { name: 'See forecast results' }).click();
      assert.match(await page.locator('.result-scope').innerText(), /119 scored meetings per sector/);
      assert.equal(await page.locator('#period-button').isVisible(), false);
      assert.equal(await page.locator('#view .chart-surface').count(), 2);
      await page.evaluate(() => {
        window.auditChart = window.echarts.getInstanceByDom(document.getElementById('chart-model-banks'));
      });
      await page.selectOption('[data-metric]', 'RMSE_pp');
      assert(await page.evaluate(() => window.auditChart === window.echarts.getInstanceByDom(document.getElementById('chart-model-banks'))));
      await page.click('#open-exports');
      const exported = await readDownload(page, () => page.getByRole('button', { name: 'Saved forecast rows' }).click());
      assert.match(exported.name, /full_saved_evaluation/);
      assert.equal(exported.bytes.toString('utf8').trim().split(/\r?\n/).length, 2381);
      await page.keyboard.press('Escape');
      await showResultsTab(page, 'What text changed');
      assert.match(await page.locator('.paired-summary-table').first().innerText(), /95% CI/);
      assert(await page.evaluate(() => window.auditChart.isDisposed()));
      await page.getByRole('button', { name: 'Filtered meetings', exact: true }).click();
      assert.match(await page.locator('.result-scope').innerText(), /2 of 119/);
      assert.equal(await page.locator('#period-button').isVisible(), true);
      assert.match(await page.locator('.paired-summary-table').first().innerText(), /Point estimate/);
      await showResultsTab(page, 'Forecasts by meeting');
      await page.selectOption('#forecast-event', '2024-03-06');
      assert(await page.getByRole('heading', { name: /6 Mar 2024 · forecast/ }).isVisible());
      await page.selectOption('#forecast-sector', 'real_estate');
      assert.match(await page.locator('.event-value-strip').innerText(), /\+2.169%/);
      await page.getByRole('button', { name: 'Saved evaluation', exact: true }).click();
      await page.selectOption('[data-sample]', 'modern_live_only');
      assert.match(await page.locator('.result-scope').innerText(), /36 scored meetings per sector/);
      await page.goto(url + '#results?from=2024&to=2024&action=hike&cohort=in&sector=banks');
      await page.waitForFunction(() => document.querySelector('.result-scope')?.textContent.includes('2 of 119'));
      assert(page.url().includes('scope=filtered'));
      await page.evaluate(() => window.scrollTo({ top: 440, behavior: 'instant' }));
      await page.waitForFunction(() => window.scrollY > 300);
      await page.locator('#sidebar nav [data-page="overview"]').click();
      await page.goBack();
      await page.waitForFunction(() => document.body.dataset.workspace === 'forecasts' && window.scrollY > 300);
      assert.deepEqual(faults, { errors: [], requests: [], failed: [] });
    } finally { await page.close(); }
  });

  await logged('Mobile drawer traps and restores focus; reduced motion stays active', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 667 }, reducedMotion: 'reduce', hasTouch: true, isMobile: true });
    try {
      await open(page, 'overview');
      await page.click('#menu-toggle');
      assert.equal(await page.locator('#sidebar').getAttribute('aria-modal'), 'true');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'nav-close');
      const last = page.locator('#sidebar [data-action="files"]');
      await last.focus();
      await page.keyboard.press('Tab');
      assert(await page.evaluate(() => document.getElementById('sidebar').contains(document.activeElement)));
      assert.deepEqual(await page.evaluate(mobileTargets), []);
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'menu-toggle');
      assert.equal(await page.locator('#theme-toggle').count(), 0);
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      assert(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
      await open(page, 'policy');
      await page.locator('.document-list [data-doc]').nth(1).click();
      await page.waitForFunction(() => document.getElementById('inline-title') === document.activeElement && window.scrollY > 0);
    } finally { await page.close(); }
  });

  await logged('Page, tab and dialog motion follow the system setting', async () => {
    for (const mode of ['no-preference', 'reduce']) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: mode });
      await ctx.addInitScript(() => {
        const animate = Element.prototype.animate;
        window.viewAnimationCalls = [];
        Element.prototype.animate = function(...args) {
          if (this.id === 'view') window.viewAnimationCalls.push(args[1].duration);
          return animate.apply(this, args);
        };
      });
      try {
        const page = await ctx.newPage();
        await open(page, 'overview');
        const tileAnimation = await page.locator('#overview-finding [data-improved]').first().evaluate(el => getComputedStyle(el).animationName);
        assert.equal(tileAnimation === 'none', mode === 'reduce');
        await page.getByRole('link', { name: 'See forecast results' }).click();
        await showResultsTab(page, 'What text changed');
        assert(await page.locator('#chart-paired-banks svg').count() > 0);
        const calls = await page.evaluate(() => window.viewAnimationCalls);
        if (mode === 'reduce') assert.deepEqual(calls, []);
        else {
          assert.equal(calls.length, 3);
          assert(calls.every(duration => duration >= 150 && duration <= 300));
        }
        await page.getByRole('button', { name: 'Study files', exact: true }).click();
        await page.waitForSelector('#utility-dialog[open]');
        const opener = await page.locator('#utility-dialog').evaluate(el => getComputedStyle(el).animationName);
        assert.equal(opener === 'none', mode === 'reduce');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#utility-dialog').count(), 1);
        assert(await page.getByRole('button', { name: 'Study files', exact: true }).evaluate(el => el === document.activeElement));
      } finally { await ctx.close(); }
    }
  });

  await logged('Study files, PDFs, CSVs, and chart scripts resolve under the HTTP subpath', async () => {
    const web = join(site, 'Website');
    const paths = [
      '../Thesis_Ahmed_Yasser.pdf', '../Thesis.ipynb', '../Thesis_Data.xlsx', '../Thesis_Presentation.pdf', '../Code_and_Processed_Data.zip',
      ...['index.html', 'explorer.css', 'explorer.js', 'data.js', 'market-data.js', 'descriptive-data.js', 'core.js', 'charts.js', 'ui.js', 'readers.js', 'favicon.svg', 'vendor/echarts.min.js'],
      ...(await readdir(join(web, 'documents'))).filter(name => name.endsWith('.pdf')).map(name => 'documents/' + name),
      ...(await readdir(join(web, 'data'), { recursive: true, withFileTypes: true })).filter(file => file.isFile()).map(file => file.parentPath.slice(web.length + 1) + '/' + file.name),
    ];
    const statuses = [];
    for (let i = 0; i < paths.length; i += 10) {
      const batch = await Promise.all(paths.slice(i, i + 10).map(async file => {
        const response = await fetch(new URL(file, url), { method: 'HEAD' });
        return { file, status: response.status };
      }));
      statuses.push(...batch);
    }
    evidence.localLinks = statuses.length;
    assert.deepEqual(statuses.filter(item => item.status !== 200), []);
  });

  await logged('Relocated file launch with the network off, all routes, and direct browser links', async () => {
    const temp = await mkdtemp(join(tmpdir(), 'CBE Explorer audit '));
    const copied = join(temp, 'Portable Explorer copy');
    await cp(site, copied, { recursive: true });
    try {
      const file = pathToFileURL(join(copied, 'Website', 'index.html')).href;
      for (const theme of ['light', 'dark']) {
        const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme, offline: true });
        const page = await ctx.newPage();
        const faults = monitor(page, undefined);
        try {
          for (const route of [...studyViews, ...extraViews]) {
            await open(page, route, file);
            assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
            if (chartless.includes(route)) assert.equal(await page.locator('.chart-surface svg').count(), 0);
            else assert(await page.locator('.chart-surface svg').count() > 0);
          }
          await page.goto(pathToFileURL(join(copied, 'index.html')).href + '#walkthrough?step=announcement');
          await page.waitForSelector('#walkthrough-step-title');
          assert(page.url().includes('step=announcement'));
          const original = await page.locator('.walkthrough-copy a[href$=".pdf"]').getAttribute('href');
          assert(await stat(fileURLToPath(new URL(original, file))).then(entry => entry.size > 0));
          assert.deepEqual(faults, { errors: [], requests: [], failed: [] });
        } finally { await ctx.close(); }
      }
    } finally { await rm(temp, { recursive: true, force: true }); }
  });
  if (process.env.CBE_BASELINE_SITE) {
    await logged('Before and after render timings with the same Chrome build', async () => {
      const baseline = pathToFileURL(join(resolve(process.env.CBE_BASELINE_SITE), 'Website', 'index.html')).href;
      const refined = pathToFileURL(join(site, 'Website', 'index.html')).href;
      const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
      const compare = [
        ['Overview 1440', 1440, 900, '#overview', '#overview'],
        ['Overview 390', 390, 844, '#overview', '#overview'],
        ['Full-history benchmarks', 1440, 900, '#forecasts?scope=saved', '#forecasts?scope=saved'],
      ];
      evidence.performance = [];
      for (const [label, width, height, oldRoute, newRoute] of compare) {
        const editions = { before: [], after: [] };
        for (let pass = 0; pass < 7; pass++) {
          for (const [edition, address] of [['before', baseline + oldRoute], ['after', refined + newRoute]]) {
            const page = await browser.newPage({ viewport: { width, height } });
            try {
              await page.goto(address);
              await page.waitForFunction(() => window.CBE_RESEARCH?.snapshot().performance.length);
              const reading = await page.evaluate(() => window.CBE_RESEARCH.snapshot().performance[0]);
              editions[edition].push(reading);
              if (label === 'Overview 1440' && pass === 0 && edition === 'before')
                await page.screenshot({ animations: 'disabled', path: join(shots, 'overview-before-desktop.png') });
            } finally { await page.close(); }
          }
        }
        const summarize = readings => ({ medianMs: median(readings.map(row => row.milliseconds)), charts: readings[0].charts });
        const report = { label, before: summarize(editions.before), after: summarize(editions.after), readings: editions };
        assert.equal(report.after.charts, label.startsWith('Overview') ? 0 : 2);
        evidence.performance.push(report);
      }
    });
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  evidence.status = evidence.failures.length ? 'fail' : 'pass';
  await writeFile(join(qa, 'browser.json'), JSON.stringify(evidence, null, 2) + '\n');
}
if (evidence.failures.length) process.exitCode = 1;
