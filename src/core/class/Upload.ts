import axios from "../axios";
import utils from "../utils";

export default class UploadProcessor {
    //文件，读取进度回调函数
    public uploadPolicy(
        url: string,
        name: string,
        file: any,
        params: any,
        key: string,
        uploadProgress: any,
    ) {
        return new Promise((resolve, reject) => {
            const cancelToken = (axios as any).rawAxios.CancelToken.source();
            axios
                .get(url, {
                    params: params || {},
                })
                .then(res => {
                    const formData = new FormData();
                    const {
                        accessid,
                        callback,
                        dir,
                        host,
                        policy,
                        signature,
                    } = (res as any).info;

                    formData.append("name", name);
                    formData.append("key", dir + key);
                    formData.append("policy", policy);
                    formData.append("OSSAccessKeyId", accessid);
                    formData.append("success_action_status", "200");
                    formData.append("callback", callback);
                    formData.append("signature", signature);
                    formData.append("file", file);
                    axios
                        .post(utils.adaptResourceUrl(host), formData, {
                            onUploadProgress: e => {
                                uploadProgress &&
                                    typeof uploadProgress === "function" &&
                                    uploadProgress(e, cancelToken);
                            },
                            cancelToken: cancelToken.token,
                        })
                        .then(res => {
                            resolve(res);
                        })
                        .catch(err => {
                            reject(err);
                        });
                })
                .catch(err => {
                    reject(err);
                });
        });
    }
}
