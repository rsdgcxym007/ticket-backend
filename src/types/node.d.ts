/// <reference types="node" />

// Global Node.js types for TypeScript
declare global {
  const Buffer: typeof import('buffer').Buffer;
  const console: Console;
  const process: NodeJS.Process;

  // Additional Node.js globals
  const global: typeof globalThis;
  const __dirname: string;
  const __filename: string;

  namespace NodeJS {
    interface Process {
      env: ProcessEnv;
      argv: string[];
      platform: string;
      version: string;
      versions: ProcessVersions;
      pid: number;
      ppid: number;
    }

    interface ProcessEnv {
      [key: string]: string | undefined;
    }

    interface ProcessVersions {
      node: string;
      v8: string;
      [key: string]: string;
    }
  }
}

// Console interface
interface Console {
  log(...data: any[]): void;
  error(...data: any[]): void;
  warn(...data: any[]): void;
  info(...data: any[]): void;
  debug(...data: any[]): void;
  trace(...data: any[]): void;
  assert(condition?: boolean, ...data: any[]): void;
  clear(): void;
  count(label?: string): void;
  countReset(label?: string): void;
  dir(item?: any, options?: any): void;
  dirxml(...data: any[]): void;
  group(...data: any[]): void;
  groupCollapsed(...data: any[]): void;
  groupEnd(): void;
  table(tabularData?: any, properties?: string[]): void;
  time(label?: string): void;
  timeEnd(label?: string): void;
  timeLog(label?: string, ...data: any[]): void;
  timeStamp(label?: string): void;
}

export {};
