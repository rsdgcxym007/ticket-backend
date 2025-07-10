module.exports = {
  displayName: 'Unit Tests',
  preset: 'ts-jest',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.spec.ts',
    '!<rootDir>/src/**/*.e2e-spec.ts',
    '!<rootDir>/src/main.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/unit',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  moduleNameMapping: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  testTimeout: 10000,
};
