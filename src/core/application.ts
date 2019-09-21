// config
import SEM from "./config/semantic";
import API from "./config/api";
import URL from "./config/url";
import ROUTE from "./config/route";
import CONFIG from "./config/config";
import ICONS from "./config/icons";
import * as ENUM from "./config/enum";

import utils from "./utils";
import Events from "./events";
import LANG_CN from "./lang/zh_CN";

import File from "./class/File";
import Upload from "./class/Upload";

class Application {
    public SEM: object;
    public LN: object;
    public config: object;
    public file: any;
    public upload: any;
    public icon: object;
    public ENUM: object;

    public utils: object;
    public events: Events;

    public constructor() {
        this.SEM = SEM;
        this.LN = LANG_CN;
        this.config = CONFIG;
        this.utils = utils;
        this.events = new Events();
        this.file = new File();
        this.upload = new Upload();
        this.icon = ICONS;
        this.ENUM = ENUM;
    }
    // 生成Api
    public api(name: string, params: any): string {
        return (API as any)[name](params);
    }
    // 生成Uri
    public url(name: string, params: any): string {
        return (URL as any)[name](params);
    }
    // 生成Route
    public route(name: string, params: any): string {
        return (ROUTE as any)[name](params);
    }
    // 生成Asset Uri
    public asset(file: string): string {
        return `${(this.config as any).assetPath}${file}`;
    }
}

const application = new Application();
(global as any).$$ = application;
export default application;
export { Application };
