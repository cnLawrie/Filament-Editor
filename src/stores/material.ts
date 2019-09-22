import { urls } from "./config/urls";

class Material {
    store: any;
    scene: any;
    engine: any;
    skybox: any;
    matinstance: any;

    constructor() {
        this.store = $$.events.call("store");
    }

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

        const texturedTestParams = () => {
            this.matinstance.setColor3Parameter(
                "baseColor",
                Filament.RgbType.sRGB,
                [1, 1, 1],
            );
            this.matinstance.setFloatParameter("metallic", 1);
            this.matinstance.setFloatParameter("roughness", 0);
            this.matinstance.setFloatParameter("reflectance", 1);
            this.matinstance.setFloatParameter("clearCoat", 1.0);
            this.matinstance.setFloatParameter("clearCoatRoughness", 0.3);
            this.matinstance.setFloatParameter("anisotropy", 0);
            this.matinstance.setFloat3Parameter("anisotropyDirection", [
                0,
                0,
                0,
            ]);
            this.matinstance.setFloatParameter("ambientOcclusion", 1);
            // this.matinstance.setFloat3Parameter('normal', 1);
            // this.matinstance.setFloat3Parameter('clearCoatNormal', 1);
            // this.matinstance.setFloat4Parameter('emissive', [1, 1, 1, 1]);
            // this.matinstance.setFloat4Parameter('postLightingColor', [1, 1, 1, 1]);
        };

        const material = this.engine.createMaterial(urls.filamat_url);
        this.matinstance = material.createInstance();

        texturedTestParams();

        // TODO: fetch larger assets
        // Filament.fetch(
        //     [urls.sky_large_url, urls.albedo_url, urls.roughness_url, urls.metallic_url, urls.normal_url, urls.ao_url],
        //     () => {
        //         textured()

        //         this.scene.addEntity(this.suzanne)
        //     })
    }
}

export { Material };
