import { urls } from "../config/urls";
import { observable as o, action as a, toJS } from "mobx";

class Material {
    store: any;
    scene: any;
    engine: any;
    skybox: any;
    matinstance: any;

    @o baseColor = [1, 1, 1];
    @o metallic = 0;
    @o roughness = 1;
    @o reflectance = 0.5;
    @o clearCoat = 0;
    @o clearCoatRoughness = 0;
    @o anisotropy = 0;
    @o anisotropyDirection = [0, 0, 0];
    @o ambientOcclusion = 0;
    @o normal = [0, 0, 0];
    @o clearCoatNormal = [0, 0, 0];
    @o emissive = [0, 0, 0, 0];
    @o postLightingColor = [0, 0, 0, 0];

    constructor() {
        this.store = $$.events.call("store");
    }

    texturedTestParams = () => {
        this.matinstance.setColor3Parameter(
            "baseColor",
            Filament.RgbType.LINEAR,
            toJS(this.baseColor),
        );
        this.matinstance.setFloatParameter("metallic", this.metallic);
        this.matinstance.setFloatParameter("roughness", this.roughness);
        this.matinstance.setFloatParameter("reflectance", this.reflectance);
        this.matinstance.setFloatParameter("clearCoat", this.clearCoat);
        this.matinstance.setFloatParameter(
            "clearCoatRoughness",
            this.clearCoatRoughness,
        );
        this.matinstance.setFloatParameter("anisotropy", this.anisotropy);
        this.matinstance.setFloat3Parameter(
            "anisotropyDirection",
            this.anisotropyDirection,
        );
        this.matinstance.setFloatParameter(
            "ambientOcclusion",
            this.ambientOcclusion,
        );
        this.matinstance.setFloat3Parameter("normal", this.normal);
        this.matinstance.setFloat3Parameter(
            "clearCoatNormal",
            this.clearCoatNormal,
        );
        this.matinstance.setFloat4Parameter("emissive", this.emissive);
        this.matinstance.setFloat4Parameter(
            "postLightingColor",
            this.postLightingColor,
        );
    };

    initialize() {
        this.scene = this.store.scene;
        this.engine = this.store.engine;

        const textured = () => {
            const albedo = this.engine.createTextureFromKtx(urls.albedo_url, {
                srgb: true,
            });
            const roughness = this.engine.createTextureFromKtx(
                urls.roughness_url,
            );
            const metallic = this.engine.createTextureFromKtx(
                urls.metallic_url,
            );
            const normal = this.engine.createTextureFromKtx(urls.normal_url);
            const ao = this.engine.createTextureFromKtx(urls.ao_url);
            const sampler = new Filament.TextureSampler(
                Filament.MinFilter.LINEAR_MIPMAP_LINEAR,
                Filament.MagFilter.LINEAR,
                Filament.WrapMode.CLAMP_TO_EDGE,
            );

            this.matinstance.setTextureParameter("albedo", albedo, sampler);
            this.matinstance.setTextureParameter(
                "roughness",
                roughness,
                sampler,
            );
            this.matinstance.setTextureParameter("metallic", metallic, sampler);
            this.matinstance.setTextureParameter("normal", normal, sampler);
            this.matinstance.setTextureParameter("ao", ao, sampler);
        };

        const material = this.engine.createMaterial(urls.filamat_url);
        this.matinstance = material.createInstance();

        this.texturedTestParams();

        // TODO: fetch larger assets
        // Filament.fetch(
        //     [urls.sky_large_url, urls.albedo_url, urls.roughness_url, urls.metallic_url, urls.normal_url, urls.ao_url],
        //     () => {
        //         textured()

        //         this.scene.addEntity(this.suzanne)
        //     })
    }

    @a
    updateMaterial(field: string, value: any) {
        this[field] = value;
        this.texturedTestParams();
    }
}

export { Material };
