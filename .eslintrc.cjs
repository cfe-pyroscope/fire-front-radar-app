module.exports = {
	parser: '@typescript-eslint/parser',
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:react-hooks/recommended',
		'prettier'
	],
	plugins: ['react', 'react-hooks'],
	settings: {
		react: {
			version: 'detect'
		}
	}
};
