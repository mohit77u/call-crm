// Re-export the native module. On web, it will be resolved to CallLogModule.web.ts
// and on native platforms to CallLogModule.ts
export { default } from './src/CallLogModule';
export * from './src/CallLog.types';
