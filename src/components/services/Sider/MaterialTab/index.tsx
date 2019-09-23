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
    return (
        <Collapse className={styles.__MaterialTab__}>
            <Panel header='颜色(baseColor)' key='baseColor'>
                <div>对于电介质而言，是它的漫反射颜色</div>
                <div>对于金属对象而言，是它的镜面颜色</div>
                <Row className={"customRow"}>
                    <Col offset={1} span={16}>
                        <span className={styles.component}>
                            R: {materialStore.baseColor[0].toFixed(2)}
                        </span>
                        <span className={styles.component}>
                            G: {materialStore.baseColor[1].toFixed(2)}
                        </span>
                        <span className={styles.component}>
                            B: {materialStore.baseColor[2].toFixed(2)}
                        </span>
                    </Col>
                    <Col span={4}>
                        <ReColorPicker
                            color={materialStore.baseColor.map(
                                (v: number, i: number) =>
                                    i === 3 ? v : v * 255,
                            )}
                            onChange={(color: number[], complete: boolean) =>
                                materialStore.updateMaterial(
                                    "baseColor",
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
            </Panel>
            <Panel header='金属性(metallic)' key='metallic'>
                <div>电介质(0), 导体(1)</div>
                <div>通常设为0或1</div>
                {renderSlider({
                    sliderName: "金属性",
                    sliderMin: 0,
                    sliderMax: 1,
                    property: "metallic",
                })}
            </Panel>
            <Panel
                header='粗糙度(roughness)或光泽度(glossiness)'
                key='roughness'
            >
                <div>光滑(0), 粗糙(1)</div>
                {renderSlider({
                    sliderName: "粗糙度",
                    sliderMin: 0,
                    sliderMax: 1,
                    property: "roughness",
                })}
            </Panel>
            <Panel header='电介质反射强度（reflectance)' key='reflectance'>
                <div>默认0.5, 即4%反射率</div>
                {renderSlider({
                    sliderName: "反射强度",
                    sliderMin: 0,
                    sliderMax: 1,
                    property: "reflectance",
                })}
            </Panel>
            <Panel header='透明涂层(clear coat)' key='clearCoat'>
                <div>通常设为0或1</div>
                {renderSlider({
                    sliderName: "透明涂层",
                    sliderMin: 0,
                    sliderMax: 1,
                    property: "clearCoat",
                })}
            </Panel>
            <Panel
                header='透明涂层粗糙度(clear coat roughness)'
                key='clearCoatRoughness'
            >
                <div>光滑(0), 粗糙(1)</div>
                {renderSlider({
                    sliderName: "透明涂层粗糙度",
                    sliderMin: 0,
                    sliderMax: 1,
                    property: "clearCoatRoughness",
                })}
            </Panel>
            <Panel header='各向异性(anisotropy)' key='anisotropy'>
                {renderSlider({
                    sliderName: "各向异性",
                    sliderMin: 0,
                    sliderMax: 1,
                    property: "anisotropy",
                })}
            </Panel>
            <Panel
                header='各向异性方向(anisotropyDirection)'
                key='anisotropyDirection'
            >
                <div>定义给定点的表面方向</div>
                <div>提供一组线性RGB值[0..1]，作为切线空间的一个方向向量</div>
                <Row className={"customRow"}>
                    <Col offset={1} span={16}>
                        <span className={styles.component}>
                            R: {materialStore.anisotropyDirection[0].toFixed(2)}
                        </span>
                        <span className={styles.component}>
                            G: {materialStore.anisotropyDirection[1].toFixed(2)}
                        </span>
                        <span className={styles.component}>
                            B: {materialStore.anisotropyDirection[2].toFixed(2)}
                        </span>
                    </Col>
                    <Col span={4}>
                        <ReColorPicker
                            color={materialStore.anisotropyDirection.map(
                                (v: number, i: number) =>
                                    i === 3 ? v : v * 255,
                            )}
                            onChange={(color: number[], complete: boolean) =>
                                materialStore.updateMaterial(
                                    "anisotropyDirection",
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
            </Panel>
            <Panel header='AO(ambientOcclusion)' key='ambientOcclusion'>
                <div>0(完全遮蔽),1(完全照射）</div>
                <div>
                    这个属性只会影响IBL，其他如平行光、点光源、聚光灯等无效
                </div>
                {renderSlider({
                    sliderName: "AO",
                    sliderMin: 0,
                    sliderMax: 1,
                    property: "ambientOcclusion",
                })}
            </Panel>
            <Panel header='法线(normal)' key='normal'>
                <div>定义给定点的法线，通常该属性取自于法线贴图</div>
                <div>提供一组线性RGB值[0..1]，作为切线空间的一个方向向量</div>
                <div>只影响基础层，不影响透明图层</div>
                <Row className={"customRow"}>
                    <Col offset={1} span={16}>
                        <span className={styles.component}>
                            R: {materialStore.normal[0].toFixed(2)}
                        </span>
                        <span className={styles.component}>
                            G: {materialStore.normal[1].toFixed(2)}
                        </span>
                        <span className={styles.component}>
                            B: {materialStore.normal[2].toFixed(2)}
                        </span>
                    </Col>
                    <Col span={4}>
                        <ReColorPicker
                            color={materialStore.normal.map(
                                (v: number, i: number) =>
                                    i === 3 ? v : v * 255,
                            )}
                            onChange={(color: number[], complete: boolean) =>
                                materialStore.updateMaterial(
                                    "normal",
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
            </Panel>
            <Panel
                header='透明图层法线(clear coat normal)'
                key='clearCoatNormal'
            >
                <Row className={"customRow"}>
                    <Col offset={1} span={16}>
                        <span className={styles.component}>
                            R: {materialStore.clearCoatNormal[0].toFixed(2)}
                        </span>
                        <span className={styles.component}>
                            G: {materialStore.clearCoatNormal[1].toFixed(2)}
                        </span>
                        <span className={styles.component}>
                            B: {materialStore.clearCoatNormal[2].toFixed(2)}
                        </span>
                    </Col>
                    <Col span={4}>
                        <ReColorPicker
                            color={materialStore.clearCoatNormal.map(
                                (v: number, i: number) =>
                                    i === 3 ? v : v * 255,
                            )}
                            onChange={(color: number[], complete: boolean) =>
                                materialStore.updateMaterial(
                                    "clearCoatNormal",
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
            </Panel>
            <Panel header='自发光(emissive)' key='emissive'>
                <div>额外的漫反射去模拟自发光表面(如：霓虹灯)。</div>
                <div>rgb=[0..1], a=[-n..n]</div>
                <Row className={"customRow"}>
                    <Col offset={1} span={16}>
                        <span className={styles.component}>
                            R: {materialStore.emissive[0].toFixed(2)}
                        </span>
                        <span className={styles.component}>
                            G: {materialStore.emissive[1].toFixed(2)}
                        </span>
                        <span className={styles.component}>
                            B: {materialStore.emissive[2].toFixed(2)}
                        </span>
                        <span className={styles.component}>
                            A: {materialStore.emissive[3].toFixed(2)}
                        </span>
                    </Col>
                    <Col span={4}>
                        <ReColorPicker
                            color={materialStore.emissive.map(
                                (v: number, i: number) =>
                                    i === 3 ? v : v * 255,
                            )}
                            onChange={(color: number[], complete: boolean) => {
                                if (color.length > 4) {
                                    return;
                                }

                                materialStore.updateMaterial(
                                    "emissive",
                                    color.length > 3
                                        ? color
                                        : color
                                            .map((v: number, i: number) =>
                                                i === 3 ? v : v / 255,
                                            )
                                            .concat([1]),
                                );
                            }}
                            onCancel={() => {
                                console.log("cancel");
                            }}
                        />
                    </Col>
                </Row>
            </Panel>
            <Panel header='postLightingColor' key='postLightingColor'>
                <div>postLightingColor用于在光照计算后修改表面颜色</div>
                <div>当alpha设为0时，该参数与emissive效果等同</div>
                <Row className={"customRow"}>
                    <Col offset={1} span={16}>
                        <span className={styles.component}>
                            R: {materialStore.postLightingColor[0].toFixed(2)}
                        </span>
                        <span className={styles.component}>
                            G: {materialStore.postLightingColor[1].toFixed(2)}
                        </span>
                        <span className={styles.component}>
                            B: {materialStore.postLightingColor[2].toFixed(2)}
                        </span>
                        <span className={styles.component}>
                            A: {materialStore.postLightingColor[3].toFixed(2)}
                        </span>
                    </Col>
                    <Col span={4}>
                        <ReColorPicker
                            color={materialStore.postLightingColor.map(
                                (v: number, i: number) =>
                                    i === 3 ? v : v * 255,
                            )}
                            onChange={(color: number[], complete: boolean) => {
                                if (color.length > 4) {
                                    return;
                                }
                                console.log(color);

                                materialStore.updateMaterial(
                                    "postLightingColor",
                                    color.length > 3
                                        ? color
                                        : color
                                            .map((v: number, i: number) =>
                                                i === 3 ? v : v / 255,
                                            )
                                            .concat([1]),
                                );
                            }}
                            onCancel={() => {
                                console.log("cancel");
                            }}
                        />
                    </Col>
                </Row>
            </Panel>
        </Collapse>
    );
});

export default MaterialTab;
