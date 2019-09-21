export default {
    host: global.window ? "local.realibox.com" : "",
    apiHost: global.window ? global.window.location.protocol + "//" + global.window.location.hostname + "/api" : "",
    studioHost: global.window ? "//local.studio.realibox.com" : "",
    liteHost: global.window ? "//local.lite.realibox.com" : "",
    catalogHost: global.window ? "//local.catalog.realibox.com" : "",
	assetPath: "/content/assets/",
	cookieDomain: '.realibox.com'
};
