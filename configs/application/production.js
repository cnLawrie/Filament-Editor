export default {
    host: global.window ? "realibox.com" : "",
    apiHost: global.window ? global.window.location.protocol + "//" + global.window.location.hostname + "/api" : "",
    studioHost: global.window ? "//studio.realibox.com" : "",
    liteHost: global.window ? "//lite.realibox.com" : "",
    catalogHost: global.window ? "//catalog.realibox.com" : "",
	assetPath: "/content/assets/",
	cookieDomain: '.realibox.com'
};
