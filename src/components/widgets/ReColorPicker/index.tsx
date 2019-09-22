import React from "react";
import PhotoshopPicker from "../ReColorPhotoShop";
import { Popover } from "antd";
import styles from "./index.less";
// import tinycolor from "tinycolor2";

interface propTypes {
    color: number[];
    onChange: (color: any, complete: boolean) => void;
    onCancel: () => void;
}

interface stateTypes {
    visible: boolean;
    color: any;
}

export default class ReColorPicker extends React.Component<propTypes> {
    rgba: any;
    state: stateTypes;
    color: any;

    constructor(props) {
        super(props);

        // 存储变化值
        this.state = {
            visible: false,
            color: props.color,
        };
    }

    render() {
        const { color } = this.props;
        return (
            <Popover
                placement='left'
                arrowPointAtCenter={true}
                autoAdjustOverflow={true}
                trigger='hover'
                overlayClassName={styles.popover}
                visible={this.state.visible}
                content={
                    this.state.visible ? (
                        <PhotoshopPicker
                            // hex={$$.utils.rgb.array2hex(this.props.color)}
                            color={$$.utils.rgb.array2hex(this.props.color)}
                            onChange={(data: any) => this.onChange(data)}
                            onAccept={() => this.switchVisible(false, true)}
                            onCancel={() => this.switchVisible(false)}
                            className={styles.sketch_picker}
                        />
                    ) : null
                }
                onVisibleChange={visible => this.switchVisible(visible)}
            >
                <div className={styles.swatch}>
                    <div
                        className={styles.color}
                        style={{
                            backgroundColor:
                                color.length === 4
                                    ? `rgba(${color})`
                                    : `rgb(${color})`,
                        }}
                    />
                </div>
            </Popover>
        );
    }

    switchVisible(visible: boolean, complete = false) {
        const { onCancel } = this.props;
        // 关闭，恢复颜色
        if (!visible) {
            // 完成
            if (complete && this.rgba) {
                this.onChangeComplete(this.colorToArray(this.rgba), true);
            } else {
                this.onChangeComplete(this.color, false);
            }
            onCancel && typeof onCancel === "function" && onCancel();
        } else {
            this.color = this.props.color;
        }
        this.setState(
            Object.assign({}, this.state, {
                visible,
            }),
        );
    }

    onChange(data: any) {
        this.rgba = data.rgb;
        this.onChangeComplete(this.colorToArray(this.rgba), false);
    }

    onChangeComplete(color: any, complete: any) {
        this.props.onChange && this.props.onChange(color, complete);
    }

    colorToArray(rgba: any) {
        return [rgba.r, rgba.g, rgba.b];
    }
}
