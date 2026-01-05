import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/core',
  'packages/compiler',
  'packages/runtime',
  'packages/cli',
  'packages/router',
  'packages/server',
]);
