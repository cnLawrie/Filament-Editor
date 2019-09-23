import { observable as o, action as a } from "mobx";
import { Lightning } from "./editor/lightning";
import { Scene } from "./editor/scene";
import { Model } from "./editor/model";
import { Material } from "./editor/material";
import { Renderer } from "./editor/renderer";
import { Camera } from "./editor/camera";
import uiStore from "./ui";
import { urls } from "./config/urls";

interface CmsStore {
    [key: string]: any;
}

class EditorStore implements CmsStore {
    canvas: any;
    engine: any;
    scene: any;

    Lightning: Lightning;
    Scene: Scene;
    Model: Model;
    Material: Material;
    Camera: Camera;
    Renderer: Renderer;

    ui: uiStore;

    constructor() {
        // 注册store
        $$.events.method("store", () => this);

        this.Lightning = new Lightning();
        this.Scene = new Scene();
        this.Model = new Model();
        this.Material = new Material();
        this.Camera = new Camera();
        this.Renderer = new Renderer();

        this.ui = new uiStore();
    }

    register(canvas: any) {
        Filament.init(
            [
                urls.filamat_url,
                urls.filamesh_url,
                urls.sky_small_url,
                urls.ibl_url,
                urls.redball_filamat_url,
            ],
            () => {
                window.app = this.initialize(canvas);
            },
        );
    }

    initialize(canvas: any) {
        this.canvas = canvas;

        this.engine = Filament.Engine.create(canvas);
        this.scene = this.engine.createScene();

        this.Material.initialize();
        this.Model.initialize();
        this.Lightning.initialize();
        this.Scene.initialize();
        this.Camera.initialize();
        this.Renderer.initialize();

        this.Lightning.addSunLight();

        // this.resize();
        window.requestAnimationFrame(this.Renderer.render);
    }
}
const editorStore = new EditorStore();
export default editorStore;
export { EditorStore, urls };
