import '@testing-library/jest-dom';

window.Shared = {
  backUrl: new URL('http://localhost:8000'),
  isDev: false,
  isBackRemote: false,
} as any;
