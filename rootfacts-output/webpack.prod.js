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
      maximumFileSizeToCacheInBytes: 20 * 1024 * 1024, // 20MB untuk model AI
      additionalManifestEntries: [
        { url: "model/model.json", revision: null },
        { url: "model/weights.bin", revision: null },
        { url: "model/metadata.json", revision: null },
      ],
      runtimeCaching: [
        {
          // Cache model TF lokal
          urlPattern: /\/model\//,
          handler: "CacheFirst",
          options: {
            cacheName: "tf-model-cache",
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 30,
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          // Cache Transformers.js model dari HuggingFace CDN
          urlPattern: /huggingface\.co|cdn-lfs/,
          handler: "CacheFirst",
          options: {
            cacheName: "transformers-model-cache",
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 30,
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\./,
          handler: "StaleWhileRevalidate",
          options: {
            cacheName: "fonts-cache",
          },
        },
      ],
    }),
  ],
});
