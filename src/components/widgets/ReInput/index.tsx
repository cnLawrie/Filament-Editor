import React, { useState, useEffect } from "react";
import { Input, InputNumber } from "antd";
import classnames from "classnames";
import { InputProps } from "antd/es/input";
import styles from "./index.less";
const TextArea = Input.TextArea;

interface ReInputProps extends InputProps {
    type?: string;
    value?: any;
    showwordlimit?: boolean;
    overlayClassName?: any;
    onComplete?: (value: any) => void;
    onClear?: () => void;
}

const ReInput = (props: ReInputProps) => {
    const [value, setValue] = useState<string | number>("");
    const [isPressEnter, setIsPressEnter] = useState(false);
    const _props = { ...props };
    _props.type && delete _props.type;
    _props.value && delete _props.value;
    _props.onBlur && delete _props.onBlur;
    _props.onClear && delete _props.onClear;
    _props.onChange && delete _props.onChange;
    _props.onComplete && delete _props.onComplete;
    _props.showwordlimit && delete _props.showwordlimit;
    _props.overlayClassName && delete _props.overlayClassName;

    useEffect(() => {
        setValue(props.value);
    }, [props.value]);

    return (
        <div
            className={classnames({
                [styles.input]: true,
                [props.overlayClassName]: !!props.overlayClassName,
            })}
        >
            {props.type === "number" ? (
                <InputNumber
                    {..._props}
                    type='text'
                    value={value}
                    onChange={(value: number | undefined) => {
                        setIsPressEnter(false);
                        setValue(value);

                        props.onChange && props.onChange(value);
                        if (!value) {
                            props.onClear && props.onClear();
                        }
                    }}
                    onBlur={e => {
                        setValue(e.target.value);
                        props.onBlur && props.onBlur(e);
                        if (!isPressEnter) {
                            props.onComplete && props.onComplete(value);
                        } else {
                            setIsPressEnter(false);
                        }
                    }}
                    onPressEnter={e => {
                        setIsPressEnter(true);
                        setValue(e.target.value);
                        props.onComplete && props.onComplete(value);
                    }}
                />
            ) : (
                <Input
                    {..._props}
                    type='text'
                    value={value}
                    onChange={e => {
                        setIsPressEnter(false);
                        setValue(e.target.value);

                        props.onChange && props.onChange(e);
                        if (e.target.value === "") {
                            props.onClear && props.onClear();
                        }
                    }}
                    onBlur={e => {
                        setValue(e.target.value);
                        props.onBlur && props.onBlur(e);
                        if (!isPressEnter) {
                            props.onComplete && props.onComplete(value);
                        } else {
                            setIsPressEnter(false);
                        }
                    }}
                    onPressEnter={e => {
                        setIsPressEnter(true);
                        setValue(e.target.value);
                        props.onComplete && props.onComplete(value);
                    }}
                />
            )}
            {props.showwordlimit && props.maxLength && (
                <span className={styles.wordLimit}>
                    {value.length} / {props.maxLength}
                </span>
            )}
        </div>
    );
};

const ReTextArea = (props: ReInputProps) => {
    const [value, setValue] = useState("");
    const [isPressEnter, setIsPressEnter] = useState(false);
    const _props = { ...props };
    _props.type && delete _props.type;
    _props.value && delete _props.value;
    _props.onBlur && delete _props.onBlur;
    _props.onClear && delete _props.onClear;
    _props.onChange && delete _props.onChange;
    _props.onComplete && delete _props.onComplete;

    useEffect(() => {
        setValue(props.value);
    }, [props.value]);

    return (
        <TextArea
            {..._props}
            value={value}
            onChange={(e: any) => {
                setIsPressEnter(false);
                setValue(e.target.value);

                props.onChange && props.onChange(e);
                if (e.target.value === "") {
                    props.onClear && props.onClear();
                }
            }}
            onBlur={(e: any) => {
                setValue(e.target.value);
                props.onBlur && props.onBlur(e);
                if (!isPressEnter) {
                    props.onComplete && props.onComplete(value);
                } else {
                    setIsPressEnter(false);
                }
            }}
            onPressEnter={(e: any) => {
                setIsPressEnter(true);
                setValue(e.target.value);
                props.onComplete && props.onComplete(value);
            }}
        />
    );
};
export default ReInput;
export { ReTextArea };
