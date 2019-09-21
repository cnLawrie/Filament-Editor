import React from "react";
import { Route, Switch } from "react-router-dom";
import Bundle from "./Bundle";
import ReLoading from "widgets/ReLoading";
import Index from "bundle-loader?lazy&name=home!services/Index";
//懒加载

const createComponent = (component: React.ReactNode) => {
    const Component = () => {
        return (
            <Bundle load={component}>
                {(Component: any) =>
                    Component ? <Component /> : <ReLoading />
                }
            </Bundle>
        );
    };
    return Component;
};

const Runtime = (): React.ReactNode => (
    <Switch>
        <Route path={$$.route("editor")} component={createComponent(Index)} />
    </Switch>
);

export default Runtime;
