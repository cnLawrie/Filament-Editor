const { resolve } = require('./utils/projectHelper')

module.exports = function (modules) {
    const plugins = [
        [
            resolve('@babel/plugin-transform-typescript'),
            {
                isTSX: true,
            },
        ],
        //  use import file content as DataURI. eg: import background from './background.png';
        resolve('babel-plugin-inline-import-data-uri'),
        // 转换关键字。eg: in: obj.const = 'keyword', out: obj['const'] = 'keyword' 
        resolve('@babel/plugin-transform-member-expression-literals'),
        // 转换object.assign
        resolve('@babel/plugin-transform-object-assign'),
        // in: {"bar": function () {}}, out: {bar: function () {}}
        resolve('@babel/plugin-transform-property-literals'),
        [
            // 开启复用helper来减小代码文件体积
            resolve('@babel/plugin-transform-runtime'),
            {
                // https://babeljs.io/docs/en/babel-plugin-transform-runtime#helper-aliasing
                helpers: false,
            },
        ],
        // 转换数组...
        resolve('@babel/plugin-transform-spread'),
        // 转换模板字符串
        resolve('@babel/plugin-transform-template-literals'),
        // 转换export default 
        resolve('@babel/plugin-proposal-export-default-from'),
        // 转换export * as ns from 
        resolve('@babel/plugin-proposal-export-namespace-from'),
        // 转换对象...
        resolve('@babel/plugin-proposal-object-rest-spread'),
        // 转换装饰器
        [
            resolve('@babel/plugin-proposal-decorators'),
            {
                legacy: true,
            },
        ],
        // 转换类属性(Object.defineProperty(...))
        [
            resolve('@babel/plugin-proposal-class-properties'),
            {
                loose: true
            },
        ],
        resolve('react-hot-loader/babel'),
        resolve('@babel/plugin-syntax-dynamic-import'),
        // 按需加载，如：在转码时把对'autd'的引用变为对'antd/lib/button'具体模块的引用
        // in: import { Button } from 'antd', out: var _button = reuqire('antd/lib/button')
        [
            resolve('babel-plugin-import'),
            {
                'libraryName': 'antd',
                'style': true,
            }
        ]
    ]

    return {
        presets: [
            // include: [plugin-syntax-jsx, plugin-transform-react-jsx, plugin-transform-react-display-name]
            resolve('@babel/preset-react'),
            [
                // 根据目标环境选择不支持的新特性来转译
                resolve('@babel/preset-env'),
                {
                    modules,
                    // 目标环境: string | Array<string> | { [string]: string }, defaults to {}
                    targets: {
                        browsers: [
                            'last 2 versions',
                            'Firefox ESR',
                            '> 1%',
                            'ie >= 9',
                            'iOS >= 8',
                            'Android >= 4',
                        ],
                    },
                },
            ],
        ],
        plugins
    }
}