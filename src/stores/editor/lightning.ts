import { observable as o, action as a, computed as c, toJS } from "mobx";

class Lightning {
    store: any;
    scene: any;
    engine: any;

    @o lightnings: any[] = [];

    @o type: number = 0;
    @o color: number[] = [1, 1, 1];
    @o direction: number[] = [0, -1, 0];
    @o falloff: number = 1;
    @o intensity: number = 1000;
    @o position: number[] = [1, 1, 1];
    @o sunAngularRadius: number = 0.545;
    @o sunHaloFalloff: number = 80;
    @o sunHaloSize: number = 10;

    constructor() {
        this.store = $$.events.call("store");
    }

    initialize() {
        this.scene = this.store.scene;
        this.engine = this.store.engine;
    }

    addCustomLight = () => {
        const customlight = Filament.EntityManager.get().create();
        this.scene.addEntity(customlight);
        console.log(this.type);

        Filament.LightManager.Builder(this.type)
            .color(this.color)
            .direction(this.direction)
            .falloff(this.falloff)
            .intensity(this.intensity)
            .position(this.position)
            .sunAngularRadius(this.sunAngularRadius)
            .sunHaloFalloff(this.sunHaloFalloff)
            .sunHaloSize(this.sunHaloSize)
            // .castLight()
            // .castShadows()
            .build(this.engine, customlight);
        this.lightnings.push(
            Object.assign({}, this.currentLight(), { entity: customlight }),
        );
    };

    deleteCustomLight = (index: number) => {
        this.engine.destroyEntity(this.lightnings[index].entity);
        this.lightnings.splice(index, 1);
    };

    addSunLight = () => {
        const sunlight = Filament.EntityManager.get().create();
        this.scene.addEntity(sunlight);
        Filament.LightManager.Builder(0)
            .color([0.98, 0.92, 0.89])
            .intensity(this.intensity)
            .direction([0.6, -1.0, -0.8])
            .sunAngularRadius(1.9)
            .sunHaloSize(10.0)
            .sunHaloFalloff(80.0)
            // .castLight()
            // .castShadows()
            // .falloff()
            // .position()
            .build(this.engine, sunlight);

        // this.engine.destroyEntity(sunlight);
    };

    addBackLight = () => {
        const backlight = Filament.EntityManager.get().create();
        this.scene.addEntity(backlight);
        Filament.LightManager.Builder(1)
            .direction([-1, 0, 1])
            .intensity(50000.0)
            .build(this.engine, backlight);
    };

    @a
    updateLightning(field: string, value: any) {
        this[field] = value;
    }

    currentLight() {
        return {
            type: toJS(this.type),
            color: toJS(this.color),
            direction: toJS(this.direction),
            falloff: toJS(this.falloff),
            intensity: toJS(this.intensity),
            position: toJS(this.position),
            sunAngularRadius: toJS(this.sunAngularRadius),
            sunHaloFalloff: toJS(this.sunHaloFalloff),
            sunHaloSize: toJS(this.sunHaloSize),
        };
    }
}

export { Lightning };
