export default {
  preset: "ts-jest",
  testEnvironment: "node",

  roots: ["<rootDir>/tests"],

  transform: {
    "^.+\\.ts$": "ts-jest",
    "^.+\\.js$": ["ts-jest", {
      tsconfig: {
        allowJs: true,
        module: "CommonJS",
        verbatimModuleSyntax: false,
        noUncheckedSideEffectImports: false,
      },
      diagnostics: false,
    }],
  },

  transformIgnorePatterns: [
    "/node_modules/(?!(@bpmn-io|min-dash)/)"
  ],

  setupFiles: ["<rootDir>/tests/setup.ts"],

  moduleFileExtensions: ["ts", "js"],

  moduleNameMapper: {
    "^(.*)\\.js$": "$1"
  },

  clearMocks: true,

  collectCoverage: true,

  coverageDirectory: "coverage",

  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/types/**",
    "!src/database.ts"
  ]
};