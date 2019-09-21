import { observable as o, action as a } from "mobx";
import { message } from "antd";
import User from "./user";
import Tags from "./tags";
import Team from "./team";
import Upload from "./upload";
import Content from "./content";
import Transmission from "./transmission";
import Detail from "./detail";
import Modal from "./modal";
import Jobs from "./jobs";
import System from "./system";
import Search from "./search";

interface CmsStore {
    [key: string]: any;
}

class CmsStore {
    user: User | null = null;
    tags: Tags | null = null;
    team: Team | null = null;
    upload: Upload | null = null;
    content: Content | null = null;
    detail: Detail | null = null;
    modal: Modal | null = null;
    jobs: Jobs | null = null;
    system: System | null = null;
    transmission: Transmission | null = null;

    @o
    count: number = 0;

    constructor() {
        // 注册store
        $$.events.method("store", () => this);
        // 用户信息管理
        this.user = new User();
        // 标签管理
        this.tags = new Tags();
        // 团队空间管理
        this.team = new Team();
        // 上传文件管理类
        this.upload = new Upload();
        // 内容管理
        this.content = new Content();
        // 详情管理
        this.detail = new Detail();
        this.modal = new Modal();
        this.jobs = new Jobs();
        this.system = new System();
        this.search = new Search();
        this.transmission = new Transmission();

        this.initialize();
    }

    initialize() {
        message.config({
            top: 24,
            duration: 2,
            maxCount: 5,
        });
    }

    @a
    update(field: any, value: any) {
        if (field instanceof Object) {
            Object.keys(field).forEach((key: string) => {
                this.update(key, field[key]);
            });
        } else {
            this[field] = value;
        }
    }
}
const cmsStore = new CmsStore();
export default cmsStore;
export { CmsStore };
