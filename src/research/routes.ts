import type { Selection } from './snapshot';

export const walkthroughSteps = ['question', 'announcement', 'return', 'comparison', 'results', 'interpretation'] as const;
type Step = typeof walkthroughSteps[number];
type CanonicalSelection = Omit<Selection, 'step' | 'page'> & { page: Exclude<Selection['page'], 'walkthrough'> };
type RouteState = Partial<Selection> & Record<string, unknown>;

interface OriginalRoutes {
  parseRoute: (hash: string) => CanonicalSelection;
  normalizeState: (state: RouteState) => CanonicalSelection;
  route: (state: Selection) => string;
}

function coreRoutes(): OriginalRoutes {
  return window.CBECore as typeof window.CBECore & OriginalRoutes;
}

export function normalizeState(state: RouteState): Selection {
  const canonical = coreRoutes().normalizeState(state);
  const step = walkthroughSteps.find(candidate => candidate === state.step) ?? walkthroughSteps[0];
  return { ...canonical, page: state.page === 'walkthrough' ? 'walkthrough' : canonical.page, step };
}

export function parseRoute(hash: string): Selection {
  const canonical = coreRoutes().parseRoute(hash);
  const [page, query] = hash.slice(1).split('?');
  const step = new URLSearchParams(query).get('step') as Step | null;
  return normalizeState({ ...canonical, page: page === 'walkthrough' ? page : canonical.page, step: step ?? undefined });
}

export function route(state: Selection) {
  const hash = coreRoutes().route(state);
  if (state.page !== 'walkthrough' || state.step === walkthroughSteps[0]) return hash;
  return hash + (hash.includes('?') ? '&' : '?') + 'step=' + encodeURIComponent(state.step);
}
