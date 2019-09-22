import React from "react";
import { StoreContext } from "core/index";

export const useEditorStore = () => {
    const editorStore: any = React.useContext(StoreContext);

    if (!editorStore) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return editorStore;
};
