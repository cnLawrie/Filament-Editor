const path = require('path')

// 运行 node 命令时所在的文件夹的绝对路径
const cwd = process.cwd()

function getProjectPath(...filePath) {
    return path.join(cwd, ...filePath)
}

function resolve(module) {
    return require.resolve(module)
}

let injected = false
function injectRequire() {
    if (injected) return

    const Module = require('module')

    const originRequire = Module.prototype.require

    Module.prototype.require = function (...args) {
        const moduleName = args[0]

        try {
            return originRequire.apply(this, args)
        } catch (err) {
            const newArgs = [...args]
            if (moduleName[0] !== '/') {
                newArgs[0] = getProjectPath('node_modules', moduleName)
            }
            return originRequire.apply(this, newArgs)
        }
    }

    injected = true
}

module.exports = {
    getProjectPath,
    resolve,
    injectRequire,
}

