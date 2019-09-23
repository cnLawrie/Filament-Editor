const program = require("commander")
const xlsx = require("node-xlsx")
const fs = require('fs')
const path = require('path')

const DIRECTORY = '目录结构', COMOPNENT = '组件', REMARK = '备注'

program
    .version('0.1.0')
    .option('-s, --source [value]', 'specify the source file')
    .option('-d, --directory [value]', 'specify the target directory')
    .option('-t, --template [value]', 'specify the directory of template files')
    .parse(process.argv);

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const root = process.cwd()
const src = program.source, dir = program.directory
const templateDir = program.template
    ? path.resolve(root, program.template)
    : path.resolve(root, "./build/template")
if (src && dir) {
    const workSheetsFromBuffer = xlsx.parse(
        fs.readFileSync(`${path.resolve(root, src)}.xlsx`)
    )
    const data = workSheetsFromBuffer[0].data
    const columns = data[0]
    let pathIndex, componentIndex, remarkIndex
    columns.map((column, index) => {
        switch (column) {
            case DIRECTORY:
                pathIndex = index
                break
            case COMOPNENT:
                componentIndex = index
                break
            case REMARK:
                remarkIndex = index
                break
        }
    })
    let allComponentPath = {}
    for (let i = 1; i < data.length; i++) {
        const row = data[i]
        const subPath = `${row[pathIndex]}/${row[componentIndex]}`
        allComponentPath[subPath] = true
        const dirPath = path.resolve(root, `${dir}/${subPath}`)
        if (!fs.existsSync(dirPath)) {
            mkdirsSync(dirPath)
            fs.readdirSync(templateDir).forEach(function (file, index) {
                copyIt(path.resolve(templateDir, file), path.resolve(dirPath, file))
                // if (file.match(/ts/)) {
                    
                    replaceIt(path.resolve(dirPath, file), row[componentIndex], row[remarkIndex])
                    // }
                })
                console.log(`${subPath} (备注:${row[remarkIndex] || '无'}) 生成成功！`)
            } else {
                console.log(`${subPath} 已经存在，自动跳过。`)
            }
        }
    console.log("==================================");
    console.log("==================================");
    console.log("==================================");
    checkIt(path.resolve(root, dir), allComponentPath)
} else {
    console.warn('warning: -s and -d are necessnary options!')
}

// 递归同步创建
function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        }
    }
}

function copyIt(from, to) {
    fs.createReadStream(from).pipe(fs.createWriteStream(to));
}

async function replaceIt(filePath, className = 'Index', remark = '') {
    await delay(500)    
    fs.readFile(filePath, 'utf-8', function (err, file) {
        
        if (file) {
            let result = file
            if (className) {
                result = file.replace(/Index/g, className)
                result = result.replace(/ROOT/g, className)
                // console.log(result);
            }
            if (remark) {
                result = `// ${remark}\n${result}`
            }
            fs.writeFile(filePath, result, 'utf-8', function (err) {
                if (err) console.error(err)
            })
        }
    })
}

// 检查目录中是否存在xlsx中没有的组件
function checkIt(directory, allComponentPath) {
    if (directory.match(/less$/)) {
        return
    }
    if (fs.lstatSync(directory).isFile()) {
        let dirname = path.resolve(directory, '..').replace(path.resolve(root, dir) + '/', '')
        
        if (!allComponentPath[dirname]) {
            console.warn(`目录中的组件 ${dirname} 不存在于excel中`);
        } 
    } else if (fs.readdirSync(directory).length === 0) {
        let dirname = path.resolve(directory).replace(path.resolve(root, dir) + '/', '')
        if (!allComponentPath[dirname]) {
            console.warn(`目录中的组件 ${dirname} 不存在于excel中`);
        } 

    } else {
        fs.readdirSync(directory).forEach(function (file, index) {
            if (file !== '.DS_Store') {
                checkIt(path.resolve(directory, file), allComponentPath)
            }
        })
    }
}