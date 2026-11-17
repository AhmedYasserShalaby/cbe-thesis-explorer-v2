import type { ReactNode } from 'react';
import { Icon } from './icons';

export function ResearchContent({ markup }: { markup: string }) {
  // Source-backed statement and table fragments use the workstation's existing escaping.
  return <div className="research-content" dangerouslySetInnerHTML={{ __html: markup }} />;
}

export function Workspace({ page, children }: { page: string; children: ReactNode }) {
  return <section className="workspace" aria-labelledby={page === 'overview' ? 'overview-title' : 'page-title'} data-workspace={page}>{children}</section>;
}

export function DataPanel({ title, description, source, className = '', children }: {
  title: string; description?: string; source?: string; className?: string; children: ReactNode;
}) {
  return (
    <article className={'panel ' + className}>
      <div className="panel-head">
        <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
        {source && (
          <button type="button" className="icon-button" data-action="source" data-source={source} aria-label={title + ' source and definition'} title="Source and definition">
            <Icon name="info" />
          </button>
        )}
      </div>
      {children}
    </article>
  );
}

export function ViewTabs({ action, label, selected, options }: {
  action: string; label: string; selected: string; options: ReadonlyArray<readonly [string, string, string]>;
}) {
  return (
    <div className="tabs-row" role="group" aria-label={label}>
      {options.map(([id, title, glyph]) => (
        <button type="button" key={id} data-action={action} data-tab={id} aria-pressed={id === selected}>
          <Icon name={glyph} />{title}
        </button>
      ))}
    </div>
  );
}
