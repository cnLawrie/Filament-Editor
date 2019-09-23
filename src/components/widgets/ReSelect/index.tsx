// 重写Tree以便Checkout能够自定义图标
import React, { Component } from "react";
import { Select } from "antd";
import ReIcon from "widgets/ReIcon";
import styles from "./index.less";

const Option = Select.Option;

interface ReSelectPropTypes {
    options: any;
    value: any;
    size?: string;
    onChange: (value: any) => void;
}

export default class ReSelect extends React.Component<ReSelectPropTypes> {
    state = {
        visible: false,
    };
    render() {
        const { options, value, size, onChange } = this.props;
        return (
            <Select
                size={size || "default"}
                suffixIcon={
                    <ReIcon
                        className={
                            this.state.visible ? styles.open : styles.close
                        }
                        icon='rb-right'
                    />
                }
                value={value}
                onChange={value => {
                    onChange && onChange(value);
                }}
                onDropdownVisibleChange={this.onDropdownVisibleChange}
            >
                {options.map((option: any) => (
                    <Option key={option.value} value={option.value}>
                        {option.label}
                    </Option>
                ))}
            </Select>
        );
    }

    onDropdownVisibleChange = (open: boolean) => {
        this.setState({
            visible: open,
        });
    };
}
