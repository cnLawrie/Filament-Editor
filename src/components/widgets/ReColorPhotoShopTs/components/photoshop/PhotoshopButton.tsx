import React from "react";
import classnames from "classnames";
import styles from "./PhotoshopButton.less";

interface propType {
    onClick: any;
    label: any;
    children: any;
    active: any;
    className: any;
}

export const PhotoshopBotton = (props: propType) => {
    const { onClick, label, children, active, className } = props;
    return (
        <div
            className={classnames({
                [styles.button]: true,
                [className]: !!className,
            })}
            onClick={onClick}
        >
            {label || children}
        </div>
    );
};

export default PhotoshopBotton;
