export type Page = 'overview' | 'walkthrough' | 'policy' | 'markets' | 'forecasts' | 'data';
export type Instrument = 'banks' | 'real_estate' | 'egx30';
export type Sector = Exclude<Instrument, 'egx30'>;
export type Evaluation = 'expanded_legacy_live' | 'modern_live_only';
export type Action = 'hike' | 'hold' | 'cut' | 'other';
export type Cell = string | number | boolean | null | undefined;
export type SourceRow = Record<string, Cell>;

export interface Selection {
  page: Page;
  from: string;
  to: string;
  action: Action | '';
  cohort: '' | 'in' | 'out';
  sample: Evaluation;
  instruments: Instrument[];
  market: 'indexed' | 'level' | 'return';
  metric: string;
  family: string;
  inspectTab: string;
  step: string;
}

export interface Statement {
  id: string;
  date: string;
  language: string;
  type: string;
  text: string;
  inAnalysis: boolean;
  sectorDefinition: string;
  original: string;
  source: string;
  firstSession: string | null;
}

interface Score extends SourceRow {
  case: Evaluation;
  sector: Sector;
  family: string;
  variant: 'reference' | 'numerical' | 'text_added';
  test_events: string | number;
  MAE_pp: string | number;
  RMSE_pp: string | number;
}

interface PairedScore extends SourceRow {
  case: Evaluation;
  sector: Sector;
  family: string;
  MAE_difference_pp: string | number;
  MAE_difference_pp_low: string | number;
  MAE_difference_pp_high: string | number;
}

interface Rate extends SourceRow {
  after: number | null;
  bps: number | null;
  conditional: boolean;
}

interface MarketSeries {
  instrument: Instrument;
  rows: Array<{ date: string; value: number | null; raw: SourceRow | null }>;
}

export interface FileLink {
  href: string;
  label: string;
  description?: string;
}

export interface ResearchSnapshot {
  docs: Statement[];
  D: { pairs: PairedScore[]; predictions: SourceRow[] };
  X: { fullMetrics: Score[]; manifest: { files: FileLink[] }; tables: Record<string, SourceRow[]> };
  byId: Map<string, Statement>;
  rates: Map<string, Rate>;
  events: Map<string, SourceRow>;
  action: (doc: Statement) => Action;
  selection: (state: Selection) => { docs: Statement[]; cohort: Statement[] };
  marketSeries: (state: Selection) => MarketSeries[];
  fullScores: (sample: Evaluation, sector: Sector) => Score[];
}

export interface StudyContext {
  model: ResearchSnapshot;
  state: () => Selection;
}

interface ResearchCore {
  create: (documents: unknown, marketData: unknown, descriptiveData: unknown) => ResearchSnapshot;
  SECTORS: Record<Instrument, string>;
  CASES: Record<Evaluation, string>;
  FAMILIES: Record<string, string>;
}

export interface DisplayFormat {
  fmt: (value: unknown, digits?: number) => string;
  date: (value: string) => string;
  period: (state: Selection) => string;
  signed: (value: unknown, digits?: number) => string;
}

declare global {
  interface Window {
    CBECore: ResearchCore;
    CBEUI: DisplayFormat;
    THESIS_DATA: unknown;
    THESIS_MARKET: unknown;
    THESIS_DESCRIPTIVE: unknown;
  }
}

export const sectors = ['banks', 'real_estate'] as const;
export const evaluations = ['expanded_legacy_live', 'modern_live_only'] as const;
export const exampleMeeting = 'central_bank_of_egypt_2024_06-03-2024';

export function loadSnapshot() {
  const { CBECore, THESIS_DATA, THESIS_MARKET, THESIS_DESCRIPTIVE } = window;
  return CBECore.create(THESIS_DATA, THESIS_MARKET, THESIS_DESCRIPTIVE);
}

export function studyHeadline(model: ResearchSnapshot) {
  const learned = model.X.fullMetrics.filter(row => row.variant !== 'reference');
  const zero = model.X.fullMetrics.filter(row => row.family === 'zero_return');
  const zeroWins = learned.filter(row => {
    const benchmark = zero.find(ref => ref.case === row.case && ref.sector === row.sector);
    return benchmark && +benchmark.MAE_pp < +row.MAE_pp && +benchmark.RMSE_pp < +row.RMSE_pp;
  }).length;
  const pairs = model.D.pairs;
  const lowerMAE = pairs.filter(row => +row.MAE_difference_pp < 0);
  const includesZero = pairs.filter(row => +row.MAE_difference_pp_low <= 0 && +row.MAE_difference_pp_high >= 0);
  return { learned: learned.length, zeroWins, pairs: pairs.length, lowerMAE, includesZero: includesZero.length };
}
