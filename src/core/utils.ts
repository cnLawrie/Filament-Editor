import { transform, isEqual, isObject } from "lodash";

declare const global: any;

export default {
    divImg(img: string) {
        return {
            backgroundImage: `url(${img})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
        };
    },
    tween: {
        parseToObject(object: any) {
            const _object = {} as any;
            Object.keys(object).forEach(key => {
                if (object[key] instanceof Array) {
                    // 数组的话
                    for (let index = 0; index < object[key].length; index++) {
                        _object[`${key}_${index}`] = object[key][index];
                    }
                } else {
                    _object[key] = object[key];
                }
            });

            return _object;
        },
        parseToArray(object: any) {
            const orientate = (
                object: any,
                key: string,
                suffix: any,
                value: any,
            ) => {
                // 存在
                if (object[key]) {
                    object[key][suffix] = value;
                } else {
                    object[key] = [];
                    object[key][suffix] = value;
                }
            };
            const _object = {} as any;
            Object.keys(object).forEach(key => {
                // 存在分割情况
                if (key.split("_").length === 2) {
                    const prefix = key.split("_")[0];
                    const suffix = key.split("_")[1];
                    // 是一般变量情况
                    orientate(_object, prefix, Number(suffix), object[key]);
                } else {
                    _object[key] = object[key];
                }
            });

            return _object;
        },
    },
    rgb: {
        array2hex(arr: any) {
            const r = parseInt(arr[0]);
            const g = parseInt(arr[1]);
            const b = parseInt(arr[2]);
            const hex =
                "#" +
                ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            return hex.toUpperCase();
        },
        array2rgb(arr: any) {
            if (arr.length === 3) {
                return { r: arr[0], g: arr[1], b: arr[2] };
            } else {
                return { r: arr[0], g: arr[1], b: arr[2], a: arr[3] };
            }
        },
    },

    platform() {
        const platform = {
            desktop: false,
            mobile: false,
            ios: false,
            android: false,
            windows: false,
            cocoonjs: false,
            xbox: false,
            gamepads: false,
            touch: false,
            workers: false,
        };
        const ua = navigator.userAgent;
        if (/(windows|mac os|linux|cros)/i.test(ua)) {
            platform.desktop = true;
        }
        if (/xbox/i.test(ua)) {
            platform.xbox = true;
        }
        if (/(windows phone|iemobile|wpdesktop)/i.test(ua)) {
            platform.desktop = false;
            platform.mobile = true;
            platform.windows = true;
        } else {
            if (/android/i.test(ua)) {
                platform.desktop = false;
                platform.mobile = true;
                platform.android = true;
            } else {
                if (/ip([ao]d|hone)/i.test(ua)) {
                    platform.desktop = false;
                    platform.mobile = true;
                    platform.ios = true;
                }
            }
        }
        if ((navigator as any).isCocoonJS) {
            platform.cocoonjs = true;
        }
        platform.touch =
            "ontouchstart" in window ||
            ("maxTouchPoints" in navigator && navigator.maxTouchPoints > 0);
        platform.gamepads = "getGamepads" in navigator;
        platform.workers = typeof Worker !== "undefined";
        return platform;
    },

    difference(object: any, base: any) {
        function changes(object: any, base: any) {
            return transform(object, function(
                result: any,
                value: object,
                key: string,
            ) {
                if (!isEqual(value, base[key])) {
                    result[key] =
                        isObject(value) && isObject(base[key])
                            ? changes(value, base[key])
                            : value;
                }
            });
        }
        return changes(object, base);
    },
    differenceMaterial(diffMaterial: any, baseMaterial: any) {
        // Object.keys(baseMaterial).forEach(filed => {
        //     if (isEqual(diffMaterial[filed], baseMaterial[filed])) {
        //         delete diffMaterial[filed];
        //     }
        // });
        // if (diffMaterial.bumpiness !== undefined) {
        //     diffMaterial.bumpMapFactor = diffMaterial.bumpiness;
        //     delete diffMaterial.bumpiness;
        // }
        // return diffMaterial;
        Object.keys(baseMaterial).forEach(field => {
            let data1 = diffMaterial[field];
            let data2 = baseMaterial[field];
            if (data1 !== undefined && data2 !== undefined) {
                if (data1 instanceof Array) {
                    // 所有的颜色不需要a
                    if (data2.length === 4) {
                        data2 = data2.slice(0, 3);
                    }
                    data1 = data1.toString();
                    data2 = data2.toString();
                } else if (data1 instanceof Object) {
                    data1 = JSON.stringify(data1);
                    data2 = JSON.stringify(data2);
                }
                if (data1 === data2) {
                    delete diffMaterial[field];
                }
            }
        });
        return diffMaterial;
    },
    guid() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(
            c,
        ) {
            const r = (Math.random() * 16) | 0,
                v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    },

    getQueryString: (name: string) => {
        const reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
        let r = window.location.search.substr(1).match(reg); //获取url中"?"符后的字符串并正则匹配
        let context = "";
        if (r !== null) {
            context = r[2];
        }
        (reg as any) = null;
        r = null;
        return context === null || context === "" || context === "undefined"
            ? ""
            : context;

        // var query = window.location.search.substring(1);
        // var vars = query.split("&");
        // for (var i = 0; i < vars.length; i++) {
        //     var pair = vars[i].split("=");
        //     if (pair[0] === name) {
        //         return pair[1];
        //     }
        // }
        // return null;
    },

    getCookie: (cName: string) => {
        if (global.document && global.document.cookie.length > 0) {
            let cStart = global.document.cookie.indexOf(cName + "=");
            if (cStart !== -1) {
                cStart = cStart + cName.length + 1;
                let cEnd = global.document.cookie.indexOf(";", cStart);
                if (cEnd === -1) {
                    cEnd = global.document.cookie.length;
                }
                return unescape(global.document.cookie.substring(cStart, cEnd));
            }
        }
        return "";
    },
    dataURLtoBlob: (dataurl: string) => {
        const arr: string[] = dataurl.split(","),
            mime = arr || (arr[0] as any).match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime } as any);
    },

    adaptResourceUrl(url: string) {
        if (
            !!url &&
            url.indexOf("data:") === -1 &&
            url.indexOf("blob:") === -1
        ) {
            if (url.indexOf("http://") === 0) {
                url = url.substring(5);
            }
            if (url.indexOf("https://") === 0) {
                url = url.substring(6);
            }
            if (url.indexOf("//") === -1 || url.indexOf("//") !== 0) {
                url = "//" + url;
            }
        }
        return url;
    },
    adaptOssImageUrl(url: string, options: any) {
        url = this.adaptResourceUrl(url);
        if (url.indexOf("//") === 0 && options) {
            const split = url.indexOf("?") !== -1 ? `&` : `?`;
            let resize = "resize";
            if (options.width) {
                resize += `,w_${options.width || 128}`;
            }
            if (options.height) {
                resize += `,h_${options.height || 128}`;
            }
            url = `${url}${split}x-oss-process=image/${resize}/quality,Q_100`;
        }
        return url;
    },
    colorto255(color: any) {
        return color.map((v: number, i: number) =>
            i === 3 ? v : parseInt(v * 255 + ""),
        );
    },

    colorto1(color: any) {
        return color.map((v: number, i: number) => (i === 3 ? v : v / 255));
    },
};
