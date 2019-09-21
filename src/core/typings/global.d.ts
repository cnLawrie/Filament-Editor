declare module "bundle-loader?lazy&name=home!services/*";

declare module "*.svg";

declare module "*.less";

declare module "*.json" {
    const value: any;
    export const version: string;
    export default value;
}

declare module "core/*";
declare module "core/config/*";

declare module "widgets/*";

declare module "hooks/*";

declare module "stores";

declare module "stores/*";

declare const $$: any;
