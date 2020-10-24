const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
  entry: {
    'jsonld-patch': './lib',
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'contexts/*.json',
          context: 'lib/'
        },
      ],
    }),
  ],
  output: {
    filename: '[name].min.js',
    library: '[name]',
    libraryTarget: 'amd',
  },
};
