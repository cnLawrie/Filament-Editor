class Lightning {
    store: any;
    scene: any;
    engine: any;

    constructor() {
        this.store = $$.events.call("store");
    }

    initialize() {
        this.scene = this.store.scene;
        this.engine = this.store.engine;
    }

    addSunLight = () => {
        const sunlight = Filament.EntityManager.get().create();
        console.log(this.scene);
        this.scene.addEntity(sunlight);
        Filament.LightManager.Builder(0)
            .color([0.98, 0.92, 0.89])
            .intensity(100.0)
            .direction([0.6, -1.0, -0.8])
            .sunAngularRadius(1.9)
            .sunHaloSize(10.0)
            .sunHaloFalloff(80.0)
            .build(this.engine, sunlight);
    };

    addBackLight = () => {
        const backlight = Filament.EntityManager.get().create();
        this.scene.addEntity(backlight);
        Filament.LightManager.Builder(1)
            .direction([-1, 0, 1])
            .intensity(50000.0)
            .build(this.engine, backlight);
    };
}

export { Lightning };
