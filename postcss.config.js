// postcss.config.js
module.exports = {
  plugins: {
    'postcss-preset-env': {
      stage: 0, // This enables modern CSS features
    },
    autoprefixer: {}, // Ensures compatibility with older browsers
  },
};
