import React from "react";
import { Row, Col, Collapse, Tooltip, Modal, Input, Checkbox } from "antd";
import styles from "./index.less";
import { observer } from "mobx-react-lite";
import { useEditorStore, useMaterialStore } from "hooks/useStores";
import ReSlider from "widgets/ReSlider";
import { tabType } from "core/config/enum";
import ReColorPicker from "widgets/ReColorPicker";

const Panel = Collapse.Panel;

const MaterialTab = observer(() => {
    const editorStore = useEditorStore();
    const materialStore = useMaterialStore();
    const LN = $$.LN["SIDER"];
    console.log(materialStore.metallic);

    const renderSlider = (options: any) => {
        return (
            <ReSlider
                toFixed={2}
                sliderNameSpan={6}
                sliderMin={options.sliderMin}
                sliderMax={options.sliderMax}
                sliderName={options.sliderName}
                value={materialStore[options.property]}
                onChange={(value: any) =>
                    materialStore.updateMaterial(options.property, value)
                }
                onComplete={(value: any) => {
                    console.log(value);

                    materialStore.updateMaterial(options.property, value);
                }}
            />
        );
    };
    return <Collapse className={styles.__MaterialTab__}></Collapse>;
});

export default MaterialTab;
