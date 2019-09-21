import axios from "axios";
import config from "./config/config";
import { xmlToJson } from "core/utils/tool";
const axiosIns = axios.create({
    baseURL: `${config.apiHost}`,

    transformResponse: [
        data => {
            if (/<\?xml/.test(data)) {
                data = xmlToJson.parse(data);
            } else {
                data = JSON.parse(data);
            }
            return data;
        },
    ],
    // withCredentials: true
});

(axiosIns as any).rawAxios = axios;
axiosIns.interceptors.response.use(
    function(response) {
        //新格式
        if (
            response.data.code !== undefined &&
            response.data.message !== undefined
        ) {
            //失败
            if (response.data.code < 0) {
                $$.events.call("store:system:error:handler", response.data);
                return Promise.reject(response.data);
                //成功
            } else if (response.data.code > 0) {
                return response.data;
            }
        } else {
            //直接返回数据
            return response.data;
        }
    },
    function(error) {
        return Promise.reject(error);
    },
);

export default axiosIns;
