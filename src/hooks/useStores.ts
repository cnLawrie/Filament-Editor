import React from "react";
import { StoreContext } from "core/index";

export const useStores = () => {
    const stores: any = React.useContext(StoreContext);

    if (!stores) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return stores;
};

export const useContentStore = () => {
    const stores: any = React.useContext(StoreContext);

    if (!stores) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return stores.content;
};

export const useTeamStore = () => {
    const stores: any = React.useContext(StoreContext);

    if (!stores) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return stores.team;
};

export const useUserStore = () => {
    const stores: any = React.useContext(StoreContext);

    if (!stores) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return stores.user;
};

export const useTagsStore = () => {
    const stores: any = React.useContext(StoreContext);

    if (!stores) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return stores.tags;
};

export const useDetailStore = () => {
    const stores: any = React.useContext(StoreContext);

    if (!stores) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return stores.detail;
};

export const useModalStore = () => {
    const stores: any = React.useContext(StoreContext);
    if (!stores) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return stores.modal;
};
export const useUploadStore = () => {
    const stores: any = React.useContext(StoreContext);

    if (!stores) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return stores.upload;
};
export const useJobsStore = () => {
    const stores: any = React.useContext(StoreContext);

    if (!stores) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return stores.jobs;
};
export const useTransmissionStore = () => {
    const stores: any = React.useContext(StoreContext);

    if (!stores) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return stores.transmission;
};
export const useSystemStore = () => {
    const stores: any = React.useContext(StoreContext);

    if (!stores) {
        throw new Error("You have forgot to use StoreProvider, shame on you.");
    }
    return stores.system;
};
