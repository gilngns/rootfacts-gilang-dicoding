const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const path = require("path");

module.exports = merge(common, {
  mode: "production",
  devtool: false,
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: "[name].[contenthash].css",
    }),
    new WorkboxWebpackPlugin.GenerateSW({
      swDest: "sw.js",
      maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      additionalManifestEntries: [
        { url: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js", revision: null },
        { url: "https://unpkg.com/lucide@0.462.0/dist/umd/lucide.js", revision: null },
        { url: "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js", revision: null }
      ],
      runtimeCaching: [
        {
          // Cache script eksternal dari CDN
          urlPattern: /^https:\/\/(cdn\.jsdelivr\.net|unpkg\.com)/,
          handler: "CacheFirst",
          options: {
            cacheName: "cdn-scripts-cache",
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 hari
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          // Cache model TF lokal
          urlPattern: /\/model\//,
          handler: "CacheFirst",
          options: {
            cacheName: "tf-model-cache",
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 60 * 60 * 24 * 30,
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          // Cache font
          urlPattern: /^https:\/\/fonts\./,
          handler: "StaleWhileRevalidate",
          options: {
            cacheName: "fonts-cache",
          },
        },
      ],
      navigateFallback: "index.html",
      clientsClaim: true,
      skipWaiting: true,
    }),
  ],
});
