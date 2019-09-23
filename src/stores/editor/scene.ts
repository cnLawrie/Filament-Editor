import { urls } from "../index";

class Scene {
    store: any;
    scene: any;
    engine: any;
    skybox: any;
    matinstance: any;
    Model: any;

    constructor() {
        this.store = $$.events.call("store");
    }

    initialize() {
        this.scene = this.store.scene;
        this.engine = this.store.engine;
        this.Model = this.store.Model;
        this.engine = this.store.engine;

        this.scene.addEntity(this.Model.model);

        // TODO: create sky box and IBL
        // this.skybox = this.engine.createSkyFromKtx(sky_small_url)
        // this.scene.setSkybox(this.skybox)
        // this.indirectLight = this.engine.createIblFromKtx(ibl_url)
        // this.indirectLight.setIntensity(100000);
        // this.scene.setIndirectLight(this.indirectLight)
    }

    loadHighQualSkybox = () => {
        this.engine.destroySkybox(this.skybox);
        this.skybox = this.engine.createSkyFromKtx(urls.sky_large_url);
        this.scene.setSkybox(this.skybox);
    };
}

export { Scene };
