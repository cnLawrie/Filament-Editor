import React from "react";
import reactCSS from "reactcss";
import color from "../../helpers/color";

import { EditableInput } from "../common";

interface propType {
    onChange: any;
    rgb: any;
    hsv: any;
    hex: any;
}

export const PhotoshopFields = (props: propType) => {
    const { onChange, rgb, hsv, hex } = props;
    const styles = reactCSS({
        default: {
            fields: {
                position: "relative",
            },
            divider: {
                height: "5px",
            },
            RGBwrap: {
                marginBottom: "5px",
                position: "relative",
                lineHeight: "22px",
            },
            RGBinput: {
                marginLeft: "20%",
                width: "65%",
                height: "18px",
                border: "1px solid #E0E0E0",
                borderRadius: "2px",
                fontSize: "12px",
                paddingLeft: "3px",
            },
            RGBlabel: {
                left: "0px",
                textTransform: "uppercase",
                fontSize: "12px",
                position: "absolute",
            },
            HEXwrap: {
                position: "relative",
                lineHeight: "22px",
            },
            HEXinput: {
                marginLeft: "20%",
                width: "80%",
                height: "18px",
                border: "1px solid #E0E0E0",
                borderRadius: "2px",
                marginBottom: "6px",
                fontSize: "12px",
                paddingLeft: "3px",
            },
            HEXlabel: {
                position: "absolute",
                top: "0px",
                left: "0px",
                width: "14px",
                textTransform: "uppercase",
                fontSize: "12px",
                height: "18px",
                lineHeight: "22px",
            },
            fieldSymbols: {
                position: "absolute",
                top: "0px",
                right: "0px",
                fontSize: "12px",
            },
            symbol: {
                height: "22px",
                marginBottom: "5px",
                lineHeight: "22px",
            },
        },
        hover: {
            RGBinput: {
                border: "1px solid #8298ab",
            },
            HEXinput: {
                border: "1px solid #8298ab",
            },
        },
    });

    const handleChange = (data: any, e: any) => {
        if (data["#"]) {
            color.isValidHex(data["#"]) &&
                onChange(
                    {
                        hex: data["#"],
                        source: "hex",
                    },
                    e,
                );
        } else if (data.r || data.g || data.b) {
            onChange(
                {
                    r: data.r || rgb.r,
                    g: data.g || rgb.g,
                    b: data.b || rgb.b,
                    source: "rgb",
                },
                e,
            );
        } else if (data.h || data.s || data.v) {
            if (data.s === "1") {
                data.s = 0.01;
            }
            if (data.v === "1") {
                data.v = 0.01;
            }

            onChange(
                {
                    h: data.h || hsv.h,
                    s: data.s || hsv.s,
                    v: data.v || hsv.v,
                    source: "hsv",
                },
                e,
            );
        }
    };
    return (
        <div style={styles.fields}>
            <EditableInput
                style={{
                    wrap: styles.RGBwrap,
                    input: styles.RGBinput,
                    label: styles.RGBlabel,
                }}
                label='h'
                value={Math.round(hsv.h)}
                onComplete={handleChange}
            />
            <EditableInput
                style={{
                    wrap: styles.RGBwrap,
                    input: styles.RGBinput,
                    label: styles.RGBlabel,
                }}
                label='s'
                value={Math.round(hsv.s * 100)}
                onComplete={handleChange}
            />
            <EditableInput
                style={{
                    wrap: styles.RGBwrap,
                    input: styles.RGBinput,
                    label: styles.RGBlabel,
                }}
                label='v'
                value={Math.round(hsv.v * 100)}
                onComplete={handleChange}
            />
            <div style={styles.divider} />
            <EditableInput
                style={{
                    wrap: styles.RGBwrap,
                    input: styles.RGBinput,
                    label: styles.RGBlabel,
                }}
                label='r'
                value={rgb.r}
                onComplete={handleChange}
            />
            <EditableInput
                style={{
                    wrap: styles.RGBwrap,
                    input: styles.RGBinput,
                    label: styles.RGBlabel,
                }}
                label='g'
                value={rgb.g}
                onComplete={handleChange}
            />
            <EditableInput
                style={{
                    wrap: styles.RGBwrap,
                    input: styles.RGBinput,
                    label: styles.RGBlabel,
                }}
                label='b'
                value={rgb.b}
                onComplete={handleChange}
            />
            <div style={styles.divider} />
            <EditableInput
                style={{
                    wrap: styles.HEXwrap,
                    input: styles.HEXinput,
                    label: styles.HEXlabel,
                }}
                label='#'
                value={hex.replace("#", "")}
                onComplete={handleChange}
            />
            <div style={styles.fieldSymbols}>
                <div style={styles.symbol} />
                <div style={styles.symbol}>%</div>
                <div style={styles.symbol}>%</div>
            </div>
        </div>
    );
};

export default PhotoshopFields;
