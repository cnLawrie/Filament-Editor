import { urls } from "./config/urls";

class Model {
    store: any;
    scene: any;
    engine: any;
    skybox: any;
    matinstance: any;
    model: any;
    Material: any;

    constructor() {
        this.store = $$.events.call("store");
    }

    initialize() {
        this.scene = this.store.scene;
        this.engine = this.store.engine;
        this.Material = this.store.Material;

        const filamesh = this.engine.loadFilamesh(
            urls.filamesh_url,
            this.Material.matinstance,
        );
        this.model = filamesh.renderable;
    }
}

export { Model };
