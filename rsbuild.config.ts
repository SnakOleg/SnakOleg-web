import { pluginPreact } from '@rsbuild/plugin-preact';
import { pluginTypedCSSModules } from "@rsbuild/plugin-typed-css-modules";
import { pluginSass } from '@rsbuild/plugin-sass';

export default {
    plugins: [
        pluginPreact(),
        pluginTypedCSSModules(),
        pluginSass(),
    ],
    html: {
        template: './index.html',
    },
    source: {
        entry: {
            index: './src/index.tsx',
        },
    },
    resolve: {
        alias: {
            "@assets": "./src/assets/",
            "@": "./src",
            "hooks": "./hooks",
        },
    },
};