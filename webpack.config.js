module.exports = {
  entry: {
    'jsonld-patch': './lib'
  },
  output: {
    filename: '[name].min.js',
    library: '[name]',
    libraryTarget: 'amd',
  }
}
