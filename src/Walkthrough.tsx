import { Icon } from './icons';
import { ResearchContent } from './Workspaces';
import { walkthroughSteps } from './research/routes';
import { steps } from './research/walkthrough';
import type { StudyContext } from './research/snapshot';

export function Walkthrough({ ctx }: { ctx: StudyContext }) {
  const id = walkthroughSteps.find(step => step === ctx.state().step) ?? walkthroughSteps[0];
  const index = walkthroughSteps.indexOf(id);
  const previous = walkthroughSteps[index - 1];
  const next = walkthroughSteps[index + 1];
  const current = steps[id];
  return (
    <div className="walkthrough">
      <nav className="walkthrough-steps" aria-label="Walkthrough steps">
        <ol>{walkthroughSteps.map((step, i) => (
          <li key={step}>
            <button type="button" data-walkthrough-step={step} aria-current={step === id ? 'step' : undefined}>
              <span className="walkthrough-marker" aria-hidden="true">{i + 1}</span>
              {steps[step].label}
              <span className="walkthrough-chevron"><Icon name="chevron" /></span>
            </button>
          </li>
        ))}</ol>
      </nav>
      <article className="walkthrough-content" aria-labelledby="walkthrough-step-title">
        <div className="walkthrough-copy">
          <p className="walkthrough-progress">Step {index + 1} of {walkthroughSteps.length}</p>
          <h2 id="walkthrough-step-title" tabIndex={-1}>{current.title}</h2>
          <ResearchContent markup={current.body(ctx.model)} />
        </div>
        <div className="walkthrough-footer">
          {previous && <button type="button" className="quiet-button" data-walkthrough-step={previous}>Previous · {steps[previous].label}</button>}
          {next ? <button type="button" className="button" data-walkthrough-step={next}>Next · {steps[next].label} <Icon name="arrow" /></button> :
            <button type="button" className="button" data-page="forecasts" data-study-results>See forecast results <Icon name="arrow" /></button>}
        </div>
      </article>
    </div>
  );
}
