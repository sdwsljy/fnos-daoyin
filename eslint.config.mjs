import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // 历史债较多，先放宽高频规则建立基线，后续逐步收紧
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
  },
})
