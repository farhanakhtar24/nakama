import typescript from "@rollup/plugin-typescript";

export default {
	input: "src/main.ts",
	output: {
		file: "build/index.js",
		format: "esm",
	},
	plugins: [typescript()],
};
