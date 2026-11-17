import { useLayoutEffect, useReducer } from 'react';
import { flushSync } from 'react-dom';
import { Icon } from '../icons';

function TableControls({ id, config, state, selectedCount }) {
  return (
    <div className="table-controls">
      <label className="search-field">
        <Icon name="search" />
        <span className="sr-only">Search {config.title}</span>
        <input type="search" data-table-query={id} defaultValue={state.q} key={state.q}
          placeholder={config.placeholder || 'Search records…'} />
      </label>
      {config.presets && (
        <label><span className="sr-only">Visible column preset</span>
          <select data-table-preset={id} defaultValue={state.preset} key={state.preset}>
            {Object.keys(config.presets).map(preset => <option key={preset}>{preset}</option>)}
          </select>
        </label>
      )}
      {config.priceFilters && <PriceFilters id={id} state={state} />}
      <button type="button" className="quiet-button" data-action="table-columns" data-table={id}>Columns</button>
      <button type="button" className="quiet-button" data-action="table-export" data-table={id}>
        <Icon name="download" /><span>Export {selectedCount ? selectedCount + ' selected' : 'rows'}</span>
      </button>
    </div>
  );
}

function PriceFilters({ id, state }) {
  return (
    <>
      <label><span className="sr-only">Price instrument</span>
        <select data-table-field="instrument" data-table={id} defaultValue={state.instrument} key={state.instrument}>
          <option value="">All instruments</option>
          {Object.entries(window.CBECore.SECTORS).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
        </select>
      </label>
      <label><span className="sr-only">Price eligibility</span>
        <select data-table-field="status" data-table={id} defaultValue={state.status} key={state.status}>
          <option value="eligible">Eligible closes</option>
          <option value="all">All source records</option>
          <option value="excluded">Excluded / missing</option>
        </select>
      </label>
    </>
  );
}

function PriceRange({ id, state }) {
  return (
    <details className="table-filter-details">
      <summary>Filter daily return values</summary>
      <div className="table-extra-filters">
        <label>Minimum return (%)<input type="number" step="any" data-table-field="min" data-table={id} defaultValue={state.min} key={state.min} /></label>
        <label>Maximum return (%)<input type="number" step="any" data-table-field="max" data-table={id} defaultValue={state.max} key={state.max} /></label>
      </div>
    </details>
  );
}

function Rows({ id, config, columns, rows, state, rowCount, selectedCount }) {
  if (!rows.length) {
    return <div className="empty-state"><h3>No matching records</h3><p>Change the search, table filters or research period.</p></div>;
  }
  const canSelect = config.selectable !== false;
  const allSelected = selectedCount === rowCount;
  return (
    <div className={config.bounded ? 'table-wrap bounded' : 'table-wrap'}
      role={config.scrollLabel ? 'region' : undefined} aria-label={config.scrollLabel}
      tabIndex={config.scrollLabel ? 0 : undefined}>
      <table className={config.tableClass || undefined}>
        <caption className="sr-only">{config.definition || config.title}</caption>
        <thead>
          <tr>
            {canSelect && <th scope="col" className="row-select">
              <label><input key={String(allSelected)} type="checkbox" data-table-all={id} defaultChecked={allSelected} aria-label={'Select all ' + rowCount + ' matching rows'} /></label>
            </th>}
            {columns.map(col => {
              const sorted = col.key === state.sort;
              return (
                <th key={col.key} scope="col" className={col.text ? 'text-cell' : undefined}
                  aria-sort={sorted ? state.dir === 1 ? 'ascending' : 'descending' : undefined}>
                  <button type="button" data-table-sort={col.key} data-table={id}>
                    {col.label}{sorted && <span aria-hidden="true"> {state.dir === 1 ? '↑' : '↓'}</span>}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const rowId = String(config.rowKey(row));
            const isSelected = state.selected.has(rowId);
            return (
              <tr key={rowId} tabIndex={0} data-row-id={rowId} className={[isSelected && 'selected', config.rowClass?.(row)].filter(Boolean).join(' ')}>
                {canSelect && <td className="row-select">
                  <label><input key={String(isSelected)} type="checkbox" data-table-row={rowId} data-table={id}
                    defaultChecked={isSelected} aria-label={'Select ' + (config.rowLabel?.(row) || rowId)} /></label>
                </td>}
                {columns.map(col => col.render ? (
                  <td key={col.key} className={col.text ? 'text-cell' : undefined} dangerouslySetInnerHTML={{ __html: col.render(row) }} />
                ) : (
                  <td key={col.key} className={col.text ? 'text-cell' : undefined}>{String(row[col.key] ?? '—')}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ id, title, page, pageSize, rowCount, selectedCount }) {
  const { fmt } = window.CBEUI;
  const nPages = Math.ceil(rowCount / pageSize);
  const first = fmt(rowCount ? page * pageSize + 1 : 0, 0);
  const last = fmt(Math.min(rowCount, (page + 1) * pageSize), 0);
  return (
    <div className="table-footer">
      <span role="status">{first}–{last} of {fmt(rowCount, 0)} rows{selectedCount ? ' · ' + selectedCount + ' selected' : ''}</span>
      <div className="pagination">
        <button type="button" className="quiet-button" data-table-page="-1" data-table={id} aria-label={'Previous ' + title + ' page'} disabled={page === 0}>←</button>
        <span>{rowCount ? page + 1 : 0} / {nPages}</span>
        <button type="button" className="quiet-button" data-table-page="1" data-table={id} aria-label={'Next ' + title + ' page'} disabled={page + 1 >= nPages}>→</button>
      </div>
    </div>
  );
}

export function createTables(ctx) {
  const core = window.CBECore;
  const configs = new Map();
  const states = new Map();
  const refreshers = new Map();

  function state(id) {
    if (!states.has(id)) {
      states.set(id, {
        q: '', sort: null, dir: 1, page: 0, preset: null, columns: null,
        selected: new Set(), instrument: '', status: 'eligible', min: '', max: '',
      });
    }
    return states.get(id);
  }

  function filtered(id) {
    const config = configs.get(id);
    const view = state(id);
    const query = String(view.q ?? '').trim().toLowerCase();
    let rows = config.rows.filter(row => !config.filter || config.filter(row, view));
    if (query) rows = rows.filter(row => (config.search?.(row) ?? Object.values(row).join(' ')).toLowerCase().includes(query));
    const column = config.columns.find(col => col.key === view.sort);
    if (!column) return rows;
    return rows.sort((a, b) => {
      const av = column.value ? column.value(a) : a[column.key];
      const bv = column.value ? column.value(b) : b[column.key];
      if (av == null || av === '') return bv == null || bv === '' ? 0 : 1;
      if (bv == null || bv === '') return -1;
      const comparison = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return view.dir * comparison;
    });
  }

  function selected(id) {
    const config = configs.get(id);
    return filtered(id).filter(row => state(id).selected.has(String(config.rowKey(row))));
  }

  function metadata(id, rows = filtered(id)) {
    const config = configs.get(id);
    const view = state(id);
    const statusNames = { eligible: 'eligible closes', excluded: 'excluded / missing', all: 'all source records' };
    const localScope = [
      view.q && 'search: ' + view.q,
      config.priceFilters && core.SECTORS[view.instrument],
      config.priceFilters && 'status: ' + statusNames[view.status],
      core.numeric(view.min) && 'return ≥ ' + view.min + '%',
      core.numeric(view.max) && 'return ≤ ' + view.max + '%',
    ].filter(Boolean).join(' · ');
    return {
      title: config.title, rows, source: config.source, files: config.source,
      definition: config.definition, scope: (config.scope || ctx.scope()) + (localScope ? ' · ' + localScope : ''),
      limits: config.limits || [],
    };
  }

  function DataTable({ id }) {
    const [, refresh] = useReducer(version => version + 1, 0);
    useLayoutEffect(() => {
      refreshers.set(id, refresh);
      return () => { refreshers.delete(id); };
    }, [id, refresh]);
    const config = configs.get(id);
    const view = state(id);
    if (view.sort == null && config.defaultSort) {
      view.sort = config.defaultSort;
      view.dir = config.defaultDir || 1;
    }
    if (config.presets && !Object.hasOwn(config.presets, view.preset)) view.preset = Object.keys(config.presets)[0];
    const chosen = view.columns || config.presets?.[view.preset];
    const visible = config.columns.filter(col => !chosen || chosen.includes(col.key));
    const columns = visible.length ? visible : config.columns;
    const rows = filtered(id);
    const pageSize = config.pageSize || 15;
    view.page = Math.max(0, Math.min(view.page, Math.ceil(rows.length / pageSize) - 1));
    const page = rows.slice(view.page * pageSize, (view.page + 1) * pageSize);
    const selectedCount = rows.filter(row => view.selected.has(String(config.rowKey(row)))).length;
    ctx.sources.set('table-' + id, { ...metadata(id, rows), downloadRows: config.export?.(rows) ?? rows });
    return (
      <div id={'table-' + id} data-table-root={id}>
        {config.controls !== false && <TableControls id={id} config={config} state={view} selectedCount={selectedCount} />}
        {config.priceFilters && <PriceRange id={id} state={view} />}
        <Rows id={id} config={config} columns={columns} rows={page} state={view} rowCount={rows.length} selectedCount={selectedCount} />
        <Pagination id={id} title={config.title} page={view.page} pageSize={pageSize} rowCount={rows.length} selectedCount={selectedCount} />
        {config.caption && <p className="table-caption">{config.caption}</p>}
      </div>
    );
  }

  function render(id, config) {
    configs.set(id, config);
    return <DataTable id={id} key={id} />;
  }

  function update(id, preserveFocus = false) {
    const root = document.getElementById('table-' + id);
    const refresh = refreshers.get(id);
    if (!root || !refresh) return;
    const active = document.activeElement;
    const query = active?.dataset.tableQuery === id ? active : null;
    const range = query ? [query.selectionStart, query.selectionEnd] : null;
    const attrs = ['data-table-sort', 'data-table-page', 'data-table-row', 'data-table-all', 'data-table-preset', 'data-row-id'];
    if (preserveFocus) attrs.unshift('data-table-query', 'data-table-field');
    const attr = root.contains(active) ? attrs.find(name => active.hasAttribute(name)) : null;
    const value = attr ? active.getAttribute(attr) : null;
    flushSync(refresh);
    if (attr) {
      const target = root.querySelector('[' + attr + '="' + CSS.escape(value) + '"]');
      target?.focus({ preventScroll: true });
      if (range && target?.setSelectionRange) target.setSelectionRange(...range);
    }
  }

  return { configs, states, state, filtered, selected, metadata, render, update };
}
