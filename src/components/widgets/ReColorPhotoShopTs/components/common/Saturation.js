import React, { Component, PureComponent } from "react";
import reactCSS from "reactcss";
import throttle from "lodash/throttle";
import * as saturation from "../../helpers/saturation";

export class Saturation extends (PureComponent || Component) {
    hsv = {
        s: 0,
        v: 0
    };

    constructor(props) {
        super(props);
        this.state = {
            x: -1,
            y: -1
        };
        this.throttle = throttle((fn, data, e) => {
            fn(data, e);
        }, 50);
    }

    componentDidMount() {
        if (this.state.x === -1 && this.container) {
            const { width: containerWidth, height: containerHeight } = this.container.getBoundingClientRect();
            const x = this.props.hsv.s * containerWidth;
            const y = (1 - this.props.hsv.v) * containerHeight;
            this.hsv.s = this.props.hsv.s;
            this.hsv.v = this.props.hsv.v;
            this.setState({
                x,
                y
            });
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.container) {
            let update = false;
            if (Math.abs(this.hsv.s - nextProps.hsv.s) > 0.01 && nextProps.hsv.s !== 0) {
                update = true;
            }
            if (Math.abs(this.hsv.v - nextProps.hsv.v) > 0.01 && nextProps.hsv.v !== 0) {
                update = true;
            }
            if (update) {
                const { width: containerWidth, height: containerHeight } = this.container.getBoundingClientRect();
                const x = nextProps.hsv.s * containerWidth;
                const y = (1 - nextProps.hsv.v) * containerHeight;

                this.hsv.s = nextProps.hsv.s;
                this.hsv.v = nextProps.hsv.v;
                this.setState({
                    x,
                    y
                });
            }
        }
    }

    componentWillUnmount() {
        this.throttle.cancel();
        this.unbindEventListeners();
    }

    handleChange = (e, skip) => {
        let data = saturation.calculateChange(e, skip, this.props, this.container);
        this.hsv.s = data.s;
        this.hsv.v = data.v;
        this.setState({
            x: data.x,
            y: data.y
        });
        delete data.x;
        delete data.y;
        this.props.onChange && this.throttle(this.props.onChange, data, e);
    };

    handleMouseDown = e => {
        this.handleChange(e, true);
        window.addEventListener("mousemove", this.handleChange);
        window.addEventListener("mouseup", this.handleMouseUp);
    };

    handleMouseUp = () => {
        this.unbindEventListeners();
    };

    unbindEventListeners() {
        window.removeEventListener("mousemove", this.handleChange);
        window.removeEventListener("mouseup", this.handleMouseUp);
    }

    render() {
        const { color, white, black, pointer, circle } = this.props.style || {};
        const styles = reactCSS(
            {
                default: {
                    color: {
                        absolute: "0px 0px 0px 0px",
                        background: `hsl(${this.props.hsl.h},100%, 50%)`,
                        borderRadius: this.props.radius
                    },
                    white: {
                        absolute: "0px 0px 0px 0px",
                        borderRadius: this.props.radius
                    },
                    black: {
                        absolute: "0px 0px 0px 0px",
                        boxShadow: this.props.shadow,
                        borderRadius: this.props.radius
                    },
                    pointer: {
                        position: "absolute",
                        left: this.state.x !== -1 ? `${this.state.x}px` : `${this.props.hsv.s * 100}%`,
                        top: this.state.y !== -1 ? `${this.state.y}px` : `${-(this.props.hsv.v * 100) + 100}%`,
                        // top: `${-(this.props.hsv.v * 100) + 100}%`,
                        // left: `${this.props.hsv.s * 100}%`,
                        cursor: "default"
                    },
                    circle: {
                        width: "4px",
                        height: "4px",
                        boxShadow: `0 0 0 1.5px #fff, inset 0 0 1px 1px rgba(0,0,0,.3),
            0 0 1px 2px rgba(0,0,0,.4)`,
                        borderRadius: "50%",
                        cursor: "hand",
                        transform: "translate(-2px, -2px)"
                    }
                },
                custom: {
                    color,
                    white,
                    black,
                    pointer,
                    circle
                }
            },
            { custom: !!this.props.style }
        );

        return (
            <div
                style={styles.color}
                ref={container => (this.container = container)}
                onMouseDown={this.handleMouseDown}
                onTouchMove={this.handleChange}
                onTouchStart={this.handleChange}
            >
                <style>{`
          .saturation-white {
            background: -webkit-linear-gradient(to right, #fff, rgba(255,255,255,0));
            background: linear-gradient(to right, #fff, rgba(255,255,255,0));
          }
          .saturation-black {
            background: -webkit-linear-gradient(to top, #000, rgba(0,0,0,0));
            background: linear-gradient(to top, #000, rgba(0,0,0,0));
          }
        `}</style>
                <div style={styles.white} className="saturation-white">
                    <div style={styles.black} className="saturation-black" />
                    <div style={styles.pointer}>
                        {this.props.pointer ? <this.props.pointer {...this.props} /> : <div style={styles.circle} />}
                    </div>
                </div>
            </div>
        );
    }
}

export default Saturation;
