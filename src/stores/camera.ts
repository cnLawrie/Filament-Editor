import { urls } from "./index";

class Camera {
    store: any;
    scene: any;
    engine: any;
    camera: any;
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

        this.camera = this.engine.createCamera();
        const eye = [0, 0, 4],
            center = [0, 0, 0],
            up = [0, 1, 0];
        this.camera.lookAt(eye, center, up);
    }
}

export { Camera };
