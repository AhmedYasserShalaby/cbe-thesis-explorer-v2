import type { ReactNode } from 'react';
import { Icon, IconDefinitions } from './icons';
import s from './Shell.module.css';

const pages = [
  ['overview', 'Overview', 'overview'],
  ['walkthrough', 'Walkthrough', 'guide'],
  ['policy', 'Policy & statements', 'policy'],
  ['markets', 'Markets', 'markets'],
  ['forecasts', 'Forecast results', 'forecasts'],
  ['data', 'Data & methods', 'data'],
] as const;

export const actions = [
  ['', 'All actions'], ['hike', 'Rate increases'], ['hold', 'Rate holds'],
  ['cut', 'Rate cuts'], ['other', 'Notices / unresolved'],
] as const;
export const cohorts = [['', 'All documents'], ['in', 'Analysis cohort'], ['out', 'Outside analysis']] as const;

function Options({ values }: { values: ReadonlyArray<readonly [string, string]> }) {
  return values.map(([value, label]) => <option key={value} value={value}>{label}</option>);
}

function Sidebar() {
  return (
    <aside id="sidebar" className={s.sidebar}>
      <div className={s.brandRow}>
        <a href="#overview" data-page="overview" className={s.brand} aria-label="CBE Thesis Explorer" title="CBE Thesis Explorer">
          CBE Thesis Explorer
        </a>
        <button type="button" id="nav-close" className={'icon-button ' + s.drawerClose} aria-label="Close navigation"><Icon name="close" /></button>
      </div>
      <nav className={s.navigation} aria-label="Research workspaces">
        {pages.map(([id, label, glyph], index) => (
          <a key={id} href={'#' + id} data-page={id} data-glyph={glyph} data-nav-index={index}>
            <Icon name={glyph} />{label}
          </a>
        ))}
      </nav>
    </aside>
  );
}

function Header() {
  const searchShortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
  return (
    <header className={s.header}>
      <button type="button" id="menu-toggle" className={'quiet-button ' + s.menu} aria-label="Open navigation menu" aria-controls="sidebar" aria-expanded="false"><Icon name="menu" /></button>
      <span id="header-workspace" className={s.workspaceName}>Overview</span>
      <div className={s.searchControl}>
        <button type="button" id="search-statements" className={'quiet-button ' + s.search} data-action="search-statements" aria-label="Search Explorer" aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K">
          <Icon name="search" />
          <span className={s.searchLabel}>Search Explorer</span>
        </button>
        <kbd aria-hidden="true">{searchShortcut}</kbd>
      </div>
      <div className={s.headerActions}>
        <button type="button" className={'quiet-button ' + s.viewLink} id="view-link" data-action="view-link" aria-label="View link" aria-haspopup="dialog">
          <Icon name="link" /><span className={s.actionLabel}>View link</span>
        </button>
        <button type="button" className={'quiet-button ' + s.files} data-action="files" aria-label="Study files" aria-haspopup="dialog"><Icon name="file" /><span className={s.actionLabel}>Study files</span></button>
      </div>
      <div className={s.readingProgress} aria-hidden="true" />
    </header>
  );
}

function PageTools() {
  return (
    <div className={s.pageTools} id="page-tools">
      <div className={s.pageHeading}>
        <span className={s.pageIcon}><svg className="icon" aria-hidden="true"><use id="page-icon" href="#i-overview" /></svg></span>
        <div><h1 id="page-title">Overview</h1><p id="page-description" /></div>
      </div>
      <section id="research-tools" className={s.toolbar} aria-label="Research controls" hidden>
        <div id="selection-tools" className={s.selection}>
          <button type="button" className="quiet-button" id="period-button" data-action="filters">
            <Icon name="filter" />Filters
          </button>
          <div id="active-filters" className={s.activeFilters} role="group" aria-label="Active filters" hidden />
          <p id="scope-caption" className={s.caption} role="status" />
          <button type="button" className="text-button" id="reset-filters" data-action="reset-filters" hidden>Reset filters</button>
        </div>
        <button type="button" id="open-exports" className="quiet-button" data-action="export"><Icon name="download" />Export</button>
      </section>
    </div>
  );
}

function DialogFrame({ id, labelledBy, className, children }: {
  id: string; labelledBy: string; className: string; children?: ReactNode;
}) {
  return <dialog id={id} className={className} aria-labelledby={labelledBy}>{children}</dialog>;
}

function Filters() {
  const years = Array.from({ length: 29 }, (_, i) => 1998 + i);
  const yearOptions = years.map(year => <option value={year} key={year}>{year}</option>);
  return (
    <DialogFrame id="filter-dialog" className="small-dialog" labelledBy="filter-title">
      <div className="dialog-header">
        <h2 id="filter-title">Research period &amp; filters</h2>
        <button type="button" className="icon-button" data-close="filter-dialog" aria-label="Close filters"><Icon name="close" /></button>
      </div>
      <form id="filter-form">
        <div className="dialog-content">
          <div className="preset-row">
            <button type="button" data-preset="all">Full record</button>
            <button type="button" data-preset="study">Notebook period</button>
            <button type="button" data-preset="legacy">2007–2019</button>
            <button type="button" data-preset="modern">2020–2026</button>
          </div>
          <div className="field-grid">
            <label>From year<select id="filter-from-year">{yearOptions}</select></label>
            <label>To year<select id="filter-to-year">{yearOptions}</select></label>
          </div>
          <details className="date-details">
            <summary>Choose exact dates</summary>
            <div className="field-grid">
              <label>From date<input id="filter-from" type="date" min="1998-01-01" max="2026-12-31" required /></label>
              <label>To date<input id="filter-to" type="date" min="1998-01-01" max="2026-12-31" required /></label>
            </div>
          </details>
          <div className="field-grid" id="filter-announcement-fields">
            <label>Policy action<select id="filter-action"><Options values={actions} /></select></label>
            <label>Announcement set<select id="filter-cohort"><Options values={cohorts} /></select></label>
          </div>
          <p className="field-help" id="filter-help" />
          <p className="field-error" id="filter-error" role="alert" hidden>From date must be on or before to date.</p>
        </div>
        <div className="dialog-footer">
          <button type="button" className="quiet-button" id="filter-clear">Reset fields</button>
          <button type="submit" className="button">Apply filters</button>
        </div>
      </form>
    </DialogFrame>
  );
}

export function Shell() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to research content</a>
      <IconDefinitions />
      <div className={s.scrim} id="nav-scrim" aria-hidden="true" />
      <div className={s.canvas}>
        <Sidebar />
        <div className={'workbench ' + s.workbench}>
          <Header />
          <main id="main" className={s.main} tabIndex={-1}>
            <div id="fatal-error" className="error-state" role="alert" hidden />
            <PageTools />
            <div id="print-metadata" className="print-heading" />
            <div id="view" className="view" />
            <footer className={'app-footer ' + s.footer}>
              <span>CBE original releases · Refinitiv closes · Saved first-session forecasts</span>
              <button type="button" data-action="source" data-source="study">Sources &amp; interpretation</button>
            </footer>
          </main>
        </div>
      </div>
      <Filters />
      <DialogFrame id="search-dialog" className="search-dialog" labelledBy="search-title">
        <div id="search-content" />
      </DialogFrame>
      <DialogFrame id="inspector-dialog" className="inspector-dialog" labelledBy="inspector-title" />
      <DialogFrame id="compare-dialog" className="wide-dialog" labelledBy="compare-title" />
      <DialogFrame id="source-dialog" className="source-dialog" labelledBy="source-title" />
      <DialogFrame id="chart-dialog" className="wide-dialog chart-dialog" labelledBy="expanded-title" />
      <DialogFrame id="utility-dialog" className="small-dialog" labelledBy="utility-title" />
      <div id="toast" className="toast" role="status" aria-live="polite" hidden />
      <input id="import-view-file" type="file" accept="application/json,.json" hidden />
    </>
  );
}
