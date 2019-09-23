import React from "react";
import classnames from "classnames";
import styles from "./PhotoshopButton.less";

export const PhotoshopBotton = ({ onClick, label, children, active, className }) => {
    return (
        <div
            className={classnames({
                [styles.button]: true,
                [className]: !!className
            })}
            onClick={onClick}
        >
            {label || children}
        </div>
    );
};

export default PhotoshopBotton;
