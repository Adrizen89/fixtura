import { configApp } from '@adonisjs/eslint-config'
import { vue } from '@adonisjs/eslint-config/vue'

// @adonisjs/eslint-config v3 sépare le support Vue dans un bloc dédié
// (`./vue`, nécessite eslint-plugin-vue + vue-eslint-parser). On compose la
// config de base + Vue, puis on neutralise deux règles d'opinion nouvelles en v3
// qui vont à l'encontre des conventions (valides) du projet :
//  - composants Vue nommés en PascalCase (standard de l'écosystème Vue) ;
//  - `Link` standard d'`@inertiajs/vue3` (les href sont des chemins, pas des
//    noms de routes typés — l'adoption du Link typé reste une évolution possible).
export default [
  ...configApp(),
  ...vue,
  {
    name: 'fixtura Vue overrides',
    files: ['**/*.vue'],
    rules: {
      '@unicorn/filename-case': 'off',
      '@adonisjs/prefer-adonisjs-inertia-link': 'off',
    },
  },
]
