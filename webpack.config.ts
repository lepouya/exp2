import CopyPlugin from "copy-webpack-plugin";
import PugPlugin from "pug-plugin";
import { Module, ProgressPlugin } from "webpack";
import { WebpackConfiguration } from "webpack-dev-server";

import pkg from "./package.json";

function config(
  env: NodeJS.ProcessEnv,
  argv: Record<string, string>,
): WebpackConfiguration {
  const min = argv.mode !== "production" && !env.production ? "" : ".min";

  return {
    mode: min ? "production" : "development",
    devtool: min ? false : "source-map",
    context: __dirname,
    entry: { index: pkg.main },
    resolve: { extensions: [".ts", ".tsx", ".js"] },

    output: {
      assetModuleFilename: "[path][name][ext][query]",
      clean: !!env.clean,
      filename: ({ chunk }) =>
        chunk!.name!.replace(/index.*/, pkg.name) + min + ".js",
      path: __dirname + "/dist",
      publicPath: "",
    },

    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/i,
          exclude: /node_modules/,
          use: ["ts-loader"],
        },
        {
          test: /\.(css|scss|sass|less|styl)$/i,
          use: ["css-loader", "sass-loader"],
        },
        {
          test: /\.pug$/,
          use: [PugPlugin.loader],
        },
        {
          test: /\.(ttf|eot|woff|woff2)$/i,
          type: "asset/resource",
          generator: {
            filename: "fonts/[name][ext]",
          },
        },
      ],
    },

    plugins: [
      new ProgressPlugin(),
      new CopyPlugin({ patterns: [{ from: "assets" }] }),
      new PugPlugin({
        pretty: !min,
        modules: [PugPlugin.extractCss({ filename: pkg.name + min + ".css" })],
      }),
    ],

    optimization: {
      minimize: !!min,
      splitChunks: {
        chunks: "all",
        minSize: 128 * 1024,
        name: (m: Module, _: any, key: string) =>
          key === "default" ? m.identifier() : "vendors",
      },
    },

    performance: {
      assetFilter: (fn: string) => /\.(js|css|html)$/.test(fn),
      maxAssetSize: 1024 * 1024,
      maxEntrypointSize: 1024 * 1024,
    },

    devServer: {
      static: { directory: __dirname + "/dist" },
      watchFiles: {
        paths: ["src/**/*.*"],
        options: { usePolling: true },
      },
      port: 8080,
      open: true,
    },
  };
}

export default config;
