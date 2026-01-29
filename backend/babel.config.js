/**
 * Babel Configuration for Jest
 *
 * Required for ES module support in Jest tests
 */

export default {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      }
    }]
  ],
  plugins: []
};
