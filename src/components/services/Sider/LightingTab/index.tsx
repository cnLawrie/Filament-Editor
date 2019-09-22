import React, { useRef } from "react";
import { Row, Col, Collapse, Tooltip, Modal, Input, Divider } from "antd";
import styles from "./index.less";
import { observer } from "mobx-react-lite";
import { useEditorStore, useLightningStore } from "hooks/useStores";
import ReSlider from "widgets/ReSlider";
import { tabType, LightType } from "core/config/enum";
import ReColorPicker from "widgets/ReColorPicker";
import ReInput from "widgets/ReInput";
import ReSelect from "widgets/ReSelect";
import Button from "antd/es/button";
import ReIcon from "widgets/ReIcon";

interface LightningType {
    siderRef: any;
}

const LightningTab = observer((props: LightningType) => {
    const editorStore = useEditorStore();
    const lightningStore = useLightningStore();
    const LN = $$.LN["SIDER"];

    const renderSlider = (options: any) => {
        return (
            <ReSlider
                toFixed={options.toFixed || 2}
                sliderNameSpan={6}
                sliderMin={options.sliderMin}
                sliderMax={options.sliderMax}
                sliderName={options.sliderName}
                value={lightningStore[options.property]}
                onChange={(value: any) =>
                    lightningStore.updateLightning(options.property, value)
                }
                onComplete={(value: any) => {
                    console.log(value);
                    lightningStore.updateLightning(options.property, value);
                }}
            />
        );
    };

    const lightType = (type: LightType) => {
        switch (type) {
            case LightType.SUN:
                return "太阳光";
            case LightType.DIRECTIONAL:
                return "平行光";
            case LightType.POINT:
                return "点光";
            case LightType.FOCUSED_SPOT:
                return "解耦聚光灯";
            case LightType.SPOT:
                return "聚光灯";
        }
    };

    console.log(lightningStore.lightnings);

    return (
        <div className={styles.__LightningTab__}>
            <Row className={styles.lightningsRow}>
                {lightningStore.lightnings.map((light: any, index: number) => {
                    return (
                        <Col
                            key={index}
                            offset={1}
                            className={styles.lightning}
                        >
                            <span>{index}.</span>
                            <span className={styles.lightType}>
                                {lightType(light.type)}
                            </span>
                            <Col offset={2}>
                                方向: [{light.direction[0]},{light.direction[1]}
                                ,{light.direction[2]}]
                            </Col>
                            <Col offset={2}>光强: {light.intensity}</Col>
                            <ReIcon
                                className={styles.icon}
                                icon='rb-cha'
                                onClick={() => {
                                    lightningStore.deleteCustomLight(index);
                                }}
                            ></ReIcon>
                        </Col>
                    );
                })}
            </Row>
            <Row className={"customRow"}>
                <Col offset={1} span={8}>
                    光的种类(type)
                </Col>
                <Col offset={2} span={12}>
                    <ReSelect
                        value={lightningStore.type}
                        options={[
                            {
                                value: LightType.SUN,
                                label: "太阳光",
                            },
                            {
                                value: LightType.DIRECTIONAL,
                                label: "平行光",
                            },
                            {
                                value: LightType.POINT,
                                label: "点光",
                            },
                            {
                                value: LightType.FOCUSED_SPOT,
                                label: "解耦聚光灯",
                            },
                            {
                                value: LightType.SPOT,
                                label: "聚光灯",
                            },
                        ]}
                        onChange={(value: number) =>
                            lightningStore.updateLightning("type", value)
                        }
                    />
                </Col>
            </Row>
            <Row>
                <Col offset={1}>颜色(color)</Col>
                <Col offset={1}>sRGB色彩空间。默认值为白色[1, 1, 1]。</Col>
            </Row>
            <Row className={"customRow"}>
                <Col offset={1} span={16}>
                    <span className={styles.component}>
                        R: {lightningStore.color[0].toFixed(2)}
                    </span>
                    <span className={styles.component}>
                        G: {lightningStore.color[1].toFixed(2)}
                    </span>
                    <span className={styles.component}>
                        B: {lightningStore.color[2].toFixed(2)}
                    </span>
                </Col>
                <Col span={4}>
                    <ReColorPicker
                        color={lightningStore.color.map(
                            (v: number, i: number) => (i === 3 ? v : v * 255),
                        )}
                        onChange={(color: number[], complete: boolean) =>
                            lightningStore.updateLightning(
                                "color",
                                color.map((v: number, i: number) =>
                                    i === 3 ? v : v / 255,
                                ),
                            )
                        }
                        onCancel={() => {
                            console.log("cancel");
                        }}
                    />
                </Col>
            </Row>
            <Divider />
            <Row>
                <Col offset={1}>方向(direction)</Col>
            </Row>
            <Row className={"customRow"}>
                <Col offset={1} span={6}>
                    <ReInput
                        className={styles.input}
                        type='number'
                        value={lightningStore.direction[0]}
                        onComplete={(value: number) => {
                            const arr = lightningStore.direction;
                            arr[0] = value;
                            lightningStore.updateLightning("direction", arr);
                        }}
                    />
                </Col>
                <Col span={6}>
                    <ReInput
                        className={styles.input}
                        value={lightningStore.direction[1]}
                        type='number'
                        onComplete={(value: number) => {
                            const arr = lightningStore.direction;
                            arr[1] = value;
                            lightningStore.updateLightning("direction", arr);
                        }}
                    />
                </Col>
                <Col span={6}>
                    <ReInput
                        className={styles.input}
                        value={lightningStore.direction[2]}
                        type='number'
                        onComplete={(value: number) => {
                            const arr = lightningStore.direction;
                            arr[2] = value;
                            lightningStore.updateLightning("direction", arr);
                        }}
                    />
                </Col>
            </Row>
            <Divider />
            <Row>
                <Col offset={1}>衰减距离(falloff)</Col>
                <Col offset={1}>
                    设置点光源和聚光灯的衰减距离,单位是米，默认1米。
                </Col>
                <Col offset={1}>衰减距离定义了这个光源的影响范围的大小。</Col>
            </Row>
            <Row className={"customRow"}>
                {renderSlider({
                    sliderName: "衰减距离",
                    sliderMin: 1,
                    sliderMax: 100,
                    property: "falloff",
                })}
            </Row>
            <Divider />
            <Row>
                <Col offset={1}>光强(intensity)</Col>
                <Col offset={1}>对于平行光,单位是勒克司度(lux)。</Col>
                <Col offset={1}>对于点光和聚光灯,单位是流明(lumen)</Col>
            </Row>
            <Row className={"customRow"}>
                {renderSlider({
                    sliderName: "光强",
                    sliderMin: 10,
                    sliderMax: 100000,
                    property: "intensity",
                    toFixed: 0,
                })}
            </Row>
            <Divider />
            <Row>
                <Col offset={1}>位置(position)</Col>
                <Col offset={1}>初始世界坐标</Col>
            </Row>
            <Row className={"customRow"}>
                <Col offset={1} span={6}>
                    <ReInput
                        className={styles.input}
                        type='number'
                        value={lightningStore.position[0]}
                        onComplete={(value: number) => {
                            const arr = lightningStore.position;
                            arr[0] = value;
                            lightningStore.updateLightning("position", arr);
                        }}
                    />
                </Col>
                <Col span={6}>
                    <ReInput
                        className={styles.input}
                        type='number'
                        value={lightningStore.position[1]}
                        onComplete={(value: number) => {
                            const arr = lightningStore.position;
                            arr[1] = value;
                            lightningStore.updateLightning("position", arr);
                        }}
                    />
                </Col>
                <Col span={6}>
                    <ReInput
                        className={styles.input}
                        type='number'
                        value={lightningStore.position[2]}
                        onComplete={(value: number) => {
                            const arr = lightningStore.position;
                            arr[2] = value;
                            lightningStore.updateLightning("position", arr);
                        }}
                    />
                </Col>
            </Row>
            <Divider />
            <Row>
                <Col offset={1}>太阳角半径(sunAngularRadius)</Col>
                <Col offset={1}>单位度，范围0.25-20</Col>
            </Row>
            <Row className={"customRow"}>
                {renderSlider({
                    sliderName: "太阳角半径",
                    sliderMin: 0.25,
                    sliderMax: 20,
                    property: "sunAngularRadius",
                })}
            </Row>
            <Divider />
            <Row>
                <Col offset={1}>日晕衰减(sunHaloFalloff)</Col>
            </Row>
            <Row className={"customRow"}>
                {renderSlider({
                    sliderName: "日晕衰减",
                    sliderMin: 1,
                    sliderMax: 1000,
                    property: "sunHaloFalloff",
                })}
            </Row>
            <Divider />
            <Row>
                <Col offset={1}>日晕尺寸(sunHaloSize)</Col>
            </Row>
            <Row className={"customRow"}>
                {renderSlider({
                    sliderName: "日晕尺寸",
                    sliderMin: 1,
                    sliderMax: 100,
                    property: "sunHaloSize",
                })}
            </Row>
            <Row className={styles.buttonRow}>
                <Button
                    className={styles.button}
                    onClick={() => {
                        lightningStore.addCustomLight();
                        props.siderRef.current.scrollTo(0, 0);
                    }}
                >
                    添加光照
                </Button>
            </Row>
        </div>
    );
});

export default LightningTab;
