import React from "react";
import styles from "./index.less";

interface CircleProps {
    width: number;
    height: number;
    radius: number;
    percent: number;
    strokeColor?: string;
    strokeWidth?: number;
    isRing?: boolean;
}

const Circle = (props: CircleProps) => {
    const {
        width,
        height,
        radius,
        percent,
        strokeColor,
        strokeWidth,
        isRing,
    } = props;
    const C = Math.PI * 2 * radius;
    const beginPositionX = 0;
    const beginPositionY = -radius;
    const endPositionX = 0;
    const endPositionY = -2 * radius;
    const pathString = `M ${width / 2},${height /
        2} m ${beginPositionX},${beginPositionY}
        a ${radius},${radius} 0 1 1 ${endPositionX},${-endPositionY}
        a ${radius},${radius} 0 1 1 ${-endPositionX},${endPositionY}`;
    const pathStyle = {
        stroke: strokeColor || "url(#gradient)",
        strokeDasharray: `${(percent / 100) * C}px ${C}px`,
        strokeDashoffset: "0px",
    };

    return (
        <svg
            className={styles.circle}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio='none'
        >
            <defs>
                <linearGradient id='gradient' x1='100%' y1='0%' x2='0%' y2='0%'>
                    <stop offset='0%' stopColor='#4dedc9'></stop>
                    <stop offset='100%' stopColor='#0499f0'></stop>
                </linearGradient>
            </defs>

            <path
                strokeWidth={strokeWidth || 20}
                d={pathString}
                fillOpacity={isRing === undefined ? 0 : isRing ? 0 : 1}
                style={{
                    stroke: "#AAAAAA",
                    strokeDasharray: `${C}px`,
                    strokeDashoffset: "0px",
                }}
            />

            <path
                strokeWidth={strokeWidth || 20}
                d={pathString}
                fillOpacity={isRing === undefined ? 0 : isRing ? 0 : 1}
                style={pathStyle}
            />
        </svg>
    );
};
export default Circle;
