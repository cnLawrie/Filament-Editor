import React, { Component } from "react";
import styles from "./index.less";
import PropTypes from "prop-types";
import { Row, Col, Slider } from "antd";
import ReInput from "widgets/ReInput";

interface propTypes {
    value: number;
    toFixed?: number;
    sliderMin: number;
    sliderMax: number;
    sliderName: string;
    infinityMax?: boolean;
    sliderNameSpan?: number;
    onChange: any;
    onComplete: any;
}
export default class ReSlider extends React.Component<propTypes> {
    state = {
        sliderMax: 0,
    };

    constructor(props: propTypes) {
        super(props);
    }

    componentWillMount() {
        const { infinityMax, sliderMax, value } = this.props;
        if (infinityMax) {
            this.setState({
                sliderMax:
                    value === 0
                        ? sliderMax !== undefined
                            ? sliderMax
                            : 10
                        : value * 2,
            });
        } else {
            this.setState({
                sliderMax: sliderMax !== undefined ? sliderMax : value * 2,
            });
        }
    }

    componentWillReceiveProps(nextProps: propTypes) {
        const { infinityMax, sliderMax } = nextProps;
        if (!infinityMax) {
            this.setState({
                sliderMax,
            });
        }
    }

    render() {
        const {
            sliderName,
            sliderMin,
            sliderMax,
            sliderNameSpan,
            infinityMax,
            toFixed,
            value,
        } = this.props;

        return (
            <Row className={"customRow"}>
                <Col
                    span={sliderNameSpan ? sliderNameSpan : 5}
                    offset={1}
                    className={"customLabel"}
                >
                    {sliderName}
                </Col>
                <Col
                    span={sliderNameSpan ? 17 - sliderNameSpan : 12}
                    className={"customLabel"}
                >
                    <Slider
                        className={styles.slider}
                        min={sliderMin}
                        max={this.state.sliderMax}
                        step={1 / Math.pow(10, toFixed)}
                        value={value}
                        onChange={this.onSliderChange}
                        onAfterChange={this.onSliderAfterChange}
                    />
                </Col>
                <Col offset={1} span={4}>
                    <ReInput
                        className={styles.input}
                        type='number'
                        size='small'
                        min={sliderMin}
                        max={sliderMax}
                        value={value}
                        onComplete={this.onComplete}
                    />
                </Col>
            </Row>
        );
    }

    onSliderChange = (value: any) => {
        const { onChange } = this.props;
        onChange && onChange(value);
    };

    onSliderAfterChange = (value: any) => {
        const { onComplete } = this.props;
        onComplete && onComplete(value);
    };

    onComplete = (value: any) => {
        const { onComplete, infinityMax } = this.props;
        if (infinityMax) {
            this.setState({
                sliderMax: value * 2,
            });
        }
        onComplete && onComplete(value);
    };
}
