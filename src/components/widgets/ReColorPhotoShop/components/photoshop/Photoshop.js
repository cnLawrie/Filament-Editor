import React from "react";
import PropTypes from "prop-types";
import classnames from "classnames";
import styles from "./Photoshop.less";

import { ColorWrap, Saturation, Hue } from "../common";
import PhotoshopFields from "./PhotoshopFields";
import PhotoshopPointerCircle from "./PhotoshopPointerCircle";
import PhotoshopPointer from "./PhotoshopPointer";
import PhotoshopButton from "./PhotoshopButton";
import PhotoshopPreviews from "./PhotoshopPreviews";

export class Photoshop extends React.Component {
    constructor(props) {
        super();

        this.state = {
            currentColor: props.hex
        };
    }

    render() {
        const { className = "" } = this.props;
        return (
            <div
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
                onTouchEnd={e => e.stopPropagation()}
                onWheel={e => e.nativeEvent.stopImmediatePropagation()}
                className={classnames({
                    [styles.picker]: true,
                    "photoshop-picker": true,
                    [className]: !!className
                })}
            >
                <div
                    className={classnames({
                        [styles.body]: true,
                        "flexbox-fix": true
                    })}
                >
                    <div className={styles.saturation}>
                        <Saturation
                            hsl={this.props.hsl}
                            hsv={this.props.hsv}
                            pointer={PhotoshopPointerCircle}
                            onChange={this.props.onChange}
                        />
                    </div>
                    <div className={styles.hue}>
                        <Hue
                            direction="vertical"
                            hsl={this.props.hsl}
                            pointer={PhotoshopPointer}
                            onChange={this.props.onChange}
                        />
                    </div>
                    <div className={styles.controls}>
                        <div
                            className={classnames({
                                [styles.top]: true,
                                "flexbox-fix": true
                            })}
                        >
                            <div className={styles.previews}>
                                <PhotoshopPreviews rgb={this.props.rgb} currentColor={this.state.currentColor} />
                            </div>
                            <div className={styles.actions}>
                                <PhotoshopButton
                                    className={styles.accept}
                                    label="确定"
                                    onClick={this.props.onAccept}
                                    active
                                />
                                <PhotoshopButton className={styles.cancel} label="取消" onClick={this.props.onCancel} />
                                <PhotoshopFields
                                    onChange={this.props.onChange}
                                    rgb={this.props.rgb}
                                    hsv={this.props.hsv}
                                    hex={this.props.hex}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

Photoshop.propTypes = {
    header: PropTypes.string
};

Photoshop.defaultProps = {
    header: "Color Picker"
};

export default ColorWrap(Photoshop);
