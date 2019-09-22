import React from "react";
import reactCSS from "reactcss";

export const PhotoshopPointerCircle = () => {
    const styles = reactCSS({
        default: {
            pointer: {
                position: "relative",
                width: "17px",
                height: "1px",
                background: "#E0E0E0"
            },
            left: {
                width: 0,
                height: 0,
                borderStyle: "solid",
                borderWidth: "4px 0px 4px 6px",
                borderColor: "transparent transparent transparent #E0E0E0",
                transform: "translate(-7px, -3px)"
            },
            leftInside: {
                width: 0,
                height: 0,
                borderStyle: "solid",
                borderWidth: "4px 0 4px 6px",
                borderColor: "transparent transparent transparent #fff",
                position: "absolute",
                top: "1px",
                left: "1px",
                transform: "translate(-8px, -5px)"
            },

            right: {
                width: 0,
                height: 0,
                borderStyle: "solid",
                borderWidth: "4px 0px 4px 6px",
                borderColor: "transparent transparent transparent #E0E0E0",
                transform: "translate(18px, -11px) rotate(180deg)"
            },
            rightInside: {
                width: 0,
                height: 0,
                borderStyle: "solid",
                borderWidth: "4px 0 4px 6px",
                borderColor: "transparent transparent transparent #fff",
                position: "absolute",
                top: "1px",
                left: "1px",
                transform: "translate(-8px, -5px)"
            }
        }
    });

    return (
        <div style={styles.pointer}>
            <div style={styles.left} />
            <div style={styles.right} />
        </div>
    );
};

export default PhotoshopPointerCircle;
