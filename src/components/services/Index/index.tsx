import React, { useEffect, useRef } from "react";
import { Layout } from "antd";
import styles from "./index.less";
import { useEditorStore } from "hooks/useStores";
import EditorSider from "services/Sider";

const { Sider, Content } = Layout;

const Index = () => {
    const editorStore = useEditorStore();
    const canvasRef = useRef(null);

    useEffect(() => {
        editorStore.register(canvasRef.current);
    }, []);

    return (
        <div>
            <div className={styles.canvas}>
                <canvas id='canvas' ref={canvasRef} />
            </div>
            <EditorSider />
        </div>
    );
};

export default Index;
