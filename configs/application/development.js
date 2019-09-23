export default {
    host: global.window ? "dev.realibox.com" : "",
    apiHost: global.window ? global.window.location.protocol + "//" + global.window.location.hostname + "/api" : "",
    studioHost: global.window ? "//dev.studio.realibox.com" : "",
    liteHost: global.window ? "//dev.lite.realibox.com" : "",
    catalogHost: global.window ? "//dev.catalog.realibox.com" : "",
	assetPath: "/content/assets/",
	cookieDomain: '.realibox.com'
};
