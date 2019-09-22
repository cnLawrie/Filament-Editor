import React, { useRef } from "react";
import styles from "./index.less";
import { useUIStore } from "hooks/useStores";
import { Tabs, Tooltip } from "antd";
import ReIcon from "widgets/ReIcon";
import { tabType } from "core/config/enum";
import MaterialTab from "./MaterialTab/index";
import LightningTab from "./LightingTab/index";
import { observer } from "mobx-react-lite";
const TabPane = Tabs.TabPane;

const Sider = observer(() => {
    const uiStore = useUIStore();
    const LN = $$.LN["SIDER"];
    const siderRef = useRef(null);

    return (
        <div className={styles.__Sider__} ref={siderRef}>
            <Tabs
                onTabClick={(key: string) => uiStore.onTabClick(key)}
                activeKey={uiStore.tab}
            >
                <TabPane
                    tab={
                        <Tooltip placement='top' title={LN.material}>
                            <span>
                                <ReIcon
                                    className={styles.icon}
                                    icon='rb-caizhi'
                                />
                            </span>
                        </Tooltip>
                    }
                    key={tabType.material + ""}
                >
                    <MaterialTab />
                </TabPane>
                <TabPane
                    tab={
                        <Tooltip placement='top' title={LN.lightning}>
                            <span>
                                <ReIcon
                                    className={styles.icon}
                                    icon='rb-dengguang'
                                />
                            </span>
                        </Tooltip>
                    }
                    key={tabType.lightning + ""}
                >
                    <LightningTab siderRef={siderRef} />
                </TabPane>
            </Tabs>
        </div>
    );
});

export default Sider;
