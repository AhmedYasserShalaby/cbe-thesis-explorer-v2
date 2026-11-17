# CBE Thesis Explorer design

The full-width shell uses document scroll and a near-black navigation rail.
Desktop readers can switch between labeled and compact navigation. Phones
use the same destinations through a drawer. The current workspace appears
in the desktop toolbar, and a slim progress line tracks the current page
where the browser supports CSS scroll timelines. The bundled Inter font
carries both headlines and interface text.

The graphite Overview pairs the study question with a high-contrast display of the sixteen
saved text comparisons. Labeled counts and a patterned fill identify where
adding text lowered average error. The benchmark cards plot both sectors on
the same zero-based MAE scale across both evaluations. The evaluation selector
changes the displayed data and the link into Forecast results. Expand
**Exact values and model names** for the four original table rows. The
6–7 March timeline links to the source statement and the saved forecast trace.

Page, tab, benchmark panel, chart data, dialog, and copy feedback use brief
transitions. The system's reduced-motion setting disables these effects.
On phones, filters and utility dialogs open as bottom sheets. The Walkthrough
describes the assumed forecast cutoff and observed close-to-close return
window. Its numbered steps stay alongside the article on wide screens and
wrap into a grid on phones.

Forecast results offers the saved evaluation and filtered meetings as
separate scopes. Both preserve the selected date range and meeting filters for
exploration. Charts appear when their views open. The plots identify series
using labels, patterns and accessible source tables. Data & methods explains
the overlapping evaluations through a compact sample table.

The interface uses one dark palette. Cards and buttons use graphite layers,
fine borders, and inset highlights. Color identifies chart series and data
marks. Print uses a light page and a print-specific chart palette.

Chart panels group chart/data, expand, export, and source actions. Table
headers highlight the active sort column. Data & methods lays out the
report, notebook, data files, and other deliverables as linked cards.

## Component references for the site-wide overhaul

The selected patterns use the existing React and CSS interface. Buttons
and dialogs use native controls. The charts use the retained ECharts bundle.

| Component | Where it appears | 21st.dev reference |
| --- | --- | --- |
| Interactive Hover Button | Main actions gain an arrow movement on hover and keyboard focus. | [Magic UI Interactive Hover Button](https://21st.dev/@dillionverma/components/interactive-hover-button) |
| Texture Button | Buttons use inset highlights and a short pressed movement. | [Cult UI Texture Button](https://21st.dev/@cult-ui/components/texture-button) |
| Copy Button | Copying a view link displays a check and a text status. | [Cubby UI Copy Button](https://21st.dev/@cubby-ui/components/copy-button) |
| Expandable Sidebar | The desktop rail switches between full labels and icons using a keyboard-accessible toggle. | [Aceternity Sidebar](https://21st.dev/@manuarora700/components/sidebar) |
| Hover Border Gradient | Evidence and file cards highlight the destination on pointer hover and keyboard focus. | [Aceternity Hover Border Gradient](https://21st.dev/@manuarora700/components/hover-border-gradient) |
| Transition Panel | Research views, cohort switches, and chart data panels use short fades and slides. | [Motion Primitives Transition Panel](https://21st.dev/@ibelick/components/transition-panel) |
| Scroll Progress | The sticky toolbar shows how far down the current workspace the reader has scrolled. | [Motion Primitives Scroll Progress](https://21st.dev/@ibelick/components/scroll-progress) |
| Dynamic Toolbar | Chart actions are grouped by task. The toolbar adapts when the reader switches to source data or has a smaller screen. | [Motion Primitives Toolbar Dynamic](https://21st.dev/@ibelick/components/toolbar-dynamic) |
| Responsive Bottom Sheet | Filters, view links, and other utility dialogs open from the bottom on phones. | [Vercel Notification Popover](https://21st.dev/@patrick-xin/components/vercel-notification-popover) |
| Table Card | Data tables sit inside cards with striped rows and a highlighted active sort column. | [Reshaped Table Card](https://21st.dev/@reshaped/components/reshaped-table/card) |
| Command Menu | The existing Explorer search shows a clearer selected result and badges for result types. | [Proper UI Command Menu](https://21st.dev/@properui/components/command-menu) |

The review also considered [Magic UI Shimmer Button](https://21st.dev/@dillionverma)
and [Animated Table](https://dev.21st.dev/@arunachalam/components/animated-table).
The shipped motion runs when readers interact with a control or enter a view.

## Component references for the 17 November refresh

| Reference | Adaptation |
| --- | --- |
| [UIAble Financial Bento Grid on 21st.dev](https://21st.dev/@uiable/components/block-bento-5) | An asymmetric overview that gives the study question, matched text result, benchmarks and worked example different visual weight. |
| [Cubby UI Timeline on 21st.dev](https://21st.dev/@cubby-ui/components/timeline) | A short event timeline with a source link for the policy decision and labeled returns at the next session close. |
| [Origin UI Vertical Stepper on 21st.dev](https://21st.dev/@originui/components/stepper/vertical-with-inline-titles-and-descriptions) | A numbered walkthrough rail with a visible current step and direct access to every step. |
| [Animated Tabs on 21st.dev](https://21st.dev/@kuratlielia/components/tabs) and [shadcn/ui Tabs](https://ui.shadcn.com/docs/components/base/tabs) | Segmented research views and a compact evaluation switch with a pressed state and native keyboard controls. |
| [Datawrapper grouped bar charts](https://www.datawrapper.de/docs/category/bar-charts) | Directly labeled MAE bars with a shared scale and exact values. |

Builder OS Bento was considered for the overview. Its activity panels and
animated counters suit live operational data. The 21st.dev command-palette
collection was also reviewed. The existing palette already searches the
local archive and study files. All selected patterns were implemented in the
existing React and CSS build using bundled data.

## Patterns from current research and data websites

- The header search uses GitHub’s keyboard palette pattern. Results open
  research views, archived statements and bundled study files.
  [GitHub Command Palette](https://docs.github.com/en/get-started/accessibility/github-command-palette)
- Charts and sortable data views share a panel. The data view carries the
  current source scope, units, notes and CSV export.
  [Our World in Data chart design](https://ourworldindata.org/redesigning-our-interactive-data-visualizations)
- Active date, action and cohort filters are removable and use the same
  selection state as the filter dialog.
  [Carbon Design System](https://www.carbondesignsystem.com/building-blocks/core/components/tag/guidelines)
- View links reopen the active section and filters. The offline edition
  offers a portable fragment for the same build.
  [Our World in Data sharing](https://ourworldindata.org/you-can-now-copy-charts-to-the-clipboard-for-easy-sharing)
