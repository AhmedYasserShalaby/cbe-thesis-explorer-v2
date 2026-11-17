import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Icon } from './icons';
import type { Page, ResearchSnapshot } from './research/snapshot';
import styles from './SearchPalette.module.css';

type Target =
  | { kind: 'section'; page: Page; view?: 'text' | 'linked' }
  | { kind: 'statement'; docId: string; match?: string }
  | { kind: 'file'; href: string };

interface Result {
  title: string;
  detail: string;
  glyph: string;
  target: Target;
  keywords?: string;
}

export interface SearchPaletteProps {
  model: ResearchSnapshot;
  choose: (target: Target) => void;
}

const longDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
const normalize = (text: string) => text.toLowerCase().trim().replace(/\s+/g, ' ');

const sections: Result[] = [
  { title: 'Forecast results', detail: 'Model scores and benchmark comparisons', glyph: 'forecasts', target: { kind: 'section', page: 'forecasts' } },
  { title: 'Walkthrough', detail: 'Six steps from statement to forecast', glyph: 'guide', target: { kind: 'section', page: 'walkthrough' } },
  { title: 'Policy & statements', detail: 'Central Bank of Egypt releases and rate decisions', glyph: 'policy', target: { kind: 'section', page: 'policy' } },
  { title: 'Markets', detail: 'Index prices and first-session returns', glyph: 'markets', target: { kind: 'section', page: 'markets' } },
  { title: 'Data & methods', detail: 'Study coverage, definitions and files', glyph: 'data', target: { kind: 'section', page: 'data' } },
  { title: 'Overview', detail: 'Research question and main findings', glyph: 'overview', target: { kind: 'section', page: 'overview' } },
  { title: 'What text changed', detail: 'Paired forecast errors and saved intervals', glyph: 'compare', target: { kind: 'section', page: 'forecasts', view: 'text' }, keywords: 'paired MAE RMSE' },
  { title: 'Policy and market timeline', detail: 'Deposit rates alongside market history', glyph: 'markets', target: { kind: 'section', page: 'markets', view: 'linked' } },
];

const fileKeywords: Record<string, string> = {
  'Full report': 'thesis dissertation paper pdf',
  'Analysis notebook': 'jupyter ipynb results',
  'Dataset workbook': 'excel xlsx spreadsheet',
  'Presentation': 'slides deck pdf defence',
  'Code & processed data': 'zip archive source',
};

const kinds: Record<Target['kind'], string> = { section: 'View', statement: 'Statement', file: 'File' };

function excerpt(text: string, offset: number, length: number) {
  const start = Math.max(0, offset - 27);
  const end = Math.min(text.length, offset + length + 54);
  return (start ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

export function SearchPalette({ model, choose }: SearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState(0);
  const term = normalize(query);
  const archive = useMemo(() => model.docs.map(doc => {
    const title = longDate.format(new Date(doc.date + 'T12:00:00Z'));
    const body = doc.text.trim().replace(/\s+/g, ' ');
    const detail = doc.type + ' · ' + doc.language;
    return {
      doc, title, body, detail,
      dates: normalize([title, doc.date, window.CBEUI.date(doc.date)].join(' ')),
      labels: normalize([title, doc.date, window.CBEUI.date(doc.date), detail, model.action(doc)].join(' ')),
      wording: body.toLowerCase(),
    };
  }).reverse(), [model]);
  const results = useMemo<Result[]>(() => {
    if (!term) return sections.slice(0, 6);
    const tokens = term.split(' ');
    const filter = (item: Result) => tokens.every(word => normalize([item.title, item.detail, item.keywords || ''].join(' ')).includes(word));
    const statementResults = archive.flatMap(({ doc, title, body, detail, dates, labels, wording }) => {
      const offset = wording.indexOf(term);
      const rank = dates.includes(term) ? 3 : labels.includes(term) ? 2 : offset >= 0 ? 1 : 0;
      if (!rank) return [];
      const match = offset >= 0 ? query.trim().replace(/\s+/g, ' ') : undefined;
      const target: Target = { kind: 'statement', docId: doc.id, match };
      return [{ rank, result: { title, detail: rank === 1 ? excerpt(body, offset, term.length) : detail, glyph: 'policy', target } }];
    }).sort((a, b) => b.rank - a.rank).slice(0, 6).map(entry => entry.result);
    const files: Result[] = model.X.manifest.files.map(file => ({
      title: file.label,
      detail: file.description || 'Bundled study file',
      glyph: 'file',
      target: { kind: 'file', href: file.href },
      keywords: [fileKeywords[file.label], file.href.split('/').at(-1)].filter(Boolean).join(' '),
    }));
    const views = sections.filter(filter).slice(0, 4);
    return [...views, ...statementResults, ...files.filter(filter).slice(0, 4)];
  }, [term, query, archive, model]);

  const active = Math.min(position, results.length - 1);
  useEffect(() => {
    if (active >= 0) document.getElementById('search-result-' + active)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active, term]);

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (!results.length || event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setPosition((active + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[active].target);
    }
  }

  return (
    <>
      <div className={'dialog-header ' + styles.heading}>
        <h2 id="search-title">Search Explorer</h2>
        <button type="button" className="icon-button" data-close="search-dialog" aria-label="Close search"><Icon name="close" /></button>
      </div>
      <div className={styles.content}>
        <label className={styles.input}>
          <Icon name="search" />
          <span className="sr-only">Search views, statements and files</span>
          <input id="explorer-search" autoComplete="off" type="search" role="combobox"
            aria-controls="search-results" aria-autocomplete="list" aria-expanded={results.length > 0}
            aria-activedescendant={active >= 0 ? 'search-result-' + active : undefined}
            value={query} placeholder="Try 6 March 2024, inflation, or presentation"
            onChange={event => { setQuery(event.target.value); setPosition(0); }} onKeyDown={handleKey} />
        </label>
        <p className={styles.scope}>Search covers the full local statement archive and study files.</p>
        <ul id="search-results" className={styles.results} role="listbox" aria-label="Search suggestions" hidden={!results.length}>
          {results.map((result, index) => (
            <li id={'search-result-' + index} key={result.target.kind + result.title + index} role="option"
              aria-selected={active === index} className={styles.result}
              onMouseDown={event => event.preventDefault()} onClick={() => choose(result.target)}>
              <span className={styles.glyph}><Icon name={result.glyph} /></span>
              <span className={styles.words}><strong>{result.title}</strong><small>{result.detail}</small></span>
              <span className={styles.kind}>{kinds[result.target.kind]}</span>
            </li>
          ))}
        </ul>
        {!results.length && <p className={styles.empty} role="status">No matches. Try a meeting date, an exact phrase, or a file name.</p>}
        <div className={styles.keys}><span><kbd>↑</kbd> <kbd>↓</kbd> Choose</span><span><kbd>Enter</kbd> Open</span><span><kbd>Esc</kbd> Close</span></div>
      </div>
    </>
  );
}
