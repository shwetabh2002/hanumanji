import { type JestConfigWithTsJest, pathsToModuleNameMapper } from 'ts-jest';

import { compilerOptions } from './tsconfig.json';

const config: JestConfigWithTsJest = {
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  globalSetup: '<rootDir>/tests/testSetup.ts',
  globalTeardown: '<rootDir>/tests/testTeardown.ts',
  maxWorkers: 1,
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, {
      prefix: '<rootDir>/',
    }),
    '^@app/common/(.*)$': '<rootDir>/common/$1',
    '^common/(.*)$': '<rootDir>/common/$1',
  },
  modulePaths: [compilerOptions.baseUrl],
  preset: 'ts-jest',
  rootDir: '.',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  testTimeout: 30000, // 30 seconds
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.test.json',
      },
    ],
  },
  verbose: true,
};

export default config;
