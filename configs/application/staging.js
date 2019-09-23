export default {
    host: global.window ? "staging.realibox.com" : "",
    apiHost: global.window ? global.window.location.protocol + "//" + global.window.location.hostname + "/api" : "",
    studioHost: global.window ? "//staging.studio.realibox.com" : "",
    liteHost: global.window ? "//staging.lite.realibox.com" : "",
    catalogHost: global.window ? "//staging.catalog.realibox.com" : "",
	assetPath: "/content/assets/",
	cookieDomain: '.realibox.com'
};
