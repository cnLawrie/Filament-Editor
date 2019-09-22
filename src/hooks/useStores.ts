import React from "react";
import { StoreContext } from "core/index";

export const useEditorStore = () => {
    const editorStore: any = React.useContext(StoreContext);

    if (!editorStore) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return editorStore;
};

export const useUIStore = () => {
    const editorStore: any = React.useContext(StoreContext);

    if (!editorStore) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return editorStore.ui;
};

export const useMaterialStore = () => {
    const editorStore: any = React.useContext(StoreContext);

    if (!editorStore) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return editorStore.Material;
};
