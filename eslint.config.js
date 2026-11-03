import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		},
		rules: {
			// svelte compiler warnings (a11y, legacy state patterns) are tracked for the UI revamp;
			// real compile errors still fail lint
			'svelte/valid-compile': ['error', { ignoreWarnings: true }]
		}
	},
	{
		files: ['**/*.svelte.js'],
		languageOptions: {
			globals: { $state: 'readonly', $derived: 'readonly', $effect: 'readonly', $props: 'readonly' }
		}
	},
	{
		ignores: ['build/', '.svelte-kit/', 'dist/', '__.eslintrc.cjs']
	}
];
