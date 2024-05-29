import builtins from "builtin-modules";
import esbuild from "esbuild";
import inlineWorkerPlugin from "esbuild-plugin-inline-worker";
import { sassPlugin } from "esbuild-sass-plugin";
import esbuildSvelte from "esbuild-svelte";
import process from "process";
import sveltePreprocess from "svelte-preprocess";
import { banner } from "./banner";

const prod = process.argv[2] === "production";
const dev = process.argv[2] === "development";
const dev_watch = process.argv[2] === "development-watch";

const dir = prod ? "./" : process.env.OUTDIR || "./";

esbuild.build({
	banner: {
		js: await banner(prod ? "production" : "development"),
	},
	entryPoints: ["src/main.ts", "src/styles.css"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/closebrackets",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/comment",
		"@codemirror/fold",
		"@codemirror/gutter",
		"@codemirror/highlight",
		"@codemirror/history",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/matchbrackets",
		"@codemirror/panel",
		"@codemirror/rangeset",
		"@codemirror/rectangular-selection",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/stream-parser",
		"@codemirror/text",
		"@codemirror/tooltip",
		"@codemirror/view",
		...builtins,
	],
	format: "cjs",
	target: "esnext",
	logLevel: "info",
	sourcemap: (prod || dev) ? false : "inline",
	treeShaking: true,
	minify: prod,
	outdir: dir,

	plugins: [
		sassPlugin(),
		esbuildSvelte({
			compilerOptions: { css: "injected" },
			preprocess: sveltePreprocess(),
			filterWarnings: (warning) => {
				return warning.code !== "a11y-click-events-have-key-events" &&
					warning.code !== "a11y-no-static-element-interactions" &&
					warning.code !== "a11y-no-noninteractive-element-interactions" &&
					warning.code !== "a11y-no-noninteractive-tabindex";
			},
		}),
		inlineWorkerPlugin({
			// @ts-expect-error (Older config of inlineWorkerPlugin)
			workerName: "Translate Bergamot Worker",
			external: ["obsidian"],
		}),
	],
}).catch(() => process.exit(1));
