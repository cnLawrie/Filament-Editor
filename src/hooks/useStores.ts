import React from "react";
import { StoreContext } from "core/index";

export const useStores = () => {
    const stores: any = React.useContext(StoreContext);

    if (!stores) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return stores;
};

