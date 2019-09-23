import { urls } from "../index";
import Trackball from "gltumble";

class Renderer {
    store: any;
    scene: any;
    engine: any;
    renderer: any;
    swapChain: any;
    trackball: any;
    camera: any;
    view: any;
    canvas: any;
    Model: any;
    Camera: any;

    constructor() {
        this.store = $$.events.call("store");
    }

    initialize() {
        this.canvas = this.store.canvas;
        this.scene = this.store.scene;
        this.engine = this.store.engine;
        this.Model = this.store.Model;
        this.Camera = this.store.Camera;

        this.trackball = new Trackball(this.canvas, { startSpin: 0.035 });

        this.swapChain = this.engine.createSwapChain();
        this.renderer = this.engine.createRenderer();
        this.view = this.engine.createView();
        this.view.setCamera(this.Camera.camera);
        this.view.setScene(this.scene);
        this.view.setClearColor([0, 0, 0, 1.0]);

        this.resize();
        window.addEventListener("resize", this.resize);
    }

    render = () => {
        // TODO: apply gltumble matrix
        const tcm = this.engine.getTransformManager();
        const inst = tcm.getInstance(this.Model.model);
        tcm.setTransform(inst, this.trackball.getMatrix());
        inst.delete();

        this.renderer.render(this.swapChain, this.view);
        window.requestAnimationFrame(this.render);
    };

    resize = () => {
        const dpr = window.devicePixelRatio;
        const width = (this.canvas.width = window.innerWidth * dpr);
        const height = (this.canvas.height = window.innerHeight * dpr);
        this.view.setViewport([0, 0, width, height]);
        const aspect = width / height;
        const Fov = Filament.Camera$Fov,
            fov = aspect < 1 ? Fov.HORIZONTAL : Fov.VERTICAL;
        this.Camera.camera.setProjectionFov(45, aspect, 1.0, 10.0, fov);
    };
}

export { Renderer };
