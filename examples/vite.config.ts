import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        counter: resolve(__dirname, 'counter/index.html'),
        'todo-list': resolve(__dirname, 'todo-list/index.html'),
        'fetch-list': resolve(__dirname, 'fetch-list/index.html'),
        components: resolve(__dirname, 'components/index.html'),
        router: resolve(__dirname, 'router/index.html'),
      },
    },
  },
});
