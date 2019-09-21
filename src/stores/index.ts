import { observable as o, action as a } from "mobx";
import { message } from "antd";

interface Store {
    [key: string]: any;
}

class Store {


    @o
    count: number = 0;

    constructor() {
        // 注册store
        $$.events.method("store", () => this);

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
const insStore = new Store();
export default Store;
export { Store };
