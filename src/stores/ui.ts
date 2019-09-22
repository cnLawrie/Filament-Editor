import { observable as o, action as a } from "mobx";
import { tabType } from "core/config/enum";

class UIStore {
    @o tab: string = tabType.material + "";

    constructor() {}

    onTabClick(key: tabType) {
        this.tab = key + "";
    }
}

export default UIStore;
