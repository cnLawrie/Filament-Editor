import React from "react";

interface BundleProps {
    load: React.ReactNode;
    children?: React.ReactNode;
}

export default class Bundle extends React.Component<BundleProps> {
    public state = {
        // short for "module" but that's a keyword in js, so "mod"
        mod: null
    };

    public UNSAFE_componentWillMount() {
        this.load(this.props);
    }

    public UNSAFE_componentWillReceiveProps(nextProps: any) {
        if (nextProps.load !== this.props.load) {
            this.load(nextProps);
        }
    }

    public load(props: any) {
        this.setState({
            mod: null
        });
        props.load((mod: any) => {
            this.setState({
                // handle both es imports and cjs
                mod: mod.default ? mod.default : mod
            });
        });
    }

    public render() {
        // return this.state.mod ? this.props.children(this.state.mod) : null;
        return (this.props.children as any)(this.state.mod);
    }
}
