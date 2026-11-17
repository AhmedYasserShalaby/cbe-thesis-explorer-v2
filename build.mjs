import { build } from 'esbuild';
import { copyFile } from 'node:fs/promises';

await build({
  entryPoints: { explorer: 'src/index.tsx' },
  outdir: 'site/Website',
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: true,
  legalComments: 'linked',
  jsx: 'automatic',
  loader: { '.woff2': 'dataurl' },
});

const licenses = {
  '@fontsource-variable/inter': 'Inter',
  react: 'React',
  'react-dom': 'ReactDOM',
  scheduler: 'Scheduler',
};
await Promise.all(Object.entries(licenses).map(([name, label]) =>
  copyFile('node_modules/' + name + '/LICENSE', 'site/Website/vendor/' + label + '-LICENSE')
));
