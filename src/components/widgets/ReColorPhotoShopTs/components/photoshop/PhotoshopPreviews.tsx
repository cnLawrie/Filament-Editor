import React from "react";
import reactCSS from "reactcss";

interface propType {
    rgb: any;
    currentColor: any;
}

export const PhotoshopPreviews = (props: propType) => {
    const { rgb, currentColor } = props;
    const styles = reactCSS({
        default: {
            swatches: {
                border: "1px solid #E0E0E0",
                marginBottom: "2px",
                marginTop: "1px",
            },
            new: {
                height: "34px",
                background: `rgb(${rgb.r},${rgb.g}, ${rgb.b})`,
            },
            current: {
                height: "34px",
                background: currentColor,
            },
            label: {
                fontSize: "12px",
                color: "#3C3C3C",
                textAlign: "center",
            },
        },
    });

    return (
        <div>
            <div style={styles.label}>新的</div>
            <div style={styles.swatches}>
                <div style={styles.new} />
                <div style={styles.current} />
            </div>
            <div style={styles.label}>当前</div>
        </div>
    );
};

export default PhotoshopPreviews;
