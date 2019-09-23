import { urls } from "../config/urls";

class Model {
    store: any;
    scene: any;
    engine: any;
    skybox: any;
    matinstance: any;
    model: any;
    Material: any;

    AttributeType: any;
    IndexType: any;
    PrimitiveType: any;

    constructor() {
        this.store = $$.events.call("store");
    }

    initialize() {
        this.scene = this.store.scene;
        this.engine = this.store.engine;
        this.Material = this.store.Material;

        this.AttributeType = Filament.VertexBuffer$AttributeType;
        this.IndexType = Filament.IndexBuffer$IndexType;
        this.PrimitiveType = Filament.RenderableManager$PrimitiveType;

        const filamesh = this.engine.loadFilamesh(
            urls.filamesh_url,
            this.Material.matinstance,
        );
        this.model = filamesh.renderable;

        // 创建材质
        const material = this.engine.createMaterial(urls.redball_filamat_url);
        const matinstance = material.createInstance();

        const red = [0.8, 0.0, 0.0];
        matinstance.setColor3Parameter("baseColor", Filament.RgbType.sRGB, red);
        matinstance.setFloatParameter("roughness", 0.5);
        matinstance.setFloatParameter("clearCoat", 1.0);
        matinstance.setFloatParameter("clearCoatRoughness", 0.3);

        // 创建球体
        // const renderable = Filament.EntityManager.get().create();
        // this.scene.addEntity(renderable);

        // const icosphere = new Filament.IcoSphere(0);

        // const vb = Filament.VertexBuffer.Builder()
        //     .vertexCount(icosphere.vertices.length / 3)
        //     .bufferCount(2)
        //     .attribute(
        //         Filament.VertexAttribute.POSITION,
        //         0,
        //         this.AttributeType.FLOAT3,
        //         0,
        //         0,
        //     )
        //     .attribute(
        //         Filament.VertexAttribute.TANGENTS,
        //         1,
        //         this.AttributeType.SHORT4,
        //         0,
        //         0,
        //     )
        //     .normalized(Filament.VertexAttribute.TANGENTS)
        //     .build(this.engine);

        // const ib = Filament.IndexBuffer.Builder()
        //     .indexCount(icosphere.triangles.length)
        //     .bufferType(this.IndexType.USHORT)
        //     .build(this.engine);

        // vb.setBufferAt(this.engine, 0, icosphere.vertices);
        // vb.setBufferAt(this.engine, 1, icosphere.tangents);
        // ib.setBuffer(this.engine, icosphere.triangles);

        // Filament.RenderableManager.Builder(1)
        //     .boundingBox({ center: [-1, -1, -1], halfExtent: [0.1, 0.1, 0.1] })
        //     .material(0, matinstance)
        //     .geometry(0, this.PrimitiveType.TRIANGLES, vb, ib)
        //     .build(this.engine, renderable);
    }
}

export { Model };
