import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Replace 'YOUR_REPOSITORY_NAME' with the actual name of your GitHub repository
    // For example, if your repo URL is https://github.com/username/my-zen-app,
    // then base should be '/my-zen-app/'
    const base = mode === 'production' ? '/dbsh_rosetile/' : '/';

    return {
      base: base, // Set base path for routing and assets
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
