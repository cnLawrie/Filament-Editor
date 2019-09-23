import React from "react";
import { observer } from "mobx-react-lite";
import styles from "./index.less";

export interface IndexProps {}

const Index: React.FunctionComponent<IndexProps> = observer(() => {
    return <div className={styles.__ROOT__}></div>;
});

export default Index;
