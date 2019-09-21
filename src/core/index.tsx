// react
import React from "react";
import ReactDom from "react-dom";
import { AppContainer } from "react-hot-loader";
import Runtime from "../router/Runtime";
import { BrowserRouter as Router } from "react-router-dom";

// 引入UI层 Application
import "./application";
// 引入所有全局store
import cmsStore from "stores";
// Antd
import { ConfigProvider } from "antd";
import zhCN from "antd/lib/locale-provider/zh_CN";
// 引入全局样式
import "less/global/index.less";

export const StoreContext = React.createContext(null);

function renderWithHotReload(RootElement: React.ReactNode) {
    ReactDom.render(
        <ConfigProvider locale={zhCN}>
            <AppContainer>
                <StoreContext.Provider value={cmsStore}>
                    <Router>{RootElement}</Router>
                </StoreContext.Provider>
            </AppContainer>
        </ConfigProvider>,
        document.getElementById("app"),
    );
}
{
    /* <Provider {...stores}> */
}
{
    /* </Provider> */
}

/*热更新*/
if (module.hot) {
    window.addEventListener("message", () => {
        if ("production" !== process.env.NODE_ENV) {
            // console.clear();
        }
    });
    module.hot.accept("router/Runtime", () => {
        const Runtime = require("router/Runtime").default;
        renderWithHotReload(Runtime());
    });
}

/*初始化*/
renderWithHotReload(Runtime());
