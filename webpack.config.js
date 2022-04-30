// @ts-check

'use strict';

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

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
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/configure/templates', to: 'configure/templates' },
      ],
    }),
  ],
  // Disable optimization until vscode-azure-account supports @azure/core-auth
  // and we move off of @azure/ms-rest-nodeauth.
  // https://github.com/Azure/ms-rest-nodeauth/issues/83
  optimization: {
    minimize: false,
  },
};
module.exports = config;
