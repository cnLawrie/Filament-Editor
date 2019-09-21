import React from "react";
import { Avatar } from "antd";
import { AvatarProps } from "antd/es/avatar";

const defaultColors = [
    "#00ccd6",
    "#ff7fa4",
    "#8765ca",
    "#388eee",
    "#ff3366",
    "#57d092",
    "#4caf50",
];

export interface ReAvatarProps extends AvatarProps {
    name?: string;
}
export default class ReAvatar extends React.Component<ReAvatarProps, {}> {
    render() {
        const { className, size, src, name, icon, style, shape } = this.props;

        const nameDiy = name ? name : "R";

        let styleDiy;
        src
            ? (styleDiy = style ? style : {})
            : (styleDiy = style
                ? style
                : {
                    background:
                            "" + this.getRandomColor(nameDiy.slice(0, 1)) + "",
                });

        const sizeDiy = size ? size : 50;
        const IconDiy = icon ? icon : "user";

        if (src) {
            return (
                <Avatar
                    className={className}
                    style={styleDiy}
                    size={sizeDiy}
                    alt={nameDiy.slice(0, 1)}
                    src={src}
                    shape={shape}
                />
            );
        } else {
            return nameDiy ? (
                <Avatar
                    className={className}
                    size={sizeDiy}
                    style={styleDiy}
                    alt={nameDiy.slice(0, 1)}
                    shape={shape}
                >
                    {nameDiy.slice(0, 1)}
                </Avatar>
            ) : (
                <Avatar
                    size={sizeDiy}
                    style={styleDiy}
                    icon={IconDiy}
                    shape={shape}
                />
            );
        }
    }

    getRandomColor(value: any, colors = defaultColors) {
        if (!value) {
            return "transparent";
        }
        const colorIndex = this._stringAsciiPRNG(value, colors.length);
        return colors[colorIndex];
    }

    _stringAsciiPRNG(value: any, m: any) {
        // Xn+1 = (a * Xn + c) % m
        // 0 < a < m
        // 0 <= c < m
        // 0 <= X0 < m
        const charCodes = [...value].map(letter => letter.charCodeAt(0));
        const len = charCodes.length;

        const a = (len % (m - 1)) + 1;
        const c = charCodes.reduce((current, next) => current + next) % m;

        let random = charCodes[0] % m;
        for (let i = 0; i < len; i++) {
            random = (a * random + c) % m;
        }

        return random;
    }
}
