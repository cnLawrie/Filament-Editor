export default {
    host: global.window ? "internal.realibox.com" : "",
    apiHost: global.window ? global.window.location.protocol + "//" + global.window.location.hostname + "/api" : "",
    studioHost: global.window ? "//internal.studio.realibox.com" : "",
    liteHost: global.window ? "//internal.lite.realibox.com" : "",
    catalogHost: global.window ? "//internal.catalog.realibox.com" : "",
	assetPath: "/content/assets/",
	cookieDomain: '.realibox.com'
};
