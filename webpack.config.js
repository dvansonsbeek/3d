const path = require("path");

const toPath = (_path) => path.join(process.cwd(), _path);

const HtmlWebPackPlugin = require("html-webpack-plugin");

const CopyPlugin = require("copy-webpack-plugin");

// Instantiate the plugin.
// The `template` property defines the source
// of a template file that this plugin will use.
// We will create it later.
const htmlPlugin = new HtmlWebPackPlugin({
  template: "./src/index.html"
});

module.exports = {
  // Our application entry point.
  entry: "./src/index.tsx",

  // These rules define how to deal
  // with files with given extensions.
  // For example, .tsx files
  // will be compiled with ts-loader,
  // a spcific loader for webpack
  // that knows how to work with TypeScript files.
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      },
      {
        test: /\.m?jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"]
          }
        },
        resolve: {
          fullySpecified: false // disable the behaviour
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  devtool: "source-map", // This lets you debug runtime crashes

  // Telling webpack which extensions
  // we are interested in.
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
    symlinks: true
  },

  // What file name should be used for the result file,
  // and where it should be palced.
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist")
  },

  // Use the html plugin.
  //plugins: [htmlPlugin],

  plugins: [
    htmlPlugin,
    new CopyPlugin({
      patterns: [{ from: "public" }]
    })
  ],

  // Set up the directory
  // from which webpack will take the static content.
  // The port field defines which port on localhost
  // this application will take.
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    compress: true,
    port: 9000
  },

  webpackFinal: async (config) => {
    return {
      resolve: {
        alias: {
          "@emotion/core": toPath("node_modules/@emotion/react"),
          "@emotion/styled": toPath("node_modules/@emotion/styled"),
          "emotion-theming": toPath("node_modules/@emotion/react")
        }
      }
    };
  }

  //watchOptions: {   ignored: [     /node_modules([\\]+|\/)+(?!react-financial-charts)/   ] }
};
