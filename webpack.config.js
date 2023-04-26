const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require('terser-webpack-plugin');

const mode = process.argv.includes('--mode=production') ?
  'production' : 'development';

module.exports = {
  mode: mode,
  optimization: {
    minimize: mode === 'production',
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress:{
            drop_console: true,
          }
        }
      }),
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'h5p-portfolio.css'
    })
  ],
  entry: {
    dist: './src/entries/h5p-portfolio.js'
  },
  output: {
    filename: 'h5p-portfolio.js',
    path: path.resolve(__dirname, 'dist')
  },
  target: ['web'],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.(s[ac]ss|css)$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: ''
            }
          },
          { loader: "css-loader" },
          {
            loader: "sass-loader"
          }
        ]
      },
      {
        test: /\.svg|\.jpg|\.png$/,
        include: path.join(__dirname, 'src/images'),
        type: 'asset/resource'
      },
      {
        test: /\.woff$/,
        include: path.join(__dirname, 'src/fonts'),
        type: 'asset/resource'
      }
    ]
  },
  stats: {
    colors: true
  },
  devtool: (mode === 'prduction') ? undefined : 'eval-cheap-module-source-map'
};
