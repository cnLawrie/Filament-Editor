import { observable as o, action as a } from "mobx";
import { Lightning } from "./lightning";
import { Scene } from "./scene";
import { Model } from "./model";
import { Material } from "./material";
import { Renderer } from "./renderer";
import { Camera } from "./camera";
import { urls } from "./config/urls";

interface CmsStore {
    [key: string]: any;
}

class EditorStore implements CmsStore {
    canvas: any;
    engine: any;
    scene: any;

    Lightning: any;
    Scene: any;
    Model: any;
    Material: any;
    Camera: any;
    Renderer: any;

    constructor() {
        // 注册store
        $$.events.method("store", () => this);

        this.Lightning = new Lightning();
        this.Scene = new Scene();
        this.Model = new Model();
        this.Material = new Material();
        this.Renderer = new Renderer();
        this.Camera = new Camera();
    }

    register(canvas: any) {
        Filament.init(
            [
                urls.filamat_url,
                urls.filamesh_url,
                urls.sky_small_url,
                urls.ibl_url,
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
