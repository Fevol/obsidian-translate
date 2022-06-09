import esbuild from "esbuild";
import esbuildSvelte from "esbuild-svelte";
import process from "process";
import sveltePreprocess from "svelte-preprocess";
import builtins from 'builtin-modules'
import { sassPlugin } from "esbuild-sass-plugin";


const banner =
`/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

const prod = (process.argv[2] === 'production');

const dir = prod ? "./" : process.env.OUTDIR;

esbuild.build({
	banner: {
		js: banner,
	},
	entryPoints: ['src/main.ts', 'src/styles.css'],
	bundle: true,
	external: [
		'obsidian',
		'electron',
		'@codemirror/autocomplete',
		'@codemirror/closebrackets',
		'@codemirror/collab',
		'@codemirror/commands',
		'@codemirror/comment',
		'@codemirror/fold',
		'@codemirror/gutter',
		'@codemirror/highlight',
		'@codemirror/history',
		'@codemirror/language',
		'@codemirror/lint',
		'@codemirror/matchbrackets',
		'@codemirror/panel',
		'@codemirror/rangeset',
		'@codemirror/rectangular-selection',
		'@codemirror/search',
		'@codemirror/state',
		'@codemirror/stream-parser',
		'@codemirror/text',
		'@codemirror/tooltip',
		'@codemirror/view',
		...builtins],
	format: 'cjs',
	watch: !prod,
	target: 'es2020',
	logLevel: "info",
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	outdir: dir,

	plugins: [
		sassPlugin(),
		esbuildSvelte({
			compilerOptions: { css: true },
			preprocess: sveltePreprocess(),
		}),
	]
}).catch(() => process.exit(1));
