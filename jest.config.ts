import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

// Keep Next.js transforms while giving tests a browser-like DOM.
const customJestConfig = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
};

export default createJestConfig(customJestConfig);
