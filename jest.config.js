module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@shared(.*)$': '<rootDir>/src/shared/$1',
    '^@main(.*)$': '<rootDir>/src/main/$1',
    '^@renderer(.*)$': '<rootDir>/src/renderer/$1',
    '^@back(.*)$': '<rootDir>/src/back/$1',
    '^@database(.*)$': '<rootDir>/src/database/$1',
    '^@tests(.*)$': '<rootDir>/tests/$1'
  }
};
