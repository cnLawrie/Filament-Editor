// icon按钮
import React from "react";
import styles from "./index.less";
import { Tooltip } from "antd";
import Button, { ButtonProps } from "antd/es/button";
import classnames from "classnames";
import ReIcon from "widgets/ReIcon";

interface ReIconButtonProps extends ButtonProps {
    icon: string;
    tooltip?: string;
    placement?: any;
    className?: any;
    loading?: boolean;
    gradient?: boolean;
}

const ReIconButton = (props: ReIconButtonProps) => {
    const _props = {
        ...props,
    };
    delete _props["icon"];
    delete _props["tooltip"];
    delete _props["gradient"];

    return props.tooltip ? (
        <Tooltip
            title={props.tooltip}
            placement={props.placement || "top"}
            arrowPointAtCenter={true}
            overlayClassName={styles.tooltip}
        >
            <Button
                {..._props}
                className={classnames({
                    [styles.__ReIconButton__]: true,
                    [props.className]: !!props.className,
                })}
            >
                {!props.loading && (
                    <ReIcon icon={props.icon} gradient={props.gradient} />
                )}
            </Button>
        </Tooltip>
    ) : (
        <Button
            {..._props}
            className={classnames({
                [styles.__ReIconButton__]: true,
                [props.className]: !!props.className,
            })}
        >
            {!props.loading && (
                <ReIcon icon={props.icon} gradient={props.gradient} />
            )}
        </Button>
    );
};

export default ReIconButton;
