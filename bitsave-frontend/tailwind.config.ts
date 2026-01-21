import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [
    require('@spartan-ng/ui-core/hlm-tailwind-preset'),
  ],
  content: [
    './src/**/*.{html,ts}',
    './src/app/ui/**/*.{html,ts}', 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;