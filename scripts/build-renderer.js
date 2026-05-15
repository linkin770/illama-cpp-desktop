import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['renderer/src/main.tsx'],
  bundle: true,
  minify: false,
  sourcemap: true,
  outfile: 'renderer/dist/main.js',
  platform: 'browser',
  target: ['chrome120'],
  tsconfig: 'tsconfig.json',
  loader: {
    '.ts': 'tsx',
    '.tsx': 'tsx',
  },
  resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
})

console.log('Build completed successfully')