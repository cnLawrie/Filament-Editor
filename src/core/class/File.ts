import SparkMD5 from "spark-md5";

declare const $$: any;

export default class FileProcessor {
    public constructor() {}
    //文件，读取进度回调函数
    public readFileInfo(file: any, progress: any) {
        return new Promise((resolve, reject) => {
            if (file instanceof File) {
                const fileReader = new FileReader();
                const blobSlice =
                    (File.prototype as any).mozSlice ||
                    (File.prototype as any).webkitSlice ||
                    File.prototype.slice;
                const chunkSize = 2097152;
                const chunks = Math.ceil(file.size / chunkSize);
                let currentChunk = 0;
                const spark = new SparkMD5.ArrayBuffer();
                const loadNext = () => {
                    const start = currentChunk * chunkSize,
                        end =
                            start + chunkSize >= file.size
                                ? file.size
                                : start + chunkSize;
                    fileReader.readAsArrayBuffer(
                        blobSlice.call(file, start, end),
                    );
                };

                fileReader.onload = e => {
                    const chunkProgress = {
                        loaded: currentChunk + 1,
                        total: chunks,
                    };
                    progress &&
                        typeof progress === "function" &&
                        progress(chunkProgress);
                    //每块交由sparkMD5进行计算
                    if (e.target) {
                        spark.append((e.target as any).result);
                    }
                    currentChunk++;
                    //如果文件处理完成计算MD5，如果还有分片继续处理
                    if (currentChunk < chunks) {
                        loadNext();
                    } else {
                        const md5 = spark.end();
                        spark.destroy();
                        const ext: any = file.name.split(".").pop();
                        resolve({
                            lastModified: file.lastModified,
                            lastModifiedDate: (file as any).lastModifiedDate,
                            name: file.name.substring(
                                0,
                                file.name.lastIndexOf("."),
                            ),
                            fullName: file.name,
                            size: file.size,
                            type: file.type,
                            md5: md5,
                            file: file,
                            ext: ext.toLocaleLowerCase(),
                        });
                    }
                };
                fileReader.onerror = () => {
                    reject(fileReader.error);
                };
                loadNext();
            } else {
                reject();
            }
        });
    }
    //文件，读取进度回调函数
    public readDataUrl(dataUrl: string, progress: any) {
        return new Promise((resolve, reject) => {
            const date = new Date();
            const md5 = SparkMD5.hash(dataUrl);
            const blob = $$.utils.dataURLtoBlob(dataUrl);
            const ext = blob.type.split("/")[1];
            resolve({
                lastModified: Math.round((date as any) / 1000),
                lastModifiedDate: date,
                name: md5,
                fullName: md5 + "." + ext,
                size: dataUrl.length,
                type: blob.type,
                md5: md5,
                file: blob,
                ext: ext,
            });
        });
    }

    //文件，读取进度回调函数
    public readArrayBuffer(data: any, type: string) {
        return new Promise((resolve, reject) => {
            const spark = new SparkMD5.ArrayBuffer();
            //每块交由sparkMD5进行计算
            spark.append(data);
            const md5 = spark.end();
            spark.destroy();
            const blob = new Blob([data], { type: type });
            const date = new Date();
            const ext = blob.type.split("/")[1];
            resolve({
                lastModified: Math.round((date as any) / 1000),
                lastModifiedDate: date,
                name: md5,
                fullName: md5 + "." + ext,
                size: blob.size,
                type: blob.type,
                md5: md5,
                file: blob,
                ext: ext,
            });
        });
    }
}
