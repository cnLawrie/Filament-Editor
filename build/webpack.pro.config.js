const merge = require("webpack-merge");
const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const getWebpackCommonConfig = require("./webpack.common.config.js");
const Logic = require("./webpack.logic.config.js");
const postcssConfig = require('../postcss.config')

module.exports = () => {
    let logic = new Logic(true);

    return merge(getWebpackCommonConfig(), {
        devtool: false,
        entry: {
            app: [path.join(logic.srcDir, "core/index.tsx")],
            vendor: ["mobx", "react", "react-dom", "axios", "lodash"] // 多个页面所需的公共库文件，防止重复打包带入
        },
        mode: "production",
        module: {
            rules: [
                {
                    test: /\.less$/,
                    exclude: /node_modules/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: "css-loader",
                            options: {
                                importLoaders: 1,
                                sourceMap: true,
                                modules: {
                                    mode: 'local',
                                    localIdentName: '[local]--[hash:base64:5]',
                                    context: logic.srcDir,
                                }
                            }
                        },
                        {
                            loader: "postcss-loader",
                            options: Object.assign({}, postcssConfig, { sourceMap: true }),
                        },
                        {
                            loader: "less-loader",
                            options: {
                                modules: true,
                                javascriptEnabled: true,
                                modifyVars: logic.themer
                            }
                        }
                    ]
                }
            ]
        },
        optimization: {
            minimizer: [
                new UglifyJsPlugin({
                    cache: true,
                    parallel: true,
                    sourceMap: true,
                    uglifyOptions: {
                        warnings: false,
                    },
                }),
                new OptimizeCSSAssetsPlugin({})
            ]
        },
        plugins: [
            new HtmlWebpackPlugin({
                filename: path.join(logic.distDir, "index.html"),
                favicon: path.join(logic.srcDir, "assets/favicon.ico"),
                template: path.join(logic.srcDir, logic.webpack.options.template),
                ...logic.webpack
            }),
            // 预编译所有模块到一个闭包中
            new webpack.optimize.ModuleConcatenationPlugin(),
            new MiniCssExtractPlugin({
                filename: "css/app.[name].[hash].css",
                chunkFilename: "css/app.[id].[chunkhash].css"
            })
        ],

    });
};
