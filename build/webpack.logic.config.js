const path = require("path");
const lessToJs = require("less-vars-to-js");
const fs = require("fs");
const { getProjectPath } = require('./utils/projectHelper')
const childProcess = require("child_process");

module.exports = class Logic {
    // 受保护分支
    constructor(structure) {
        // 获取版本
        this.version = childProcess
            .execSync("git rev-parse --short HEAD")
            .toString()
            .replace(/\s+/, "")
        // this.version = 1

        this.rootDir = process.cwd()
        this.srcDir = getProjectPath("src")
        this.distDir = getProjectPath("dist")
        this.themer = lessToJs(fs.readFileSync(getProjectPath("src/less/themes/base.less"), "utf8"))
        // 开始构建
        if (structure) {
            var nodeEnv = process.env.NODE_ENV
            // webpack配置
            // webpack配置
            this.webpack = require(`${this.rootDir}/configs/webpack/${
                nodeEnv === "development" ? "development" : "production"
            }.js`)();
			this.webpack.version = this.version
			this.webpack.nodeEnv = nodeEnv;

            this.application = fs.readFileSync(`${this.rootDir}/configs/application/${nodeEnv}.js`, "utf8")
            if (this.application) {
                fs.writeFileSync(`${this.srcDir}/core/config/config.ts`, this.application, "utf8")
            } else {
                console.error("config undefined")
            }
        }
    }
};
