import config from '@pengzhanbo/eslint-config'

export default config({}, {
  files: ['**/*.md/*.{js,ts}'],
  rules: {
    'node/prefer-global/buffer': 'off',
  },
})
