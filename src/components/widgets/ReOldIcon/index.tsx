import React from "react";
import classnames from "classnames";
import styles from "./index.less";

interface iconProps {
    className: string;
    icon: string;
}

export default class view extends React.Component<iconProps, {}> {
    render() {
        const { className, icon } = this.props;
        return (
            <svg
                aria-hidden='true'
                className={classnames({
                    [styles.reIcon]: true,
                    [className]: !!className,
                })}
                dangerouslySetInnerHTML={{
                    __html: `<use xlink:href=#${icon}></use>`,
                }}
            />
        );
    }
}
