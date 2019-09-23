const merge = require("webpack-merge")
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlWebpackHarddiskPlugin = require("html-webpack-harddisk-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const getWebpackCommonConfig = require("./webpack.common.config.js");
const Logic = require("./webpack.logic.config.js");
const postcssConfig = require("../postcss.config")

module.exports = () => {
    let logic = new Logic(true);
    return merge({
        customizeArray(a, b, key) {
            /*entry.app不合并，全替换*/
            if (key === "entry.app") {
                return b;
            }
            return undefined;
        }
    })(getWebpackCommonConfig(), {
        entry: {
            app: [
                "react-hot-loader/patch",
                path.join(logic.srcDir, "core/index.tsx")
            ]
        },
        module: {
            rules: [
                {
                    test: /\.(jsx?|tsx?)$/,
                    loader: 'eslint-loader',
                    enforce: 'pre',
                    include: [logic.srcDir],
                    options: {
                        fix: true
                    }
                },
                {
                    test: /\.less$/,
                    exclude: /node_modules/,
                    use: [
                        "css-hot-loader",
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                importLoaders: 1,
                                sourceMap: true,
                                modules: {
                                    mode: 'local',
                                    localIdentName: '[local]--[hash:base64:5]',
                                    context: logic.srcDir,
                                }
                            },
                        },
                        {
                            loader: 'postcss-loader',
                            options: Object.assign({}, postcssConfig, { sourceMap: true }),
                        },
                        {
                            loader: 'less-loader',
                            options: {
                                modules: true,
                                javascriptEnabled: true,
                                sourceMap: true,
                                modifyVars: logic.themer
                            },
                        },
                    ],
                },
            ]
        },
        mode: "development",
        devServer: {
            contentBase: logic.distDir,
            port: logic.webpack.options.port,
            compress: true,
            inline: true,
            hot: true,
            historyApiFallback: true,
            host: logic.webpack.options.host,
            // host: '0.0.0.0',
            proxy: {}
        },
        watchOptions: {
            ignored: /node_modules/
        },
        plugins: [
            new HtmlWebpackPlugin({
                filename: path.join(logic.distDir, "index.html"),
                favicon: path.join(logic.srcDir, "assets/favicon.ico"),
                template: path.join(
                    logic.srcDir,
                    logic.webpack.options.template
                ),
                ...logic.webpack
            }),
            new HtmlWebpackHarddiskPlugin(),
            new MiniCssExtractPlugin({
                filename: "css/[chunkhash:8].css",
                chunkFilename: "css/[id].css"
            })
        ],
        resolve: {
            alias: {
                // hooks support
                'react-dom': '@hot-loader/react-dom'
            }
        }
    });
};
