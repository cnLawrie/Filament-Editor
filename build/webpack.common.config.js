const { getProjectPath, resolve, injectRequire } = require('./utils/projectHelper')
const Logic = require("./webpack.logic.config.js");
injectRequire()

// 使用弃用方法时打印警告信息
process.traceDeprecation = true

const path = require('path');
const webpack = require('webpack');
const WebpackBar = require('webpackbar');
// 将CSS提取为独立的文件的插件，对每个包含css的js文件都会创建一个CSS文件，支持按需加载css和sourceMap
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// 强制所有需要的模块的整个路径匹配磁盘上实际路径
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const FilterWarningsPlugin = require('webpack-filter-warnings-plugin')
const postcssConfig = require('../postcss.config')
const CleanUpStatsPlugins = require('./utils/cleanUpStatsPlugins')
const CopyWebpackPlugin = require("copy-webpack-plugin");
const WriteFileWebpackPlugin = require("write-file-webpack-plugin");
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const getWebpackCommonConfig = function getWebpackCommonConfig(modules) {
    const package = require(getProjectPath('package.json'))
    const babelConfig = require('./babel.common.config')(modules || false)
    const logic = new Logic(true)

    const config = {
        devtool: 'source-map',

        output: {
            path: logic.distDir,
            /*这里本来应该是[chunkhash]的，但[chunkhash]和react-hot-loader不兼容。*/
            filename: "[name].[hash].js",
            chunkFilename: "js/[name].[chunkhash].js",
            publicPath: logic.webpack.publicPath
        },

        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    loader: resolve('babel-loader'),
                    exclude: /node_modules/,
                    options: babelConfig,
                },
                {
                    test: /\.tsx?$/,
                    use: [
                        {
                            loader: resolve('babel-loader'),
                            options: babelConfig,
                        },
                        {
                            loader: resolve('ts-loader'),
                            options: {
                                transpileOnly: true,
                            },
                        },
                    ],
                },
                {
                    test: /\.less$/,
                    include: /node_modules/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                importLoaders: 1,
                                modules: false
                            },
                        },
                        {
                            loader: 'postcss-loader',
                            options: Object.assign({}, postcssConfig, { sourceMap: true }),
                        },
                        {
                            loader: resolve('less-loader'),
                            options: {
                                javascriptEnabled: true,
                                modifyVars: logic.themer
                            },
                        },
                    ],
                },
                {
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                sourceMap: true,
                                importLoaders: 1,
                            },
                        },
                        {
                            loader: 'postcss-loader',
                            options: Object.assign({}, postcssConfig, { sourceMap: true }),
                        },
                    ],
                },

                // Images
                {
                    test: /\.(jpe?g|png|gif|mp4|ttf|webm|woff|eot|otf|webp|svg|ico)$/,
                    use: [
                        {
                            loader: "url-loader",
                            options: {
                                limit: 8192,
                                name: "assets/[hash:8].[name].[ext]"
                            }
                        }
                    ]
                },
                // svg
                {
                    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        minetype: 'image/svg+xml',
                    },
                },
                {
                    test: /\.(xml|bpmn)$/,
                    use: [
                        {
                            loader: "url-loader",
                            options: {
                                limit: 1
                            }
                        }
                    ]
                },
            ]
        },

        plugins: [
            new CaseSensitivePathsPlugin(),
            new webpack.BannerPlugin(`
                ${package.name} v${Logic.version}
            `),
            new WebpackBar({
                name: 'Good Luck! 🍺 ',
                color: '#0CB5CF',
            }),
            new CleanUpStatsPlugins(),
            new FilterWarningsPlugin({
                // see https://github.com/webpack-contrib/mini-css-extract-plugin/issues/250
                exclude: /mini-css-extract-plugin[^]*Conflicting order between:/,
            }),
            new CopyWebpackPlugin([
                {
                    from: path.join(logic.srcDir, "assets"),
                    to: path.join(logic.distDir, "assets")
                }
            ]),
            new WriteFileWebpackPlugin(),
            new webpack.HashedModuleIdsPlugin()
        ],

        resolve: {
            modules: ['node_modules', logic.srcDir],
            extensions: [
                '.ts',
                '.tsx',
                '.js',
                '.jsx',
                '.json',
                '.less'
            ],
            alias: {
                [package.name]: process.cwd(),

                // widgets: path.join(logic.srcDir, "components/widgets"),
                services: path.join(logic.srcDir, "components/services"),

                core: path.join(logic.srcDir, "core"),
                utils: path.join(logic.srcDir, "core/utils"),
                config: path.join(logic.srcDir, "core/config"),
                configs: path.join(logic.srcDir, "configs"),
                hooks: path.join(logic.srcDir, "hooks"),

                stores: path.join(logic.srcDir, "stores"),
                router: path.join(logic.srcDir, "router"),
                less: path.join(logic.srcDir, "less"),
                assets: path.join(logic.srcDir, "assets"),
            },
            plugins: [new TsconfigPathsPlugin({ configFile: path.resolve(logic.rootDir, "./tsconfig.json") })]
        },

        optimization: {
            splitChunks: {
                chunks: "all", // 只对入口文件处理
                cacheGroups: {
                    vendor: {
                        // split `node_modules`目录下被打包的代码到 `js/chunks/vendor.js
                        test: /node_modules\//,
                        name: "chunks/vendor",
                        priority: 10,
                        enforce: true,
                        reuseExistingChunk: true // 可设置是否重用该chunk（查看源码没有发现默认值）
                    },
                    commons: {
                        // split `common`和`components`目录下被打包的代码到`js/chunks/commons.js `
                        test: /common\/|components\//,
                        name: "chunks/commons",
                        priority: 10,
                        enforce: true,
                        reuseExistingChunk: true // 可设置是否重用该chunk（查看源码没有发现默认值）
                    }
                }
            },
            runtimeChunk: {
                name: "manifests/manifest"
            },
        },
    }

    return config
}

module.exports = getWebpackCommonConfig