import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './icons';

export function ChartActions({ id, title, canPlot = true }: { id: string; title: string; canPlot?: boolean }) {
  return (
    <div className="panel-actions">
      {canPlot && (
        <>
          <button type="button" className="icon-button" data-action="expand-chart" data-chart={id} aria-label={'Expand ' + title} title={'Expand ' + title}><Icon name="expand" /></button>
          <button type="button" className="icon-button" data-action="chart-export" data-chart={id} aria-label={'Export ' + title} title={'Export ' + title}><Icon name="download" /></button>
        </>
      )}
      <button type="button" className="icon-button" data-action="source" data-source={id} aria-label={title + ' source and definition'} title="Source and exact values"><Icon name="info" /></button>
    </div>
  );
}

export function ChartSurface({ id, title, className = '' }: { id: string; title: string; className?: string }) {
  return (
    <>
      <div className={'chart-surface ' + className} id={'chart-' + id} tabIndex={0} role="img" aria-label={title} />
      <div className="chart-reading" id={'chart-reading-' + id} aria-live="polite" />
    </>
  );
}

export function ChartPanel({
  id, title, description, controls, chart, data, reveal, className = '', empty, children, chartClass = 'chart',
}: {
  id: string;
  title: string;
  description?: string;
  controls?: ReactNode;
  chart?: ReactNode;
  data?: () => ReactNode;
  reveal?: () => void;
  className?: string;
  empty?: string;
  children?: ReactNode;
  chartClass?: string;
}) {
  const [showData, setShowData] = useState(false);
  const canSwitch = !empty && Boolean(data);
  const dataVisible = canSwitch && showData;

  function showPlot() {
    if (!showData) return;
    setShowData(false);
    if (reveal) requestAnimationFrame(reveal);
  }

  return (
    <article className={'panel chart-panel ' + className} aria-labelledby={id + '-title'}>
      <div className="panel-head">
        <div className="chart-panel-heading">
          <span className="chart-panel-glyph"><Icon name="forecasts" /></span>
          <div><h2 id={id + '-title'}>{title}</h2>{description && <p>{description}</p>}</div>
        </div>
        <div className="chart-panel-tools">
          {canSwitch && (
            <div className="chart-mode segmented" role="group" aria-label={title + ' display'}>
              <button type="button" aria-pressed={!dataVisible} onClick={showPlot}>Chart</button>
              <button type="button" aria-pressed={dataVisible} onClick={() => setShowData(true)}>Data</button>
            </div>
          )}
          {!dataVisible && <ChartActions id={id} title={title} canPlot={!empty} />}
        </div>
      </div>
      <div hidden={dataVisible}>
        {controls}
        {empty ? <div className="empty-state"><h3>{empty}</h3><p>Change the research period or relevant filters.</p></div> :
          chart ?? <ChartSurface id={id} title={title} className={chartClass} />}
        {children}
      </div>
      {dataVisible && data?.()}
    </article>
  );
}
