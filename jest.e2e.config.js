module.exports = {
  displayName: 'E2E Tests',
  preset: 'ts-jest',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.spec.ts',
    '!<rootDir>/src/**/*.e2e-spec.ts',
    '!<rootDir>/src/main.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/e2e',
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/src'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1,
  detectOpenHandles: true,
  forceExit: true,
};
