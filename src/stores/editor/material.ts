import { FilamatType } from "./../../core/config/enum";
import { urls } from "../config/urls";
import {
    observable as o,
    action as a,
    computed as c,
    toJS,
    reaction,
} from "mobx";
import { prefix } from "../config/urls";

const filamat_url1 = `${prefix}/textured.filamat`;

class Material {
    store: any;
    scene: any;
    engine: any;
    skybox: any;
    matinstance: any;
    matinstanceNoMap: any;

    @o matinstances: any = {};

    @o noMaps: boolean = false;
    @o transparency: boolean = false;
    @c get filamat_url() {
        return this.noMaps
            ? this.transparency
                ? `${prefix}/texturedTestTrans.filamat`
                : `${prefix}/texturedTestParams.filamat`
            : `${prefix}/textured.filamat`;
    }

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
        this.matinstanceNoMap.setColor3Parameter(
            "baseColor",
            Filament.RgbType.LINEAR,
            toJS(this.baseColor),
        );
        this.matinstanceNoMap.setFloatParameter("metallic", this.metallic);
        this.matinstanceNoMap.setFloatParameter("roughness", this.roughness);
        this.matinstanceNoMap.setFloatParameter(
            "reflectance",
            this.reflectance,
        );
        this.matinstanceNoMap.setFloatParameter("clearCoat", this.clearCoat);
        this.matinstanceNoMap.setFloatParameter(
            "clearCoatRoughness",
            this.clearCoatRoughness,
        );
        this.matinstanceNoMap.setFloatParameter("anisotropy", this.anisotropy);
        this.matinstanceNoMap.setFloat3Parameter(
            "anisotropyDirection",
            this.anisotropyDirection,
        );
        this.matinstanceNoMap.setFloatParameter(
            "ambientOcclusion",
            this.ambientOcclusion,
        );
        this.matinstanceNoMap.setFloat3Parameter("normal", this.normal);
        this.matinstanceNoMap.setFloat3Parameter(
            "clearCoatNormal",
            this.clearCoatNormal,
        );
        this.matinstanceNoMap.setFloat4Parameter("emissive", this.emissive);
        this.matinstanceNoMap.setFloat4Parameter(
            "postLightingColor",
            this.postLightingColor,
        );
    };

    textured = () => {
        const albedo = this.engine.createTextureFromKtx(urls.albedo_url, {
            srgb: true,
        });
        const roughness = this.engine.createTextureFromKtx(urls.roughness_url);
        const metallic = this.engine.createTextureFromKtx(urls.metallic_url);
        const normal = this.engine.createTextureFromKtx(urls.normal_url);
        const ao = this.engine.createTextureFromKtx(urls.ao_url);
        const sampler = new Filament.TextureSampler(
            Filament.MinFilter.LINEAR_MIPMAP_LINEAR,
            Filament.MagFilter.LINEAR,
            Filament.WrapMode.CLAMP_TO_EDGE,
        );

        this.matinstance.setTextureParameter("albedo", albedo, sampler);
        this.matinstance.setTextureParameter("roughness", roughness, sampler);
        this.matinstance.setTextureParameter("metallic", metallic, sampler);
        this.matinstance.setTextureParameter("normal", normal, sampler);
        this.matinstance.setTextureParameter("ao", ao, sampler);
    };

    initialize() {
        this.scene = this.store.scene;
        this.engine = this.store.engine;

        const material = this.engine.createMaterial(this.filamat_url);

        // const material = this.engine.createMaterial(filamat_url);
        this.matinstance = material.createInstance();
        this.textured();

        // if (this.noMaps) {
        //     this.texturedTestParams();
        // } else {
        //     // TODO: fetch larger assets
        Filament.fetch(
            [
                urls.sky_large_url,
                urls.albedo_url,
                urls.roughness_url,
                urls.metallic_url,
                urls.normal_url,
                urls.ao_url,
                filamat_url1,
            ],
            () => {
                // this.matinstanceNoMap = material.createInstance();
                // this.texturedTestParams();
            },
        );
        // }

        reaction(
            () => this.transparency,
            () => {
                console.log(1);
                if (
                    (this.transparency &&
                        !this.matinstances[FilamatType.transparency]) ||
                    (!this.transparency &&
                        !this.matinstances[FilamatType.opaque])
                ) {
                    Filament.fetch([this.filamat_url], () => {
                        const material = this.engine.createMaterial(
                            this.filamat_url,
                        );
                        this.matinstance = material.createInstance();
                        this.transparency
                            ? (this.matinstances[
                                FilamatType.transparency
                            ] = this.matinstance)
                            : (this.matinstances[
                                FilamatType.opaque
                            ] = this.matinstance);
                        this.store.Model.updateFilamesh();
                        this.texturedTestParams();
                    });
                } else {
                    this.matinstance = this.matinstances[
                        this.transparency
                            ? FilamatType.transparency
                            : FilamatType.opaque
                    ];
                    this.store.Model.updateFilamesh();
                    this.texturedTestParams();
                }
            },
        );
    }

    @o
    switchFilamat() {
        this.transparency = !this.transparency;
    }

    @a
    updateMaterial(field: string, value: any) {
        this[field] = value;
        this.texturedTestParams();
    }
}

export { Material };
