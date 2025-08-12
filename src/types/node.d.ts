/// <reference types="node" />

// Ensure Node.js globals are available
declare global {
  const Buffer: typeof import('buffer').Buffer;
  const console: typeof import('console');
  const process: typeof import('process');
}

export {};
