import React from "react";
import classnames from "classnames";
import styles from "./index.less";

interface ReIconProps {
    readonly icon: string;
    className?: any;
    gradient?: boolean;
    onClick?: (e: any) => void;
}

const ReIcon = (props: ReIconProps) => {
    const { gradient = false, onClick } = props;
    return (
        <i
            className={classnames({
                iconfont: true,
                [styles.icon]: true,
                [props.icon]: true,
                [props.className]: !!props.className,
                [styles.gradient]: gradient,
            })}
            onClick={onClick}
        />
    );
};
export default ReIcon;
