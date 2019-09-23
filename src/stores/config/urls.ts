const testParams = true;

const ibl_suffix = Filament.getSupportedFormatSuffix("etc s3tc");
const albedo_suffix = Filament.getSupportedFormatSuffix("astc s3tc");
const texture_suffix = Filament.getSupportedFormatSuffix("etc");
const prefix = "/assets/models/monkey";

const environ = "syferfontein_18d_clear_2k";
const ibl_url = `${prefix}/${environ}/${environ}_ibl${ibl_suffix}.ktx`;
const sky_small_url = `${prefix}/${environ}/${environ}_skybox_tiny.ktx`;
const sky_large_url = `${prefix}/${environ}/${environ}_skybox.ktx`;
const albedo_url = `${prefix}/albedo${albedo_suffix}.ktx`;
const ao_url = `${prefix}/ao${texture_suffix}.ktx`;
const metallic_url = `${prefix}/metallic${texture_suffix}.ktx`;
const normal_url = `${prefix}/normal${texture_suffix}.ktx`;
const roughness_url = `${prefix}/roughness${texture_suffix}.ktx`;
const filamat_url = testParams
    ? `${prefix}/texturedTestParams.filamat`
    : `${prefix}/textured.filamat`;
const filamesh_url = testParams
    ? `${prefix}/suzanneTestParams.filamesh`
    : `${prefix}/suzanne.filamesh`;

const redball_filamat_url = "/assets/models/redball/plastic.filamat";

const urls = {
    ibl_url,
    sky_small_url,
    sky_large_url,
    albedo_url,
    ao_url,
    metallic_url,
    normal_url,
    roughness_url,
    filamat_url,
    filamesh_url,
    redball_filamat_url,
};

export { urls };
