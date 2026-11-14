import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { I18nPlugin } from '@eartharoid/vite-plugin-i18n';
import { LOCALE_ID_REGEX } from './src/lib/locale-id.js';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		sveltekit(),
		I18nPlugin({
			id_regex: LOCALE_ID_REGEX,
			include: 'src/lib/locales/*/*.json'
		})
	],
	resolve: {
		alias: [
			// jszip's prebuilt browser file includes a setImmediate polyfill that can eval strings;
			// build jszip from its source and give it a polyfill that can't (see the shim)
			{ find: /^jszip$/, replacement: 'jszip/lib/index.js' },
			{
				find: /^setimmediate$/,
				replacement: fileURLToPath(new URL('./src/lib/shims/setimmediate.js', import.meta.url))
			}
		]
	},
	server: {
		host: '127.0.0.1',
		proxy: {
			'/api': {
				target: 'http://127.0.0.1',
				changeOrigin: true
			},
			'/attachments': {
				target: 'http://127.0.0.1',
				changeOrigin: true
			},
			'/auth': {
				target: 'http://127.0.0.1',
				changeOrigin: true
			},
			'/avatars': {
				target: 'http://127.0.0.1',
				changeOrigin: true
			},
			'/invite': {
				target: 'http://127.0.0.1',
				changeOrigin: true
			}
		}
	}
};

export default config;
