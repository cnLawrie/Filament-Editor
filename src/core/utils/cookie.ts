/**
 * From jQuery Cookie Plugin
 */

/*!
 * jQuery Cookie Plugin v1.4.1
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2006, 2014 Klaus Hartl
 * Released under the MIT license
 */

const pluses = /\+/g;

interface Options {
    raw?: boolean;
    json?: boolean;
    secure?: boolean;
    expires?: any;
    path?: string;
    domain?: string;
}

const encode = (s: string, options: Options = {}) => {
    return options.raw ? s : encodeURIComponent(s);
};

const decode = (s: any, options: Options = {}) => {
    return options.raw ? s : decodeURIComponent(s);
};

const stringifyCookieValue = (value: string, options: Options = {}) => {
    return encode(
        options.json ? JSON.stringify(value) : String(value),
        options,
    );
};

const parseCookieValue = (s: string, options: Options = {}) => {
    if (s.indexOf('"') === 0) {
        // This is a quoted cookie as according to RFC2068, unescape...
        s = s
            .slice(1, -1)
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");
    }
    try {
        // Replace server-side written pluses with spaces.
        // If we can't decode the cookie, ignore it, it's unusable.
        // If we can't parse the cookie, ignore it, it's unusable.
        s = decodeURIComponent(s.replace(pluses, " "));
        return options.json ? JSON.parse(s) : s;
    } catch (e) {
        console.error(e);
    }
};

const read = (
    s: string,
    converter?: (value: string) => void,
    options: Options = {},
) => {
    const value = options.raw ? s : parseCookieValue(s, options);
    return typeof converter === "function" ? converter(value) : value;
};

export const cookie = (key: string, value?: any, options: Options = {}) => {
    // Write
    if (value !== null && value !== undefined && typeof value !== "function") {
        options = Object.assign({}, options);

        if (typeof options.expires === "number") {
            const days = options.expires,
                t = (options.expires = new Date());
            t.setMilliseconds(t.getMilliseconds() + days * 864e5);
        }
        return (document.cookie = [
            encode(key, options),
            "=",
            stringifyCookieValue(value, options),
            options.expires ? "; expires=" + options.expires.toUTCString() : "", // use expires attribute, max-age is not supported by IE
            options.path ? "; path=" + options.path : "",
            options.domain ? "; domain=" + options.domain : "",
            options.secure ? "; secure" : "",
        ].join(""));
    }
    // Read
    let result: any = key ? undefined : {},
        i = 0;
    // To prevent the for loop in the first place assign an empty array
    // in case there are no cookies at all. Also prevents odd result when
    // calling $.cookie().
    const cookies: string[] = document.cookie
        ? document.cookie.split("; ")
        : [];
    const l: number = cookies.length;

    for (; i < l; i++) {
        const parts: string[] = cookies[i].split("=");
        const name: string = decode(parts.shift(), options);
        let cookie: string = parts.join("=");

        if (key === name) {
            // If second argument (value) is a function it's a converter...
            result = read(cookie, value, options);
            break;
        }

        // Prevent storing a cookie that we couldn't decode.
        if (!key && (cookie = read(cookie, undefined, options)) !== undefined) {
            result[name] = cookie;
        }
    }

    return result;
};

export const removeCookie = (key: string, options: Options = {}) => {
    // Must not alter options, thus extending a fresh object...
    cookie(key, "", Object.assign({}, options, { expires: -1 }));
    return !cookie(key, null, options);
};
