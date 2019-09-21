import { History } from "history";
import XmlToJson from "core/class/XmlToJson";

export const findStr = (str: string, cha: string, num: number) => {
    const times = num === 0 ? 1 : num;
    let x = str.indexOf(cha);
    for (let i = 0; i < times - 1; i++) {
        x = str.indexOf(cha, x + 1);
    }
    return x;
};

export const createGuid = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        const r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export const checkHistoryPush = (history: History, url: string) => {
    if (history && history.location && history.location.pathname !== url) {
        history.push(url);
    }
};

interface objectType {
    [props: string]: any;
}

export const objectToQuery = (map: objectType) => {
    const enc = encodeURIComponent,
        pairs = [];
    for (const name in map) {
        const value = map[name];
        const assign = enc(name) + "=";
        if (value instanceof Array) {
            for (let i = 0, l = value.length; i < l; ++i) {
                pairs.push(assign + enc(value[i]));
            }
        } else {
            pairs.push(assign + enc(value));
        }
    }
    return pairs.join("&"); // String
};

export const queryToObject = (/*String*/ str: string) => {
    const dec = decodeURIComponent,
        qp = str.split("&"),
        ret: objectType = {};
    let name, val;
    for (let i = 0, l = qp.length, item; i < l; ++i) {
        item = qp[i];
        if (item.length) {
            const s = item.indexOf("=");
            if (s < 0) {
                name = dec(item);
                val = "";
            } else {
                name = dec(item.slice(0, s));
                val = dec(item.slice(s + 1));
            }
            if (typeof ret[name] === "string") {
                // inline'd type check
                ret[name] = [ret[name]];
            }

            if (ret[name] instanceof Array) {
                ret[name].push(val);
            } else {
                ret[name] = val;
            }
        }
    }
    return ret; // Object
};

export const converSize = (limit: number) => {
    let size = "";
    if (limit < 0.1 * 1024) {
        //如果小于0.1KB转化成B
        size = limit.toFixed(2) + "B";
    } else if (limit < 0.1 * 1024 * 1024) {
        //如果小于0.1MB转化成KB
        size = (limit / 1024).toFixed(2) + "KB";
    } else if (limit < 0.1 * 1024 * 1024 * 1024) {
        //如果小于0.1GB转化成MB
        size = (limit / (1024 * 1024)).toFixed(2) + "MB";
    } else {
        //其他转化成GB
        size = (limit / (1024 * 1024 * 1024)).toFixed(2) + "GB";
    }
    const sizeStr = size + "";
    const len = sizeStr.indexOf(".");
    const dec = sizeStr.substr(len + 1, 2);
    if (dec === "00") {
        //当小数点后为00时 去掉小数部分
        return sizeStr.substring(0, len) + sizeStr.substr(len + 3, 2);
    }
    return sizeStr;
};

// 时间戳转时间，可根据layout定义格式
// timestamp 13位时间戳，layout 定义格式，参数如{layout: "y-M-d h-m-s"}，y年M月d日 h时m分s秒，-分隔可自定义
export const timestampToTime = (timestamp: number, layout = "y-M-d h-m-s") => {
    const sup = (n: number) => {
        return n < 10 ? "0" + n : n;
    }; // 单位数前补0
    const date = new Date(timestamp);
    const y = date.getFullYear();
    const M = sup(date.getMonth() + 1);
    const d = sup(date.getDate());
    const h = sup(date.getHours());
    const m = sup(date.getMinutes());
    const s = sup(date.getSeconds());
    const result = layout
        .replace(/y/g, y)
        .replace(/M/g, M)
        .replace(/d/g, d)
        .replace(/h/g, h)
        .replace(/m/g, m)
        .replace(/s/g, s);
    return result;
};

export const xmlToJson: XmlToJson = new XmlToJson();
