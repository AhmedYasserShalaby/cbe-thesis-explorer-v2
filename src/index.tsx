import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { ReactNode } from 'react';
import './theme.css';
import './research/workstation.css';
import './refinements.css';
import { Shell } from './Shell';
import { SearchPalette } from './SearchPalette';
import type { SearchPaletteProps } from './SearchPalette';
import { Overview } from './Overview';
import { Walkthrough } from './Walkthrough';
import { Workspace } from './Workspaces';
import type { StudyContext, Page } from './research/snapshot';
import { startExplorer } from './controller';

const app = document.getElementById('app');
if (!app) throw new Error('Explorer mount is missing.');
const shell = createRoot(app);
flushSync(() => shell.render(<Shell />));

const view = document.getElementById('view');
if (!view) throw new Error('Explorer workspace is missing.');
const workspace = createRoot(view);

type WorkspaceContext = StudyContext & {
  views: Record<Exclude<Page, 'overview' | 'walkthrough'>, () => ReactNode>;
};

function renderWorkspace(page: Page, ctx: WorkspaceContext) {
  let content;
  if (page === 'overview') {
    content = <Overview model={ctx.model} />;
  } else if (page === 'walkthrough') {
    content = <Walkthrough ctx={ctx} />;
  } else {
    content = ctx.views[page]();
  }
  flushSync(() => workspace.render(<Workspace page={page}>{content}</Workspace>));
}

const searchContent = document.getElementById('search-content');
if (!searchContent) throw new Error('Explorer search mount is missing.');
const search = createRoot(searchContent);
let searchInstance = 0;

function renderSearch(props: SearchPaletteProps) {
  flushSync(() => search.render(<SearchPalette key={++searchInstance} {...props} />));
}

startExplorer(renderWorkspace, renderSearch);
