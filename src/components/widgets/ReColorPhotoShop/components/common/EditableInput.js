import React, { Component, PureComponent } from "react";
import reactCSS from "reactcss";

export class EditableInput extends (PureComponent || Component) {
    constructor(props) {
        super();

        this.state = {
            value: String(props.value).toUpperCase(),
            blurValue: String(props.value).toUpperCase()
        };
    }

    componentWillReceiveProps(nextProps) {
        const input = this.input;
        if (nextProps.value !== this.state.value) {
            if (input === document.activeElement) {
                this.setState({ blurValue: String(nextProps.value).toUpperCase() });
            } else {
                this.setState({
                    value: String(nextProps.value).toUpperCase(),
                    blurValue: !this.state.blurValue && String(nextProps.value).toUpperCase()
                });
            }
        }
    }

    componentWillUnmount() {
        this.unbindEventListeners();
    }

    handleBlur = e => {
        let value = e.target.value;

        value = this.props.label === "#" ? (value.length === 6 ? String(value).toUpperCase() : "000000") : value;

        this.setState({ value: value });

        if (this.props.label !== null) {
            this.props.onComplete && this.props.onComplete({ [this.props.label]: value }, e);
        } else {
            this.props.onComplete && this.props.onComplete(value, e);
        }
    };

    handleChange = e => {
        if (this.props.label !== null) {
            this.props.onChange && this.props.onChange({ [this.props.label]: e.target.value }, e);
        } else {
            this.props.onChange && this.props.onChange(e.target.value, e);
        }

        this.setState({ value: e.target.value });
    };

    handleKeyDown = e => {
        // In case `e.target.value` is a percentage remove the `%` character
        // and update accordingly with a percentage
        // https://github.com/casesandberg/react-color/issues/383
        let value = String(e.target.value);
        const isPercentage = value.indexOf("%") > -1;
        const number = Number(value.replace(/%/g, ""));
        if (!isNaN(number)) {
            const amount = this.props.arrowOffset || 1;

            // Up
            if (e.keyCode === 38) {
                if (this.props.label !== null) {
                    this.props.onChange && this.props.onChange({ [this.props.label]: number + amount }, e);
                } else {
                    this.props.onChange && this.props.onChange(number + amount, e);
                }

                if (isPercentage) {
                    this.setState({ value: `${number + amount}%` });
                } else {
                    this.setState({ value: number + amount });
                }
            }

            // Down
            if (e.keyCode === 40) {
                if (this.props.label !== null) {
                    this.props.onChange && this.props.onChange({ [this.props.label]: number - amount }, e);
                } else {
                    this.props.onChange && this.props.onChange(number - amount, e);
                }

                if (isPercentage) {
                    this.setState({ value: `${number - amount}%` });
                } else {
                    this.setState({ value: number - amount });
                }
            }

            if (e.keyCode === 13) {
                if (this.props.label !== null) {
                    this.props.onComplete && this.props.onComplete({ [this.props.label]: e.target.value }, e);
                } else {
                    this.props.onComplete && this.props.onComplete(e.target.value, e);
                }
            }
        } else {
            if (e.keyCode === 13) {
                value =
                    this.props.label === "#" ? (value.length === 6 ? String(value).toUpperCase() : "000000") : value;

                this.setState({ value: value });

                if (this.props.label !== null) {
                    this.props.onComplete && this.props.onComplete({ [this.props.label]: value }, e);
                } else {
                    this.props.onComplete && this.props.onComplete(value, e);
                }
            }
        }
    };

    handleDrag = e => {
        if (this.props.dragLabel) {
            const newValue = Math.round(this.props.value + e.movementX);
            if (newValue >= 0 && newValue <= this.props.dragMax) {
                this.props.onChange && this.props.onChange({ [this.props.label]: newValue }, e);
            }
        }
    };

    handleMouseDown = e => {
        if (this.props.dragLabel) {
            e.preventDefault();
            this.handleDrag(e);
            window.addEventListener("mousemove", this.handleDrag);
            window.addEventListener("mouseup", this.handleMouseUp);
        }
    };

    handleMouseUp = () => {
        this.unbindEventListeners();
    };

    unbindEventListeners = () => {
        window.removeEventListener("mousemove", this.handleDrag);
        window.removeEventListener("mouseup", this.handleMouseUp);
    };

    render() {
        const styles = reactCSS(
            {
                default: {
                    wrap: {
                        position: "relative"
                    }
                },
                "user-override": {
                    wrap: this.props.style && this.props.style.wrap ? this.props.style.wrap : {},
                    input: this.props.style && this.props.style.input ? this.props.style.input : {},
                    label: this.props.style && this.props.style.label ? this.props.style.label : {}
                },
                "dragLabel-true": {
                    label: {
                        cursor: "ew-resize"
                    }
                }
            },
            {
                "user-override": true
            },
            this.props
        );

        return (
            <div style={styles.wrap}>
                <input
                    style={styles.input}
                    ref={input => (this.input = input)}
                    value={this.state.value}
                    onKeyDown={this.handleKeyDown}
                    onChange={this.handleChange}
                    onBlur={this.handleBlur}
                    placeholder={this.props.placeholder}
                    spellCheck="false"
                />
                {this.props.label && !this.props.hideLabel ? (
                    <span style={styles.label} onMouseDown={this.handleMouseDown}>
                        {this.props.label}
                    </span>
                ) : null}
            </div>
        );
    }
}

export default EditableInput;
