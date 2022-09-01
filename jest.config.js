module.exports = {
	testEnvironment: 'jsdom',
	testMatch: ["**/tests/**/*.test.ts"],

	collectCoverage: false,

	transform: { '^.+\\.ts$': 'ts-jest' },

	moduleDirectories: ["node_modules", "src", "tests"],
	moduleFileExtensions: ['js', 'ts'],
	moduleNameMapper: {
		"obsidian": "path/to/my/mocked/obsidian.ts"
	}
};
