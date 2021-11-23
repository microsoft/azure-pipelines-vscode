// @ts-check

'use strict';

const path = require('path');

/** @type {import('webpack').Configuration} */
const config = {
  target: 'node',
  entry: {
    extension: './src/extension.ts',
    server: './node_modules/azure-pipelines-language-server/out/server.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode',
    'applicationinsights-native-metrics': 'commonjs applicationinsights-native-metrics', // we're not native
    '@opentelemetry/tracing': 'commonjs @opentelemetry/tracing', // optional
  },
  mode: 'production',
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  // Disable optimization until vscode-azure-account supports @azure/core-auth
  // and we move off of @azure/ms-rest-nodeauth.
  // https://github.com/Azure/ms-rest-nodeauth/issues/83
  optimization: {
    minimize: false,
  },
};
module.exports = config;
