import React, { useEffect, useRef } from "react";
import { useEditorStore } from "hooks/useStores";

const Index = () => {
    const editorStore = useEditorStore();
    const canvasRef = useRef(null);

    useEffect(() => {
        editorStore.register(canvasRef.current);
    }, []);

    return <canvas id='canvas' ref={canvasRef} />;
};

export default Index;
