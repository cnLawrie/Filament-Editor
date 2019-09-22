var Filament = (function(Filament) {
    Filament = Filament || {};
    
    Filament.remainingInitializationTasks = 1;

    /// init ::function:: Downloads assets, loads the Filament module, and invokes a callback when done.
    ///
    /// All JavaScript clients must call the init function, passing in a list of asset URL's and a
    /// callback. This callback gets invoked only after all assets have been downloaded and the Filament
    /// WebAssembly module has been loaded. Clients should only pass asset URL's that absolutely must
    /// be ready at initialization time.
    ///
    /// When the callback is called, each downloaded asset is available in the `Filament.assets` global
    /// object, which contains a mapping from URL's to Uint8Array objects and DOM images.
    ///
    /// assets ::argument:: Array of strings containing URL's of required assets.
    /// onready ::argument:: callback that gets invoked after all assets have been downloaded and the \
    /// Filament WebAssembly module has been loaded.
    Filament.init = function (assets, onready) {
      Filament.onReady = onready;
      Filament.remainingInitializationTasks += assets.length;
      Filament.assets = {};

      // Usage of glmatrix is optional. If it exists, then go ahead and augment it with some
      // useful math functions.
      if (typeof glMatrix !== 'undefined') {
        Filament.loadMathExtensions();
      }

      // Issue a fetch for each asset. After the last asset is downloaded, trigger the callback.
      Filament.fetch(assets, null, function (name) {
        if (--Filament.remainingInitializationTasks == 0 && Filament.onReady) {
          Filament.onReady();
        }
      });
    };

    // The postRun method is called by emscripten after it finishes compiling and instancing the
    // WebAssembly module. The JS classes that correspond to core Filament classes (e.g., Engine)
    // are not guaranteed to exist until this function is called.
    Filament.postRun = function () {
      Filament.loadClassExtensions();
      if (--Filament.remainingInitializationTasks == 0 && Filament.onReady) {
        Filament.onReady();
      }
    };

    /// fetch ::function:: Downloads assets and invokes a callback when done.
    /// assets ::argument:: Array of strings containing URL's of required assets.
    /// onDone ::argument:: callback that gets invoked after all assets have been downloaded.
    /// onFetch ::argument:: optional callback that's invoked after each asset is downloaded.
    Filament.fetch = function (assets, onDone, onFetched) {
      var remainingAssets = assets.length;
      assets.forEach(function (name) {
        const lower = name.toLowerCase();
        fetch(name).then(function (response) {
          if (!response.ok) {
            throw new Error(name);
          }
          return response.arrayBuffer();
        }).then(function (arrayBuffer) {
          Filament.assets[name] = new Uint8Array(arrayBuffer);
          if (onFetched) {
            onFetched(name);
          }
          if (--remainingAssets === 0 && onDone) {
            onDone();
          }
        });
      });
    };

    var Module = typeof Filament !== "undefined" ? Filament : {};
    var moduleOverrides = {};
    var key;
    for (key in Module) {
        if (Module.hasOwnProperty(key)) {
            moduleOverrides[key] = Module[key];
        }
    }
    Module["arguments"] = [];
    Module["thisProgram"] = "./this.program";
    Module["quit"] = function(status, toThrow) {
        throw toThrow;
    };
    Module["preRun"] = [];
    Module["postRun"] = [];
    var ENVIRONMENT_IS_WEB = false;
    var ENVIRONMENT_IS_WORKER = false;
    var ENVIRONMENT_IS_NODE = false;
    var ENVIRONMENT_IS_SHELL = false;
    var ENVIRONMENT_IS_WXAPP = false;
    ENVIRONMENT_IS_WEB = typeof window === "object";
	ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
	ENVIRONMENT_IS_WXAPP = typeof wx === "object" && typeof wx.canIUse === "function";
    ENVIRONMENT_IS_NODE =
        typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
    ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WXAPP && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
    var scriptDirectory = "";
    function locateFile(path) {
        if (Module["locateFile"]) {
            return Module["locateFile"](path, scriptDirectory);
        } else {
            return scriptDirectory + path;
        }
    }
    if (ENVIRONMENT_IS_NODE) {
        scriptDirectory = __dirname + "/";
        var nodeFS;
        var nodePath;
        Module["read"] = function shell_read(filename, binary) {
            var ret;
            if (!nodeFS) nodeFS = require("fs");
            if (!nodePath) nodePath = require("path");
            filename = nodePath["normalize"](filename);
            ret = nodeFS["readFileSync"](filename);
            return binary ? ret : ret.toString();
        };
        Module["readBinary"] = function readBinary(filename) {
            var ret = Module["read"](filename, true);
            if (!ret.buffer) {
                ret = new Uint8Array(ret);
            }
            assert(ret.buffer);
            return ret;
        };
        if (process["argv"].length > 1) {
            Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/");
        }
        Module["arguments"] = process["argv"].slice(2);
        process["on"]("uncaughtException", function(ex) {
            if (!(ex instanceof ExitStatus)) {
                throw ex;
            }
        });
        process["on"]("unhandledRejection", abort);
        Module["quit"] = function(status) {
            process["exit"](status);
        };
        Module["inspect"] = function() {
            return "[Emscripten Module object]";
        };
    } else if (ENVIRONMENT_IS_SHELL) {
        if (typeof read != "undefined") {
            Module["read"] = function shell_read(f) {
                return read(f);
            };
        }
        Module["readBinary"] = function readBinary(f) {
            var data;
            if (typeof readbuffer === "function") {
                return new Uint8Array(readbuffer(f));
            }
            data = read(f, "binary");
            assert(typeof data === "object");
            return data;
        };
        if (typeof scriptArgs != "undefined") {
            Module["arguments"] = scriptArgs;
        } else if (typeof arguments != "undefined") {
            Module["arguments"] = arguments;
        }
        if (typeof quit === "function") {
            Module["quit"] = function(status) {
                quit(status);
            };
        }
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
        if (ENVIRONMENT_IS_WORKER) {
            scriptDirectory = self.location.href;
        } else if (document.currentScript) {
            scriptDirectory = document.currentScript.src;
        }
        if (scriptDirectory.indexOf("blob:") !== 0) {
            scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1);
        } else {
            scriptDirectory = "";
        }
        Module["read"] = function shell_read(url) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.send(null);
            return xhr.responseText;
        };
        if (ENVIRONMENT_IS_WORKER) {
            Module["readBinary"] = function readBinary(url) {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, false);
                xhr.responseType = "arraybuffer";
                xhr.send(null);
                return new Uint8Array(xhr.response);
            };
        }
        Module["readAsync"] = function readAsync(url, onload, onerror) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = function xhr_onload() {
                if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
                    onload(xhr.response);
                    return;
                }
                onerror();
            };
            xhr.onerror = onerror;
            xhr.send(null);
        };
        Module["setWindowTitle"] = function(title) {
            document.title = title;
        };
    } else if(ENVIRONMENT_IS_WXAPP) {
		var FileSystemManager = wx.getFileSystemManager()

        Module["readBinary"] = function readBinary(f) {
            var data;
            data = FileSystemManager.readFileSync(f);
            assert(typeof data === "object");
            return data;
        };
        if (typeof quit === "function") {
            Module["quit"] = function(status) {
                quit(status);
            };
        }
		
    }else{}
    var out =
        Module["print"] ||
        (typeof console !== "undefined" ? console.log.bind(console) : typeof print !== "undefined" ? print : null);
    var err =
        Module["printErr"] ||
        (typeof printErr !== "undefined"
            ? printErr
            : (typeof console !== "undefined" && console.warn.bind(console)) || out);
    for (key in moduleOverrides) {
        if (moduleOverrides.hasOwnProperty(key)) {
            Module[key] = moduleOverrides[key];
        }
    }
    moduleOverrides = undefined;
    var STACK_ALIGN = 16;
    function dynamicAlloc(size) {
        var ret = HEAP32[DYNAMICTOP_PTR >> 2];
        var end = (ret + size + 15) & -16;
        if (end <= _emscripten_get_heap_size()) {
            HEAP32[DYNAMICTOP_PTR >> 2] = end;
        } else {
            var success = _emscripten_resize_heap(end);
            if (!success) return 0;
        }
        return ret;
    }
    function getNativeTypeSize(type) {
        switch (type) {
            case "i1":
            case "i8":
                return 1;
            case "i16":
                return 2;
            case "i32":
                return 4;
            case "i64":
                return 8;
            case "float":
                return 4;
            case "double":
                return 8;
            default: {
                if (type[type.length - 1] === "*") {
                    return 4;
                } else if (type[0] === "i") {
                    var bits = parseInt(type.substr(1));
                    assert(bits % 8 === 0, "getNativeTypeSize invalid bits " + bits + ", type " + type);
                    return bits / 8;
                } else {
                    return 0;
                }
            }
        }
    }
    function warnOnce(text) {
        if (!warnOnce.shown) warnOnce.shown = {};
        if (!warnOnce.shown[text]) {
            warnOnce.shown[text] = 1;
            err(text);
        }
    }
    var asm2wasmImports = {
        "f64-rem": function(x, y) {
            return x % y;
        },
        debugger: function() {
            debugger;
        }
    };
    var jsCallStartIndex = 1;
    var functionPointers = new Array(0);
    var funcWrappers = {};
    function makeBigInt(low, high, unsigned) {
        return unsigned ? +(low >>> 0) + +(high >>> 0) * 4294967296 : +(low >>> 0) + +(high | 0) * 4294967296;
    }
    function dynCall(sig, ptr, args) {
        if (args && args.length) {
            return Module["dynCall_" + sig].apply(null, [ptr].concat(args));
        } else {
            return Module["dynCall_" + sig].call(null, ptr);
        }
    }
    var tempRet0 = 0;
    var setTempRet0 = function(value) {
        tempRet0 = value;
    };
    var getTempRet0 = function() {
        return tempRet0;
    };
    if (typeof WebAssembly !== "object") {
        err("no native wasm support detected");
    }
    var wasmMemory;
    var wasmTable;
    var ABORT = false;
    var EXITSTATUS = 0;
    function assert(condition, text) {
        if (!condition) {
            abort("Assertion failed: " + text);
        }
    }
    function getCFunc(ident) {
        var func = Module["_" + ident];
        assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
        return func;
    }
    function ccall(ident, returnType, argTypes, args, opts) {
        var toC = {
            string: function(str) {
                var ret = 0;
                if (str !== null && str !== undefined && str !== 0) {
                    var len = (str.length << 2) + 1;
                    ret = stackAlloc(len);
                    stringToUTF8(str, ret, len);
                }
                return ret;
            },
            array: function(arr) {
                var ret = stackAlloc(arr.length);
                writeArrayToMemory(arr, ret);
                return ret;
            }
        };
        function convertReturnValue(ret) {
            if (returnType === "string") return UTF8ToString(ret);
            if (returnType === "boolean") return Boolean(ret);
            return ret;
        }
        var func = getCFunc(ident);
        var cArgs = [];
        var stack = 0;
        if (args) {
            for (var i = 0; i < args.length; i++) {
                var converter = toC[argTypes[i]];
                if (converter) {
                    if (stack === 0) stack = stackSave();
                    cArgs[i] = converter(args[i]);
                } else {
                    cArgs[i] = args[i];
                }
            }
        }
        var ret = func.apply(null, cArgs);
        ret = convertReturnValue(ret);
        if (stack !== 0) stackRestore(stack);
        return ret;
    }
    function setValue(ptr, value, type, noSafe) {
        type = type || "i8";
        if (type.charAt(type.length - 1) === "*") type = "i32";
        switch (type) {
            case "i1":
                HEAP8[ptr >> 0] = value;
                break;
            case "i8":
                HEAP8[ptr >> 0] = value;
                break;
            case "i16":
                HEAP16[ptr >> 1] = value;
                break;
            case "i32":
                HEAP32[ptr >> 2] = value;
                break;
            case "i64":
                (tempI64 = [
                    value >>> 0,
                    ((tempDouble = value),
                    +Math_abs(tempDouble) >= 1
                        ? tempDouble > 0
                            ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0
                            : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
                        : 0)
                ]),
                    (HEAP32[ptr >> 2] = tempI64[0]),
                    (HEAP32[(ptr + 4) >> 2] = tempI64[1]);
                break;
            case "float":
                HEAPF32[ptr >> 2] = value;
                break;
            case "double":
                HEAPF64[ptr >> 3] = value;
                break;
            default:
                abort("invalid type for setValue: " + type);
        }
    }
    var ALLOC_NONE = 3;
    function allocate(slab, types, allocator, ptr) {
        var zeroinit, size;
        if (typeof slab === "number") {
            zeroinit = true;
            size = slab;
        } else {
            zeroinit = false;
            size = slab.length;
        }
        var singleType = typeof types === "string" ? types : null;
        var ret;
        if (allocator == ALLOC_NONE) {
            ret = ptr;
        } else {
            ret = [_malloc, stackAlloc, dynamicAlloc][allocator](Math.max(size, singleType ? 1 : types.length));
        }
        if (zeroinit) {
            var stop;
            ptr = ret;
            assert((ret & 3) == 0);
            stop = ret + (size & ~3);
            for (; ptr < stop; ptr += 4) {
                HEAP32[ptr >> 2] = 0;
            }
            stop = ret + size;
            while (ptr < stop) {
                HEAP8[ptr++ >> 0] = 0;
            }
            return ret;
        }
        if (singleType === "i8") {
            if (slab.subarray || slab.slice) {
                HEAPU8.set(slab, ret);
            } else {
                HEAPU8.set(new Uint8Array(slab), ret);
            }
            return ret;
        }
        var i = 0,
            type,
            typeSize,
            previousType;
        while (i < size) {
            var curr = slab[i];
            type = singleType || types[i];
            if (type === 0) {
                i++;
                continue;
            }
            if (type == "i64") type = "i32";
            setValue(ret + i, curr, type);
            if (previousType !== type) {
                typeSize = getNativeTypeSize(type);
                previousType = type;
            }
            i += typeSize;
        }
        return ret;
    }
    var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;
    function UTF8ArrayToString(u8Array, idx, maxBytesToRead) {
        var endIdx = idx + maxBytesToRead;
        var endPtr = idx;
        while (u8Array[endPtr] && !(endPtr >= endIdx)) ++endPtr;
        if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
            return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
        } else {
            var str = "";
            while (idx < endPtr) {
                var u0 = u8Array[idx++];
                if (!(u0 & 128)) {
                    str += String.fromCharCode(u0);
                    continue;
                }
                var u1 = u8Array[idx++] & 63;
                if ((u0 & 224) == 192) {
                    str += String.fromCharCode(((u0 & 31) << 6) | u1);
                    continue;
                }
                var u2 = u8Array[idx++] & 63;
                if ((u0 & 240) == 224) {
                    u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
                } else {
                    u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (u8Array[idx++] & 63);
                }
                if (u0 < 65536) {
                    str += String.fromCharCode(u0);
                } else {
                    var ch = u0 - 65536;
                    str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
                }
            }
        }
        return str;
    }
    function UTF8ToString(ptr, maxBytesToRead) {
        return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    }
    function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
        if (!(maxBytesToWrite > 0)) return 0;
        var startIdx = outIdx;
        var endIdx = outIdx + maxBytesToWrite - 1;
        for (var i = 0; i < str.length; ++i) {
            var u = str.charCodeAt(i);
            if (u >= 55296 && u <= 57343) {
                var u1 = str.charCodeAt(++i);
                u = (65536 + ((u & 1023) << 10)) | (u1 & 1023);
            }
            if (u <= 127) {
                if (outIdx >= endIdx) break;
                outU8Array[outIdx++] = u;
            } else if (u <= 2047) {
                if (outIdx + 1 >= endIdx) break;
                outU8Array[outIdx++] = 192 | (u >> 6);
                outU8Array[outIdx++] = 128 | (u & 63);
            } else if (u <= 65535) {
                if (outIdx + 2 >= endIdx) break;
                outU8Array[outIdx++] = 224 | (u >> 12);
                outU8Array[outIdx++] = 128 | ((u >> 6) & 63);
                outU8Array[outIdx++] = 128 | (u & 63);
            } else {
                if (outIdx + 3 >= endIdx) break;
                outU8Array[outIdx++] = 240 | (u >> 18);
                outU8Array[outIdx++] = 128 | ((u >> 12) & 63);
                outU8Array[outIdx++] = 128 | ((u >> 6) & 63);
                outU8Array[outIdx++] = 128 | (u & 63);
            }
        }
        outU8Array[outIdx] = 0;
        return outIdx - startIdx;
    }
    function stringToUTF8(str, outPtr, maxBytesToWrite) {
        return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    }
    function lengthBytesUTF8(str) {
        var len = 0;
        for (var i = 0; i < str.length; ++i) {
            var u = str.charCodeAt(i);
            if (u >= 55296 && u <= 57343) u = (65536 + ((u & 1023) << 10)) | (str.charCodeAt(++i) & 1023);
            if (u <= 127) ++len;
            else if (u <= 2047) len += 2;
            else if (u <= 65535) len += 3;
            else len += 4;
        }
        return len;
    }
    var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;
    function writeArrayToMemory(array, buffer) {
        HEAP8.set(array, buffer);
    }
    function writeAsciiToMemory(str, buffer, dontAddNull) {
        for (var i = 0; i < str.length; ++i) {
            HEAP8[buffer++ >> 0] = str.charCodeAt(i);
        }
        if (!dontAddNull) HEAP8[buffer >> 0] = 0;
    }
    function demangle(func) {
        return func;
    }
    function demangleAll(text) {
        var regex = /__Z[\w\d_]+/g;
        return text.replace(regex, function(x) {
            var y = demangle(x);
            return x === y ? x : y + " [" + x + "]";
        });
    }
    function jsStackTrace() {
        var err = new Error();
        if (!err.stack) {
            try {
                throw new Error(0);
            } catch (e) {
                err = e;
            }
            if (!err.stack) {
                return "(no stack trace available)";
            }
        }
        return err.stack.toString();
    }
    function stackTrace() {
        var js = jsStackTrace();
        if (Module["extraStackTrace"]) js += "\n" + Module["extraStackTrace"]();
        return demangleAll(js);
    }
    var PAGE_SIZE = 16384;
    var WASM_PAGE_SIZE = 65536;
    function alignUp(x, multiple) {
        if (x % multiple > 0) {
            x += multiple - (x % multiple);
        }
        return x;
    }
    var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    function updateGlobalBuffer(buf) {
        Module["buffer"] = buffer = buf;
    }
    function updateGlobalBufferViews() {
        Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
        Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
        Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
        Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
        Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
        Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
        Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
        Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer);
    }
    var STACK_BASE = 530176,
        DYNAMIC_BASE = 5773056,
        DYNAMICTOP_PTR = 529920;
    var TOTAL_STACK = 5242880;
    var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;
    if (TOTAL_MEMORY < TOTAL_STACK)
        err(
            "TOTAL_MEMORY should be larger than TOTAL_STACK, was " +
                TOTAL_MEMORY +
                "! (TOTAL_STACK=" +
                TOTAL_STACK +
                ")"
        );
    if (Module["buffer"]) {
        buffer = Module["buffer"];
    } else {
        if (typeof WebAssembly === "object" && typeof WebAssembly.Memory === "function") {
            wasmMemory = new WebAssembly.Memory({ initial: TOTAL_MEMORY / WASM_PAGE_SIZE });
            buffer = wasmMemory.buffer;
        } else {
            buffer = new ArrayBuffer(TOTAL_MEMORY);
        }
        Module["buffer"] = buffer;
    }
    updateGlobalBufferViews();
    HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
    function callRuntimeCallbacks(callbacks) {
        while (callbacks.length > 0) {
            var callback = callbacks.shift();
            if (typeof callback == "function") {
                callback();
                continue;
            }
            var func = callback.func;
            if (typeof func === "number") {
                if (callback.arg === undefined) {
                    Module["dynCall_v"](func);
                } else {
                    Module["dynCall_vi"](func, callback.arg);
                }
            } else {
                func(callback.arg === undefined ? null : callback.arg);
            }
        }
    }
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATMAIN__ = [];
    var __ATPOSTRUN__ = [];
    var runtimeInitialized = false;
    var runtimeExited = false;
    function preRun() {
        if (Module["preRun"]) {
            if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
            while (Module["preRun"].length) {
                addOnPreRun(Module["preRun"].shift());
            }
        }
        callRuntimeCallbacks(__ATPRERUN__);
    }
    function ensureInitRuntime() {
        if (runtimeInitialized) return;
        runtimeInitialized = true;
        if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
        TTY.init();
        callRuntimeCallbacks(__ATINIT__);
    }
    function preMain() {
        FS.ignorePermissions = false;
        callRuntimeCallbacks(__ATMAIN__);
    }
    function exitRuntime() {
        runtimeExited = true;
    }
    function postRun() {
        if (Module["postRun"]) {
            if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
            while (Module["postRun"].length) {
                addOnPostRun(Module["postRun"].shift());
            }
        }
        callRuntimeCallbacks(__ATPOSTRUN__);
    }
    function addOnPreRun(cb) {
        __ATPRERUN__.unshift(cb);
    }
    function addOnPostRun(cb) {
        __ATPOSTRUN__.unshift(cb);
    }
    var Math_abs = Math.abs;
    var Math_ceil = Math.ceil;
    var Math_floor = Math.floor;
    var Math_min = Math.min;
    var runDependencies = 0;
    var runDependencyWatcher = null;
    var dependenciesFulfilled = null;
    function getUniqueRunDependency(id) {
        return id;
    }
    function addRunDependency(id) {
        runDependencies++;
        if (Module["monitorRunDependencies"]) {
            Module["monitorRunDependencies"](runDependencies);
        }
    }
    function removeRunDependency(id) {
        runDependencies--;
        if (Module["monitorRunDependencies"]) {
            Module["monitorRunDependencies"](runDependencies);
        }
        if (runDependencies == 0) {
            if (runDependencyWatcher !== null) {
                clearInterval(runDependencyWatcher);
                runDependencyWatcher = null;
            }
            if (dependenciesFulfilled) {
                var callback = dependenciesFulfilled;
                dependenciesFulfilled = null;
                callback();
            }
        }
    }
    Module["preloadedImages"] = {};
    Module["preloadedAudios"] = {};
    var dataURIPrefix = "data:application/octet-stream;base64,";
    function isDataURI(filename) {
        return String.prototype.startsWith ? filename.startsWith(dataURIPrefix) : filename.indexOf(dataURIPrefix) === 0;
    }
    var wasmBinaryFile = "filament.wasm";
    if (!isDataURI(wasmBinaryFile)) {
        wasmBinaryFile = locateFile(wasmBinaryFile);
    }
    function getBinary() {
        try {
            if (Module["wasmBinary"]) {
                return new Uint8Array(Module["wasmBinary"]);
            }
            if (Module["readBinary"]) {
                return Module["readBinary"](wasmBinaryFile);
            } else {
                throw "both async and sync fetching of the wasm failed";
            }
        } catch (err) {
            abort(err);
        }
    }
    function getBinaryPromise() {
        if (!Module["wasmBinary"] && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === "function") {
            return fetch(wasmBinaryFile, { credentials: "same-origin" })
                .then(function(response) {
                    if (!response["ok"]) {
                        throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
                    }
                    return response["arrayBuffer"]();
                })
                .catch(function() {
                    return getBinary();
                });
        }
        return new Promise(function(resolve, reject) {
            resolve(getBinary());
        });
    }
    function createWasm(env) {
        var info = {
            env: env,
            global: { NaN: NaN, Infinity: Infinity },
            "global.Math": Math,
            asm2wasm: asm2wasmImports
        };
        function receiveInstance(instance, module) {
            var exports = instance.exports;
            Module["asm"] = exports;
            removeRunDependency("wasm-instantiate");
        }
        addRunDependency("wasm-instantiate");
        if (Module["instantiateWasm"]) {
            try {
                return Module["instantiateWasm"](info, receiveInstance);
            } catch (e) {
                err("Module.instantiateWasm callback failed with error: " + e);
                return false;
            }
        }
        function receiveInstantiatedSource(output) {
            receiveInstance(output["instance"]);
        }
        function instantiateArrayBuffer(receiver) {
            getBinaryPromise()
                .then(function(binary) {
                    return WebAssembly.instantiate(binary, info);
                })
                .then(receiver, function(reason) {
                    err("failed to asynchronously prepare wasm: " + reason);
                    abort(reason);
                });
        }
        if (
            !Module["wasmBinary"] &&
            typeof WebAssembly.instantiateStreaming === "function" &&
            !isDataURI(wasmBinaryFile) &&
            typeof fetch === "function"
        ) {
            WebAssembly.instantiateStreaming(fetch(wasmBinaryFile, { credentials: "same-origin" }), info).then(
                receiveInstantiatedSource,
                function(reason) {
                    err("wasm streaming compile failed: " + reason);
                    err("falling back to ArrayBuffer instantiation");
                    instantiateArrayBuffer(receiveInstantiatedSource);
                }
            );
        } else {
            instantiateArrayBuffer(receiveInstantiatedSource);
        }
        return {};
    }
    Module["asm"] = function(global, env, providedBuffer) {
        env["memory"] = wasmMemory;
        env["table"] = wasmTable = new WebAssembly.Table({ initial: 2128, maximum: 2128, element: "anyfunc" });
        env["__memory_base"] = 1024;
        env["__table_base"] = 0;
        var exports = createWasm(env);
        return exports;
    };
    __ATINIT__.push({
        func: function() {
            globalCtors();
        }
    });
    var tempDoublePtr = 530160;
    function ___atomic_compare_exchange_8(ptr, expected, desiredl, desiredh, weak, success_memmodel, failure_memmodel) {
        var pl = HEAP32[ptr >> 2];
        var ph = HEAP32[(ptr + 4) >> 2];
        var el = HEAP32[expected >> 2];
        var eh = HEAP32[(expected + 4) >> 2];
        if (pl === el && ph === eh) {
            HEAP32[ptr >> 2] = desiredl;
            HEAP32[(ptr + 4) >> 2] = desiredh;
            return 1;
        } else {
            HEAP32[expected >> 2] = pl;
            HEAP32[(expected + 4) >> 2] = ph;
            return 0;
        }
    }
    function ___atomic_fetch_sub_8(ptr, vall, valh, memmodel) {
        var l = HEAP32[ptr >> 2];
        var h = HEAP32[(ptr + 4) >> 2];
        HEAP32[ptr >> 2] = _i64Subtract(l, h, vall, valh);
        HEAP32[(ptr + 4) >> 2] = getTempRet0();
        return (setTempRet0(h), l) | 0;
    }
    function __ZSt18uncaught_exceptionv() {
        return !!__ZSt18uncaught_exceptionv.uncaught_exception;
    }
    function ___cxa_free_exception(ptr) {
        try {
            return _free(ptr);
        } catch (e) {}
    }
    var EXCEPTIONS = {
        last: 0,
        caught: [],
        infos: {},
        deAdjust: function(adjusted) {
            if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
            for (var key in EXCEPTIONS.infos) {
                var ptr = +key;
                var adj = EXCEPTIONS.infos[ptr].adjusted;
                var len = adj.length;
                for (var i = 0; i < len; i++) {
                    if (adj[i] === adjusted) {
                        return ptr;
                    }
                }
            }
            return adjusted;
        },
        addRef: function(ptr) {
            if (!ptr) return;
            var info = EXCEPTIONS.infos[ptr];
            info.refcount++;
        },
        decRef: function(ptr) {
            if (!ptr) return;
            var info = EXCEPTIONS.infos[ptr];
            assert(info.refcount > 0);
            info.refcount--;
            if (info.refcount === 0 && !info.rethrown) {
                if (info.destructor) {
                    Module["dynCall_vi"](info.destructor, ptr);
                }
                delete EXCEPTIONS.infos[ptr];
                ___cxa_free_exception(ptr);
            }
        },
        clearRef: function(ptr) {
            if (!ptr) return;
            var info = EXCEPTIONS.infos[ptr];
            info.refcount = 0;
        }
    };
    function ___cxa_begin_catch(ptr) {
        var info = EXCEPTIONS.infos[ptr];
        if (info && !info.caught) {
            info.caught = true;
            __ZSt18uncaught_exceptionv.uncaught_exception--;
        }
        if (info) info.rethrown = false;
        EXCEPTIONS.caught.push(ptr);
        EXCEPTIONS.addRef(EXCEPTIONS.deAdjust(ptr));
        return ptr;
    }
    function ___cxa_pure_virtual() {
        ABORT = true;
        throw "Pure virtual function called!";
    }
    function ___resumeException(ptr) {
        if (!EXCEPTIONS.last) {
            EXCEPTIONS.last = ptr;
        }
        throw ptr;
    }
    function ___cxa_find_matching_catch() {
        var thrown = EXCEPTIONS.last;
        if (!thrown) {
            return (setTempRet0(0), 0) | 0;
        }
        var info = EXCEPTIONS.infos[thrown];
        var throwntype = info.type;
        if (!throwntype) {
            return (setTempRet0(0), thrown) | 0;
        }
        var typeArray = Array.prototype.slice.call(arguments);
        var pointer = Module["___cxa_is_pointer_type"](throwntype);
        if (!___cxa_find_matching_catch.buffer) ___cxa_find_matching_catch.buffer = _malloc(4);
        HEAP32[___cxa_find_matching_catch.buffer >> 2] = thrown;
        thrown = ___cxa_find_matching_catch.buffer;
        for (var i = 0; i < typeArray.length; i++) {
            if (typeArray[i] && Module["___cxa_can_catch"](typeArray[i], throwntype, thrown)) {
                thrown = HEAP32[thrown >> 2];
                info.adjusted.push(thrown);
                return (setTempRet0(typeArray[i]), thrown) | 0;
            }
        }
        thrown = HEAP32[thrown >> 2];
        return (setTempRet0(throwntype), thrown) | 0;
    }
    function ___gxx_personality_v0() {}
    function ___setErrNo(value) {
        if (Module["___errno_location"]) HEAP32[Module["___errno_location"]() >> 2] = value;
        return value;
    }
    var PATH = {
        splitPath: function(filename) {
            var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
            return splitPathRe.exec(filename).slice(1);
        },
        normalizeArray: function(parts, allowAboveRoot) {
            var up = 0;
            for (var i = parts.length - 1; i >= 0; i--) {
                var last = parts[i];
                if (last === ".") {
                    parts.splice(i, 1);
                } else if (last === "..") {
                    parts.splice(i, 1);
                    up++;
                } else if (up) {
                    parts.splice(i, 1);
                    up--;
                }
            }
            if (allowAboveRoot) {
                for (; up; up--) {
                    parts.unshift("..");
                }
            }
            return parts;
        },
        normalize: function(path) {
            var isAbsolute = path.charAt(0) === "/",
                trailingSlash = path.substr(-1) === "/";
            path = PATH.normalizeArray(
                path.split("/").filter(function(p) {
                    return !!p;
                }),
                !isAbsolute
            ).join("/");
            if (!path && !isAbsolute) {
                path = ".";
            }
            if (path && trailingSlash) {
                path += "/";
            }
            return (isAbsolute ? "/" : "") + path;
        },
        dirname: function(path) {
            var result = PATH.splitPath(path),
                root = result[0],
                dir = result[1];
            if (!root && !dir) {
                return ".";
            }
            if (dir) {
                dir = dir.substr(0, dir.length - 1);
            }
            return root + dir;
        },
        basename: function(path) {
            if (path === "/") return "/";
            var lastSlash = path.lastIndexOf("/");
            if (lastSlash === -1) return path;
            return path.substr(lastSlash + 1);
        },
        extname: function(path) {
            return PATH.splitPath(path)[3];
        },
        join: function() {
            var paths = Array.prototype.slice.call(arguments, 0);
            return PATH.normalize(paths.join("/"));
        },
        join2: function(l, r) {
            return PATH.normalize(l + "/" + r);
        },
        resolve: function() {
            var resolvedPath = "",
                resolvedAbsolute = false;
            for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
                var path = i >= 0 ? arguments[i] : FS.cwd();
                if (typeof path !== "string") {
                    throw new TypeError("Arguments to path.resolve must be strings");
                } else if (!path) {
                    return "";
                }
                resolvedPath = path + "/" + resolvedPath;
                resolvedAbsolute = path.charAt(0) === "/";
            }
            resolvedPath = PATH.normalizeArray(
                resolvedPath.split("/").filter(function(p) {
                    return !!p;
                }),
                !resolvedAbsolute
            ).join("/");
            return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
        },
        relative: function(from, to) {
            from = PATH.resolve(from).substr(1);
            to = PATH.resolve(to).substr(1);
            function trim(arr) {
                var start = 0;
                for (; start < arr.length; start++) {
                    if (arr[start] !== "") break;
                }
                var end = arr.length - 1;
                for (; end >= 0; end--) {
                    if (arr[end] !== "") break;
                }
                if (start > end) return [];
                return arr.slice(start, end - start + 1);
            }
            var fromParts = trim(from.split("/"));
            var toParts = trim(to.split("/"));
            var length = Math.min(fromParts.length, toParts.length);
            var samePartsLength = length;
            for (var i = 0; i < length; i++) {
                if (fromParts[i] !== toParts[i]) {
                    samePartsLength = i;
                    break;
                }
            }
            var outputParts = [];
            for (var i = samePartsLength; i < fromParts.length; i++) {
                outputParts.push("..");
            }
            outputParts = outputParts.concat(toParts.slice(samePartsLength));
            return outputParts.join("/");
        }
    };
    var TTY = {
        ttys: [],
        init: function() {},
        shutdown: function() {},
        register: function(dev, ops) {
            TTY.ttys[dev] = { input: [], output: [], ops: ops };
            FS.registerDevice(dev, TTY.stream_ops);
        },
        stream_ops: {
            open: function(stream) {
                var tty = TTY.ttys[stream.node.rdev];
                if (!tty) {
                    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
                }
                stream.tty = tty;
                stream.seekable = false;
            },
            close: function(stream) {
                stream.tty.ops.flush(stream.tty);
            },
            flush: function(stream) {
                stream.tty.ops.flush(stream.tty);
            },
            read: function(stream, buffer, offset, length, pos) {
                if (!stream.tty || !stream.tty.ops.get_char) {
                    throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
                }
                var bytesRead = 0;
                for (var i = 0; i < length; i++) {
                    var result;
                    try {
                        result = stream.tty.ops.get_char(stream.tty);
                    } catch (e) {
                        throw new FS.ErrnoError(ERRNO_CODES.EIO);
                    }
                    if (result === undefined && bytesRead === 0) {
                        throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
                    }
                    if (result === null || result === undefined) break;
                    bytesRead++;
                    buffer[offset + i] = result;
                }
                if (bytesRead) {
                    stream.node.timestamp = Date.now();
                }
                return bytesRead;
            },
            write: function(stream, buffer, offset, length, pos) {
                if (!stream.tty || !stream.tty.ops.put_char) {
                    throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
                }
                try {
                    for (var i = 0; i < length; i++) {
                        stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
                    }
                } catch (e) {
                    throw new FS.ErrnoError(ERRNO_CODES.EIO);
                }
                if (length) {
                    stream.node.timestamp = Date.now();
                }
                return i;
            }
        },
        default_tty_ops: {
            get_char: function(tty) {
                if (!tty.input.length) {
                    var result = null;
                    if (ENVIRONMENT_IS_NODE) {
                        var BUFSIZE = 256;
                        var buf = new Buffer(BUFSIZE);
                        var bytesRead = 0;
                        var isPosixPlatform = process.platform != "win32";
                        var fd = process.stdin.fd;
                        if (isPosixPlatform) {
                            var usingDevice = false;
                            try {
                                fd = fs.openSync("/dev/stdin", "r");
                                usingDevice = true;
                            } catch (e) {}
                        }
                        try {
                            bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
                        } catch (e) {
                            if (e.toString().indexOf("EOF") != -1) bytesRead = 0;
                            else throw e;
                        }
                        if (usingDevice) {
                            fs.closeSync(fd);
                        }
                        if (bytesRead > 0) {
                            result = buf.slice(0, bytesRead).toString("utf-8");
                        } else {
                            result = null;
                        }
                    } else if (typeof window != "undefined" && typeof window.prompt == "function") {
                        result = window.prompt("Input: ");
                        if (result !== null) {
                            result += "\n";
                        }
                    } else if (typeof readline == "function") {
                        result = readline();
                        if (result !== null) {
                            result += "\n";
                        }
                    }
                    if (!result) {
                        return null;
                    }
                    tty.input = intArrayFromString(result, true);
                }
                return tty.input.shift();
            },
            put_char: function(tty, val) {
                if (val === null || val === 10) {
                    out(UTF8ArrayToString(tty.output, 0));
                    tty.output = [];
                } else {
                    if (val != 0) tty.output.push(val);
                }
            },
            flush: function(tty) {
                if (tty.output && tty.output.length > 0) {
                    out(UTF8ArrayToString(tty.output, 0));
                    tty.output = [];
                }
            }
        },
        default_tty1_ops: {
            put_char: function(tty, val) {
                if (val === null || val === 10) {
                    err(UTF8ArrayToString(tty.output, 0));
                    tty.output = [];
                } else {
                    if (val != 0) tty.output.push(val);
                }
            },
            flush: function(tty) {
                if (tty.output && tty.output.length > 0) {
                    err(UTF8ArrayToString(tty.output, 0));
                    tty.output = [];
                }
            }
        }
    };
    var MEMFS = {
        ops_table: null,
        mount: function(mount) {
            return MEMFS.createNode(null, "/", 16384 | 511, 0);
        },
        createNode: function(parent, name, mode, dev) {
            if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
                throw new FS.ErrnoError(ERRNO_CODES.EPERM);
            }
            if (!MEMFS.ops_table) {
                MEMFS.ops_table = {
                    dir: {
                        node: {
                            getattr: MEMFS.node_ops.getattr,
                            setattr: MEMFS.node_ops.setattr,
                            lookup: MEMFS.node_ops.lookup,
                            mknod: MEMFS.node_ops.mknod,
                            rename: MEMFS.node_ops.rename,
                            unlink: MEMFS.node_ops.unlink,
                            rmdir: MEMFS.node_ops.rmdir,
                            readdir: MEMFS.node_ops.readdir,
                            symlink: MEMFS.node_ops.symlink
                        },
                        stream: { llseek: MEMFS.stream_ops.llseek }
                    },
                    file: {
                        node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr },
                        stream: {
                            llseek: MEMFS.stream_ops.llseek,
                            read: MEMFS.stream_ops.read,
                            write: MEMFS.stream_ops.write,
                            allocate: MEMFS.stream_ops.allocate,
                            mmap: MEMFS.stream_ops.mmap,
                            msync: MEMFS.stream_ops.msync
                        }
                    },
                    link: {
                        node: {
                            getattr: MEMFS.node_ops.getattr,
                            setattr: MEMFS.node_ops.setattr,
                            readlink: MEMFS.node_ops.readlink
                        },
                        stream: {}
                    },
                    chrdev: {
                        node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr },
                        stream: FS.chrdev_stream_ops
                    }
                };
            }
            var node = FS.createNode(parent, name, mode, dev);
            if (FS.isDir(node.mode)) {
                node.node_ops = MEMFS.ops_table.dir.node;
                node.stream_ops = MEMFS.ops_table.dir.stream;
                node.contents = {};
            } else if (FS.isFile(node.mode)) {
                node.node_ops = MEMFS.ops_table.file.node;
                node.stream_ops = MEMFS.ops_table.file.stream;
                node.usedBytes = 0;
                node.contents = null;
            } else if (FS.isLink(node.mode)) {
                node.node_ops = MEMFS.ops_table.link.node;
                node.stream_ops = MEMFS.ops_table.link.stream;
            } else if (FS.isChrdev(node.mode)) {
                node.node_ops = MEMFS.ops_table.chrdev.node;
                node.stream_ops = MEMFS.ops_table.chrdev.stream;
            }
            node.timestamp = Date.now();
            if (parent) {
                parent.contents[name] = node;
            }
            return node;
        },
        getFileDataAsRegularArray: function(node) {
            if (node.contents && node.contents.subarray) {
                var arr = [];
                for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
                return arr;
            }
            return node.contents;
        },
        getFileDataAsTypedArray: function(node) {
            if (!node.contents) return new Uint8Array();
            if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
            return new Uint8Array(node.contents);
        },
        expandFileStorage: function(node, newCapacity) {
            var prevCapacity = node.contents ? node.contents.length : 0;
            if (prevCapacity >= newCapacity) return;
            var CAPACITY_DOUBLING_MAX = 1024 * 1024;
            newCapacity = Math.max(
                newCapacity,
                (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125)) | 0
            );
            if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
            var oldContents = node.contents;
            node.contents = new Uint8Array(newCapacity);
            if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
            return;
        },
        resizeFileStorage: function(node, newSize) {
            if (node.usedBytes == newSize) return;
            if (newSize == 0) {
                node.contents = null;
                node.usedBytes = 0;
                return;
            }
            if (!node.contents || node.contents.subarray) {
                var oldContents = node.contents;
                node.contents = new Uint8Array(new ArrayBuffer(newSize));
                if (oldContents) {
                    node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
                }
                node.usedBytes = newSize;
                return;
            }
            if (!node.contents) node.contents = [];
            if (node.contents.length > newSize) node.contents.length = newSize;
            else while (node.contents.length < newSize) node.contents.push(0);
            node.usedBytes = newSize;
        },
        node_ops: {
            getattr: function(node) {
                var attr = {};
                attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
                attr.ino = node.id;
                attr.mode = node.mode;
                attr.nlink = 1;
                attr.uid = 0;
                attr.gid = 0;
                attr.rdev = node.rdev;
                if (FS.isDir(node.mode)) {
                    attr.size = 4096;
                } else if (FS.isFile(node.mode)) {
                    attr.size = node.usedBytes;
                } else if (FS.isLink(node.mode)) {
                    attr.size = node.link.length;
                } else {
                    attr.size = 0;
                }
                attr.atime = new Date(node.timestamp);
                attr.mtime = new Date(node.timestamp);
                attr.ctime = new Date(node.timestamp);
                attr.blksize = 4096;
                attr.blocks = Math.ceil(attr.size / attr.blksize);
                return attr;
            },
            setattr: function(node, attr) {
                if (attr.mode !== undefined) {
                    node.mode = attr.mode;
                }
                if (attr.timestamp !== undefined) {
                    node.timestamp = attr.timestamp;
                }
                if (attr.size !== undefined) {
                    MEMFS.resizeFileStorage(node, attr.size);
                }
            },
            lookup: function(parent, name) {
                throw FS.genericErrors[ERRNO_CODES.ENOENT];
            },
            mknod: function(parent, name, mode, dev) {
                return MEMFS.createNode(parent, name, mode, dev);
            },
            rename: function(old_node, new_dir, new_name) {
                if (FS.isDir(old_node.mode)) {
                    var new_node;
                    try {
                        new_node = FS.lookupNode(new_dir, new_name);
                    } catch (e) {}
                    if (new_node) {
                        for (var i in new_node.contents) {
                            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
                        }
                    }
                }
                delete old_node.parent.contents[old_node.name];
                old_node.name = new_name;
                new_dir.contents[new_name] = old_node;
                old_node.parent = new_dir;
            },
            unlink: function(parent, name) {
                delete parent.contents[name];
            },
            rmdir: function(parent, name) {
                var node = FS.lookupNode(parent, name);
                for (var i in node.contents) {
                    throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
                }
                delete parent.contents[name];
            },
            readdir: function(node) {
                var entries = [".", ".."];
                for (var key in node.contents) {
                    if (!node.contents.hasOwnProperty(key)) {
                        continue;
                    }
                    entries.push(key);
                }
                return entries;
            },
            symlink: function(parent, newname, oldpath) {
                var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
                node.link = oldpath;
                return node;
            },
            readlink: function(node) {
                if (!FS.isLink(node.mode)) {
                    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
                }
                return node.link;
            }
        },
        stream_ops: {
            read: function(stream, buffer, offset, length, position) {
                var contents = stream.node.contents;
                if (position >= stream.node.usedBytes) return 0;
                var size = Math.min(stream.node.usedBytes - position, length);
                if (size > 8 && contents.subarray) {
                    buffer.set(contents.subarray(position, position + size), offset);
                } else {
                    for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
                }
                return size;
            },
            write: function(stream, buffer, offset, length, position, canOwn) {
                canOwn = false;
                if (!length) return 0;
                var node = stream.node;
                node.timestamp = Date.now();
                if (buffer.subarray && (!node.contents || node.contents.subarray)) {
                    if (canOwn) {
                        node.contents = buffer.subarray(offset, offset + length);
                        node.usedBytes = length;
                        return length;
                    } else if (node.usedBytes === 0 && position === 0) {
                        node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
                        node.usedBytes = length;
                        return length;
                    } else if (position + length <= node.usedBytes) {
                        node.contents.set(buffer.subarray(offset, offset + length), position);
                        return length;
                    }
                }
                MEMFS.expandFileStorage(node, position + length);
                if (node.contents.subarray && buffer.subarray)
                    node.contents.set(buffer.subarray(offset, offset + length), position);
                else {
                    for (var i = 0; i < length; i++) {
                        node.contents[position + i] = buffer[offset + i];
                    }
                }
                node.usedBytes = Math.max(node.usedBytes, position + length);
                return length;
            },
            llseek: function(stream, offset, whence) {
                var position = offset;
                if (whence === 1) {
                    position += stream.position;
                } else if (whence === 2) {
                    if (FS.isFile(stream.node.mode)) {
                        position += stream.node.usedBytes;
                    }
                }
                if (position < 0) {
                    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
                }
                return position;
            },
            allocate: function(stream, offset, length) {
                MEMFS.expandFileStorage(stream.node, offset + length);
                stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
            },
            mmap: function(stream, buffer, offset, length, position, prot, flags) {
                if (!FS.isFile(stream.node.mode)) {
                    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
                }
                var ptr;
                var allocated;
                var contents = stream.node.contents;
                if (!(flags & 2) && (contents.buffer === buffer || contents.buffer === buffer.buffer)) {
                    allocated = false;
                    ptr = contents.byteOffset;
                } else {
                    if (position > 0 || position + length < stream.node.usedBytes) {
                        if (contents.subarray) {
                            contents = contents.subarray(position, position + length);
                        } else {
                            contents = Array.prototype.slice.call(contents, position, position + length);
                        }
                    }
                    allocated = true;
                    ptr = _malloc(length);
                    if (!ptr) {
                        throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
                    }
                    buffer.set(contents, ptr);
                }
                return { ptr: ptr, allocated: allocated };
            },
            msync: function(stream, buffer, offset, length, mmapFlags) {
                if (!FS.isFile(stream.node.mode)) {
                    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
                }
                if (mmapFlags & 2) {
                    return 0;
                }
                var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
                return 0;
            }
        }
    };
    var IDBFS = {
        dbs: {},
        indexedDB: function() {
            if (typeof indexedDB !== "undefined") return indexedDB;
            var ret = null;
            if (typeof window === "object")
                ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
            assert(ret, "IDBFS used, but indexedDB not supported");
            return ret;
        },
        DB_VERSION: 21,
        DB_STORE_NAME: "FILE_DATA",
        mount: function(mount) {
            return MEMFS.mount.apply(null, arguments);
        },
        syncfs: function(mount, populate, callback) {
            IDBFS.getLocalSet(mount, function(err, local) {
                if (err) return callback(err);
                IDBFS.getRemoteSet(mount, function(err, remote) {
                    if (err) return callback(err);
                    var src = populate ? remote : local;
                    var dst = populate ? local : remote;
                    IDBFS.reconcile(src, dst, callback);
                });
            });
        },
        getDB: function(name, callback) {
            var db = IDBFS.dbs[name];
            if (db) {
                return callback(null, db);
            }
            var req;
            try {
                req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
            } catch (e) {
                return callback(e);
            }
            if (!req) {
                return callback("Unable to connect to IndexedDB");
            }
            req.onupgradeneeded = function(e) {
                var db = e.target.result;
                var transaction = e.target.transaction;
                var fileStore;
                if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
                    fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
                } else {
                    fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
                }
                if (!fileStore.indexNames.contains("timestamp")) {
                    fileStore.createIndex("timestamp", "timestamp", { unique: false });
                }
            };
            req.onsuccess = function() {
                db = req.result;
                IDBFS.dbs[name] = db;
                callback(null, db);
            };
            req.onerror = function(e) {
                callback(this.error);
                e.preventDefault();
            };
        },
        getLocalSet: function(mount, callback) {
            var entries = {};
            function isRealDir(p) {
                return p !== "." && p !== "..";
            }
            function toAbsolute(root) {
                return function(p) {
                    return PATH.join2(root, p);
                };
            }
            var check = FS.readdir(mount.mountpoint)
                .filter(isRealDir)
                .map(toAbsolute(mount.mountpoint));
            while (check.length) {
                var path = check.pop();
                var stat;
                try {
                    stat = FS.stat(path);
                } catch (e) {
                    return callback(e);
                }
                if (FS.isDir(stat.mode)) {
                    check.push.apply(
                        check,
                        FS.readdir(path)
                            .filter(isRealDir)
                            .map(toAbsolute(path))
                    );
                }
                entries[path] = { timestamp: stat.mtime };
            }
            return callback(null, { type: "local", entries: entries });
        },
        getRemoteSet: function(mount, callback) {
            var entries = {};
            IDBFS.getDB(mount.mountpoint, function(err, db) {
                if (err) return callback(err);
                try {
                    var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readonly");
                    transaction.onerror = function(e) {
                        callback(this.error);
                        e.preventDefault();
                    };
                    var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
                    var index = store.index("timestamp");
                    index.openKeyCursor().onsuccess = function(event) {
                        var cursor = event.target.result;
                        if (!cursor) {
                            return callback(null, { type: "remote", db: db, entries: entries });
                        }
                        entries[cursor.primaryKey] = { timestamp: cursor.key };
                        cursor.continue();
                    };
                } catch (e) {
                    return callback(e);
                }
            });
        },
        loadLocalEntry: function(path, callback) {
            var stat, node;
            try {
                var lookup = FS.lookupPath(path);
                node = lookup.node;
                stat = FS.stat(path);
            } catch (e) {
                return callback(e);
            }
            if (FS.isDir(stat.mode)) {
                return callback(null, { timestamp: stat.mtime, mode: stat.mode });
            } else if (FS.isFile(stat.mode)) {
                node.contents = MEMFS.getFileDataAsTypedArray(node);
                return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
            } else {
                return callback(new Error("node type not supported"));
            }
        },
        storeLocalEntry: function(path, entry, callback) {
            try {
                if (FS.isDir(entry.mode)) {
                    FS.mkdir(path, entry.mode);
                } else if (FS.isFile(entry.mode)) {
                    FS.writeFile(path, entry.contents, { canOwn: true });
                } else {
                    return callback(new Error("node type not supported"));
                }
                FS.chmod(path, entry.mode);
                FS.utime(path, entry.timestamp, entry.timestamp);
            } catch (e) {
                return callback(e);
            }
            callback(null);
        },
        removeLocalEntry: function(path, callback) {
            try {
                var lookup = FS.lookupPath(path);
                var stat = FS.stat(path);
                if (FS.isDir(stat.mode)) {
                    FS.rmdir(path);
                } else if (FS.isFile(stat.mode)) {
                    FS.unlink(path);
                }
            } catch (e) {
                return callback(e);
            }
            callback(null);
        },
        loadRemoteEntry: function(store, path, callback) {
            var req = store.get(path);
            req.onsuccess = function(event) {
                callback(null, event.target.result);
            };
            req.onerror = function(e) {
                callback(this.error);
                e.preventDefault();
            };
        },
        storeRemoteEntry: function(store, path, entry, callback) {
            var req = store.put(entry, path);
            req.onsuccess = function() {
                callback(null);
            };
            req.onerror = function(e) {
                callback(this.error);
                e.preventDefault();
            };
        },
        removeRemoteEntry: function(store, path, callback) {
            var req = store.delete(path);
            req.onsuccess = function() {
                callback(null);
            };
            req.onerror = function(e) {
                callback(this.error);
                e.preventDefault();
            };
        },
        reconcile: function(src, dst, callback) {
            var total = 0;
            var create = [];
            Object.keys(src.entries).forEach(function(key) {
                var e = src.entries[key];
                var e2 = dst.entries[key];
                if (!e2 || e.timestamp > e2.timestamp) {
                    create.push(key);
                    total++;
                }
            });
            var remove = [];
            Object.keys(dst.entries).forEach(function(key) {
                var e = dst.entries[key];
                var e2 = src.entries[key];
                if (!e2) {
                    remove.push(key);
                    total++;
                }
            });
            if (!total) {
                return callback(null);
            }
            var errored = false;
            var completed = 0;
            var db = src.type === "remote" ? src.db : dst.db;
            var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readwrite");
            var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
            function done(err) {
                if (err) {
                    if (!done.errored) {
                        done.errored = true;
                        return callback(err);
                    }
                    return;
                }
                if (++completed >= total) {
                    return callback(null);
                }
            }
            transaction.onerror = function(e) {
                done(this.error);
                e.preventDefault();
            };
            create.sort().forEach(function(path) {
                if (dst.type === "local") {
                    IDBFS.loadRemoteEntry(store, path, function(err, entry) {
                        if (err) return done(err);
                        IDBFS.storeLocalEntry(path, entry, done);
                    });
                } else {
                    IDBFS.loadLocalEntry(path, function(err, entry) {
                        if (err) return done(err);
                        IDBFS.storeRemoteEntry(store, path, entry, done);
                    });
                }
            });
            remove
                .sort()
                .reverse()
                .forEach(function(path) {
                    if (dst.type === "local") {
                        IDBFS.removeLocalEntry(path, done);
                    } else {
                        IDBFS.removeRemoteEntry(store, path, done);
                    }
                });
        }
    };
    var NODEFS = {
        isWindows: false,
        staticInit: function() {
            NODEFS.isWindows = !!process.platform.match(/^win/);
            var flags = process["binding"]("constants");
            if (flags["fs"]) {
                flags = flags["fs"];
            }
            NODEFS.flagsForNodeMap = {
                1024: flags["O_APPEND"],
                64: flags["O_CREAT"],
                128: flags["O_EXCL"],
                0: flags["O_RDONLY"],
                2: flags["O_RDWR"],
                4096: flags["O_SYNC"],
                512: flags["O_TRUNC"],
                1: flags["O_WRONLY"]
            };
        },
        bufferFrom: function(arrayBuffer) {
            return Buffer.alloc ? Buffer.from(arrayBuffer) : new Buffer(arrayBuffer);
        },
        mount: function(mount) {
            assert(ENVIRONMENT_IS_NODE);
            return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0);
        },
        createNode: function(parent, name, mode, dev) {
            if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
            }
            var node = FS.createNode(parent, name, mode);
            node.node_ops = NODEFS.node_ops;
            node.stream_ops = NODEFS.stream_ops;
            return node;
        },
        getMode: function(path) {
            var stat;
            try {
                stat = fs.lstatSync(path);
                if (NODEFS.isWindows) {
                    stat.mode = stat.mode | ((stat.mode & 292) >> 2);
                }
            } catch (e) {
                if (!e.code) throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
            }
            return stat.mode;
        },
        realPath: function(node) {
            var parts = [];
            while (node.parent !== node) {
                parts.push(node.name);
                node = node.parent;
            }
            parts.push(node.mount.opts.root);
            parts.reverse();
            return PATH.join.apply(null, parts);
        },
        flagsForNode: function(flags) {
            flags &= ~2097152;
            flags &= ~2048;
            flags &= ~32768;
            flags &= ~524288;
            var newFlags = 0;
            for (var k in NODEFS.flagsForNodeMap) {
                if (flags & k) {
                    newFlags |= NODEFS.flagsForNodeMap[k];
                    flags ^= k;
                }
            }
            if (!flags) {
                return newFlags;
            } else {
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
            }
        },
        node_ops: {
            getattr: function(node) {
                var path = NODEFS.realPath(node);
                var stat;
                try {
                    stat = fs.lstatSync(path);
                } catch (e) {
                    if (!e.code) throw e;
                    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
                }
                if (NODEFS.isWindows && !stat.blksize) {
                    stat.blksize = 4096;
                }
                if (NODEFS.isWindows && !stat.blocks) {
                    stat.blocks = ((stat.size + stat.blksize - 1) / stat.blksize) | 0;
                }
                return {
                    dev: stat.dev,
                    ino: stat.ino,
                    mode: stat.mode,
                    nlink: stat.nlink,
                    uid: stat.uid,
                    gid: stat.gid,
                    rdev: stat.rdev,
                    size: stat.size,
                    atime: stat.atime,
                    mtime: stat.mtime,
                    ctime: stat.ctime,
                    blksize: stat.blksize,
                    blocks: stat.blocks
                };
            },
            setattr: function(node, attr) {
                var path = NODEFS.realPath(node);
                try {
                    if (attr.mode !== undefined) {
                        fs.chmodSync(path, attr.mode);
                        node.mode = attr.mode;
                    }
                    if (attr.timestamp !== undefined) {
                        var date = new Date(attr.timestamp);
                        fs.utimesSync(path, date, date);
                    }
                    if (attr.size !== undefined) {
                        fs.truncateSync(path, attr.size);
                    }
                } catch (e) {
                    if (!e.code) throw e;
                    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
                }
            },
            lookup: function(parent, name) {
                var path = PATH.join2(NODEFS.realPath(parent), name);
                var mode = NODEFS.getMode(path);
                return NODEFS.createNode(parent, name, mode);
            },
            mknod: function(parent, name, mode, dev) {
                var node = NODEFS.createNode(parent, name, mode, dev);
                var path = NODEFS.realPath(node);
                try {
                    if (FS.isDir(node.mode)) {
                        fs.mkdirSync(path, node.mode);
                    } else {
                        fs.writeFileSync(path, "", { mode: node.mode });
                    }
                } catch (e) {
                    if (!e.code) throw e;
                    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
                }
                return node;
            },
            rename: function(oldNode, newDir, newName) {
                var oldPath = NODEFS.realPath(oldNode);
                var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
                try {
                    fs.renameSync(oldPath, newPath);
                } catch (e) {
                    if (!e.code) throw e;
                    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
                }
            },
            unlink: function(parent, name) {
                var path = PATH.join2(NODEFS.realPath(parent), name);
                try {
                    fs.unlinkSync(path);
                } catch (e) {
                    if (!e.code) throw e;
                    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
                }
            },
            rmdir: function(parent, name) {
                var path = PATH.join2(NODEFS.realPath(parent), name);
                try {
                    fs.rmdirSync(path);
                } catch (e) {
                    if (!e.code) throw e;
                    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
                }
            },
            readdir: function(node) {
                var path = NODEFS.realPath(node);
                try {
                    return fs.readdirSync(path);
                } catch (e) {
                    if (!e.code) throw e;
                    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
                }
            },
            symlink: function(parent, newName, oldPath) {
                var newPath = PATH.join2(NODEFS.realPath(parent), newName);
                try {
                    fs.symlinkSync(oldPath, newPath);
                } catch (e) {
                    if (!e.code) throw e;
                    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
                }
            },
            readlink: function(node) {
                var path = NODEFS.realPath(node);
                try {
                    path = fs.readlinkSync(path);
                    path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
                    return path;
                } catch (e) {
                    if (!e.code) throw e;
                    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
                }
            }
        },
        stream_ops: {
            open: function(stream) {
                var path = NODEFS.realPath(stream.node);
                try {
                    if (FS.isFile(stream.node.mode)) {
                        stream.nfd = fs.openSync(path, NODEFS.flagsForNode(stream.flags));
                    }
                } catch (e) {
                    if (!e.code) throw e;
                    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
                }
            },
            close: function(stream) {
                try {
                    if (FS.isFile(stream.node.mode) && stream.nfd) {
                        fs.closeSync(stream.nfd);
                    }
                } catch (e) {
                    if (!e.code) throw e;
                    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
                }
            },
            read: function(stream, buffer, offset, length, position) {
                if (length === 0) return 0;
                try {
                    return fs.readSync(stream.nfd, NODEFS.bufferFrom(buffer.buffer), offset, length, position);
                } catch (e) {
                    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
                }
            },
            write: function(stream, buffer, offset, length, position) {
                try {
                    return fs.writeSync(stream.nfd, NODEFS.bufferFrom(buffer.buffer), offset, length, position);
                } catch (e) {
                    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
                }
            },
            llseek: function(stream, offset, whence) {
                var position = offset;
                if (whence === 1) {
                    position += stream.position;
                } else if (whence === 2) {
                    if (FS.isFile(stream.node.mode)) {
                        try {
                            var stat = fs.fstatSync(stream.nfd);
                            position += stat.size;
                        } catch (e) {
                            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
                        }
                    }
                }
                if (position < 0) {
                    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
                }
                return position;
            }
        }
    };
    var WORKERFS = {
        DIR_MODE: 16895,
        FILE_MODE: 33279,
        reader: null,
        mount: function(mount) {
            assert(ENVIRONMENT_IS_WORKER);
            if (!WORKERFS.reader) WORKERFS.reader = new FileReaderSync();
            var root = WORKERFS.createNode(null, "/", WORKERFS.DIR_MODE, 0);
            var createdParents = {};
            function ensureParent(path) {
                var parts = path.split("/");
                var parent = root;
                for (var i = 0; i < parts.length - 1; i++) {
                    var curr = parts.slice(0, i + 1).join("/");
                    if (!createdParents[curr]) {
                        createdParents[curr] = WORKERFS.createNode(parent, parts[i], WORKERFS.DIR_MODE, 0);
                    }
                    parent = createdParents[curr];
                }
                return parent;
            }
            function base(path) {
                var parts = path.split("/");
                return parts[parts.length - 1];
            }
            Array.prototype.forEach.call(mount.opts["files"] || [], function(file) {
                WORKERFS.createNode(
                    ensureParent(file.name),
                    base(file.name),
                    WORKERFS.FILE_MODE,
                    0,
                    file,
                    file.lastModifiedDate
                );
            });
            (mount.opts["blobs"] || []).forEach(function(obj) {
                WORKERFS.createNode(ensureParent(obj["name"]), base(obj["name"]), WORKERFS.FILE_MODE, 0, obj["data"]);
            });
            (mount.opts["packages"] || []).forEach(function(pack) {
                pack["metadata"].files.forEach(function(file) {
                    var name = file.filename.substr(1);
                    WORKERFS.createNode(
                        ensureParent(name),
                        base(name),
                        WORKERFS.FILE_MODE,
                        0,
                        pack["blob"].slice(file.start, file.end)
                    );
                });
            });
            return root;
        },
        createNode: function(parent, name, mode, dev, contents, mtime) {
            var node = FS.createNode(parent, name, mode);
            node.mode = mode;
            node.node_ops = WORKERFS.node_ops;
            node.stream_ops = WORKERFS.stream_ops;
            node.timestamp = (mtime || new Date()).getTime();
            assert(WORKERFS.FILE_MODE !== WORKERFS.DIR_MODE);
            if (mode === WORKERFS.FILE_MODE) {
                node.size = contents.size;
                node.contents = contents;
            } else {
                node.size = 4096;
                node.contents = {};
            }
            if (parent) {
                parent.contents[name] = node;
            }
            return node;
        },
        node_ops: {
            getattr: function(node) {
                return {
                    dev: 1,
                    ino: undefined,
                    mode: node.mode,
                    nlink: 1,
                    uid: 0,
                    gid: 0,
                    rdev: undefined,
                    size: node.size,
                    atime: new Date(node.timestamp),
                    mtime: new Date(node.timestamp),
                    ctime: new Date(node.timestamp),
                    blksize: 4096,
                    blocks: Math.ceil(node.size / 4096)
                };
            },
            setattr: function(node, attr) {
                if (attr.mode !== undefined) {
                    node.mode = attr.mode;
                }
                if (attr.timestamp !== undefined) {
                    node.timestamp = attr.timestamp;
                }
            },
            lookup: function(parent, name) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
            },
            mknod: function(parent, name, mode, dev) {
                throw new FS.ErrnoError(ERRNO_CODES.EPERM);
            },
            rename: function(oldNode, newDir, newName) {
                throw new FS.ErrnoError(ERRNO_CODES.EPERM);
            },
            unlink: function(parent, name) {
                throw new FS.ErrnoError(ERRNO_CODES.EPERM);
            },
            rmdir: function(parent, name) {
                throw new FS.ErrnoError(ERRNO_CODES.EPERM);
            },
            readdir: function(node) {
                var entries = [".", ".."];
                for (var key in node.contents) {
                    if (!node.contents.hasOwnProperty(key)) {
                        continue;
                    }
                    entries.push(key);
                }
                return entries;
            },
            symlink: function(parent, newName, oldPath) {
                throw new FS.ErrnoError(ERRNO_CODES.EPERM);
            },
            readlink: function(node) {
                throw new FS.ErrnoError(ERRNO_CODES.EPERM);
            }
        },
        stream_ops: {
            read: function(stream, buffer, offset, length, position) {
                if (position >= stream.node.size) return 0;
                var chunk = stream.node.contents.slice(position, position + length);
                var ab = WORKERFS.reader.readAsArrayBuffer(chunk);
                buffer.set(new Uint8Array(ab), offset);
                return chunk.size;
            },
            write: function(stream, buffer, offset, length, position) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
            },
            llseek: function(stream, offset, whence) {
                var position = offset;
                if (whence === 1) {
                    position += stream.position;
                } else if (whence === 2) {
                    if (FS.isFile(stream.node.mode)) {
                        position += stream.node.size;
                    }
                }
                if (position < 0) {
                    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
                }
                return position;
            }
        }
    };
    var FS = {
        root: null,
        mounts: [],
        devices: {},
        streams: [],
        nextInode: 1,
        nameTable: null,
        currentPath: "/",
        initialized: false,
        ignorePermissions: true,
        trackingDelegate: {},
        tracking: { openFlags: { READ: 1, WRITE: 2 } },
        ErrnoError: null,
        genericErrors: {},
        filesystems: null,
        syncFSRequests: 0,
        handleFSError: function(e) {
            if (!(e instanceof FS.ErrnoError)) throw e + " : " + stackTrace();
            return ___setErrNo(e.errno);
        },
        lookupPath: function(path, opts) {
            path = PATH.resolve(FS.cwd(), path);
            opts = opts || {};
            if (!path) return { path: "", node: null };
            var defaults = { follow_mount: true, recurse_count: 0 };
            for (var key in defaults) {
                if (opts[key] === undefined) {
                    opts[key] = defaults[key];
                }
            }
            if (opts.recurse_count > 8) {
                throw new FS.ErrnoError(40);
            }
            var parts = PATH.normalizeArray(
                path.split("/").filter(function(p) {
                    return !!p;
                }),
                false
            );
            var current = FS.root;
            var current_path = "/";
            for (var i = 0; i < parts.length; i++) {
                var islast = i === parts.length - 1;
                if (islast && opts.parent) {
                    break;
                }
                current = FS.lookupNode(current, parts[i]);
                current_path = PATH.join2(current_path, parts[i]);
                if (FS.isMountpoint(current)) {
                    if (!islast || (islast && opts.follow_mount)) {
                        current = current.mounted.root;
                    }
                }
                if (!islast || opts.follow) {
                    var count = 0;
                    while (FS.isLink(current.mode)) {
                        var link = FS.readlink(current_path);
                        current_path = PATH.resolve(PATH.dirname(current_path), link);
                        var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
                        current = lookup.node;
                        if (count++ > 40) {
                            throw new FS.ErrnoError(40);
                        }
                    }
                }
            }
            return { path: current_path, node: current };
        },
        getPath: function(node) {
            var path;
            while (true) {
                if (FS.isRoot(node)) {
                    var mount = node.mount.mountpoint;
                    if (!path) return mount;
                    return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path;
                }
                path = path ? node.name + "/" + path : node.name;
                node = node.parent;
            }
        },
        hashName: function(parentid, name) {
            var hash = 0;
            for (var i = 0; i < name.length; i++) {
                hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
            }
            return ((parentid + hash) >>> 0) % FS.nameTable.length;
        },
        hashAddNode: function(node) {
            var hash = FS.hashName(node.parent.id, node.name);
            node.name_next = FS.nameTable[hash];
            FS.nameTable[hash] = node;
        },
        hashRemoveNode: function(node) {
            var hash = FS.hashName(node.parent.id, node.name);
            if (FS.nameTable[hash] === node) {
                FS.nameTable[hash] = node.name_next;
            } else {
                var current = FS.nameTable[hash];
                while (current) {
                    if (current.name_next === node) {
                        current.name_next = node.name_next;
                        break;
                    }
                    current = current.name_next;
                }
            }
        },
        lookupNode: function(parent, name) {
            var err = FS.mayLookup(parent);
            if (err) {
                throw new FS.ErrnoError(err, parent);
            }
            var hash = FS.hashName(parent.id, name);
            for (var node = FS.nameTable[hash]; node; node = node.name_next) {
                var nodeName = node.name;
                if (node.parent.id === parent.id && nodeName === name) {
                    return node;
                }
            }
            return FS.lookup(parent, name);
        },
        createNode: function(parent, name, mode, rdev) {
            if (!FS.FSNode) {
                FS.FSNode = function(parent, name, mode, rdev) {
                    if (!parent) {
                        parent = this;
                    }
                    this.parent = parent;
                    this.mount = parent.mount;
                    this.mounted = null;
                    this.id = FS.nextInode++;
                    this.name = name;
                    this.mode = mode;
                    this.node_ops = {};
                    this.stream_ops = {};
                    this.rdev = rdev;
                };
                FS.FSNode.prototype = {};
                var readMode = 292 | 73;
                var writeMode = 146;
                Object.defineProperties(FS.FSNode.prototype, {
                    read: {
                        get: function() {
                            return (this.mode & readMode) === readMode;
                        },
                        set: function(val) {
                            val ? (this.mode |= readMode) : (this.mode &= ~readMode);
                        }
                    },
                    write: {
                        get: function() {
                            return (this.mode & writeMode) === writeMode;
                        },
                        set: function(val) {
                            val ? (this.mode |= writeMode) : (this.mode &= ~writeMode);
                        }
                    },
                    isFolder: {
                        get: function() {
                            return FS.isDir(this.mode);
                        }
                    },
                    isDevice: {
                        get: function() {
                            return FS.isChrdev(this.mode);
                        }
                    }
                });
            }
            var node = new FS.FSNode(parent, name, mode, rdev);
            FS.hashAddNode(node);
            return node;
        },
        destroyNode: function(node) {
            FS.hashRemoveNode(node);
        },
        isRoot: function(node) {
            return node === node.parent;
        },
        isMountpoint: function(node) {
            return !!node.mounted;
        },
        isFile: function(mode) {
            return (mode & 61440) === 32768;
        },
        isDir: function(mode) {
            return (mode & 61440) === 16384;
        },
        isLink: function(mode) {
            return (mode & 61440) === 40960;
        },
        isChrdev: function(mode) {
            return (mode & 61440) === 8192;
        },
        isBlkdev: function(mode) {
            return (mode & 61440) === 24576;
        },
        isFIFO: function(mode) {
            return (mode & 61440) === 4096;
        },
        isSocket: function(mode) {
            return (mode & 49152) === 49152;
        },
        flagModes: {
            r: 0,
            rs: 1052672,
            "r+": 2,
            w: 577,
            wx: 705,
            xw: 705,
            "w+": 578,
            "wx+": 706,
            "xw+": 706,
            a: 1089,
            ax: 1217,
            xa: 1217,
            "a+": 1090,
            "ax+": 1218,
            "xa+": 1218
        },
        modeStringToFlags: function(str) {
            var flags = FS.flagModes[str];
            if (typeof flags === "undefined") {
                throw new Error("Unknown file open mode: " + str);
            }
            return flags;
        },
        flagsToPermissionString: function(flag) {
            var perms = ["r", "w", "rw"][flag & 3];
            if (flag & 512) {
                perms += "w";
            }
            return perms;
        },
        nodePermissions: function(node, perms) {
            if (FS.ignorePermissions) {
                return 0;
            }
            if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
                return 13;
            } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
                return 13;
            } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
                return 13;
            }
            return 0;
        },
        mayLookup: function(dir) {
            var err = FS.nodePermissions(dir, "x");
            if (err) return err;
            if (!dir.node_ops.lookup) return 13;
            return 0;
        },
        mayCreate: function(dir, name) {
            try {
                var node = FS.lookupNode(dir, name);
                return 17;
            } catch (e) {}
            return FS.nodePermissions(dir, "wx");
        },
        mayDelete: function(dir, name, isdir) {
            var node;
            try {
                node = FS.lookupNode(dir, name);
            } catch (e) {
                return e.errno;
            }
            var err = FS.nodePermissions(dir, "wx");
            if (err) {
                return err;
            }
            if (isdir) {
                if (!FS.isDir(node.mode)) {
                    return 20;
                }
                if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
                    return 16;
                }
            } else {
                if (FS.isDir(node.mode)) {
                    return 21;
                }
            }
            return 0;
        },
        mayOpen: function(node, flags) {
            if (!node) {
                return 2;
            }
            if (FS.isLink(node.mode)) {
                return 40;
            } else if (FS.isDir(node.mode)) {
                if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
                    return 21;
                }
            }
            return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
        },
        MAX_OPEN_FDS: 4096,
        nextfd: function(fd_start, fd_end) {
            fd_start = fd_start || 0;
            fd_end = fd_end || FS.MAX_OPEN_FDS;
            for (var fd = fd_start; fd <= fd_end; fd++) {
                if (!FS.streams[fd]) {
                    return fd;
                }
            }
            throw new FS.ErrnoError(24);
        },
        getStream: function(fd) {
            return FS.streams[fd];
        },
        createStream: function(stream, fd_start, fd_end) {
            if (!FS.FSStream) {
                FS.FSStream = function() {};
                FS.FSStream.prototype = {};
                Object.defineProperties(FS.FSStream.prototype, {
                    object: {
                        get: function() {
                            return this.node;
                        },
                        set: function(val) {
                            this.node = val;
                        }
                    },
                    isRead: {
                        get: function() {
                            return (this.flags & 2097155) !== 1;
                        }
                    },
                    isWrite: {
                        get: function() {
                            return (this.flags & 2097155) !== 0;
                        }
                    },
                    isAppend: {
                        get: function() {
                            return this.flags & 1024;
                        }
                    }
                });
            }
            var newStream = new FS.FSStream();
            for (var p in stream) {
                newStream[p] = stream[p];
            }
            stream = newStream;
            var fd = FS.nextfd(fd_start, fd_end);
            stream.fd = fd;
            FS.streams[fd] = stream;
            return stream;
        },
        closeStream: function(fd) {
            FS.streams[fd] = null;
        },
        chrdev_stream_ops: {
            open: function(stream) {
                var device = FS.getDevice(stream.node.rdev);
                stream.stream_ops = device.stream_ops;
                if (stream.stream_ops.open) {
                    stream.stream_ops.open(stream);
                }
            },
            llseek: function() {
                throw new FS.ErrnoError(29);
            }
        },
        major: function(dev) {
            return dev >> 8;
        },
        minor: function(dev) {
            return dev & 255;
        },
        makedev: function(ma, mi) {
            return (ma << 8) | mi;
        },
        registerDevice: function(dev, ops) {
            FS.devices[dev] = { stream_ops: ops };
        },
        getDevice: function(dev) {
            return FS.devices[dev];
        },
        getMounts: function(mount) {
            var mounts = [];
            var check = [mount];
            while (check.length) {
                var m = check.pop();
                mounts.push(m);
                check.push.apply(check, m.mounts);
            }
            return mounts;
        },
        syncfs: function(populate, callback) {
            if (typeof populate === "function") {
                callback = populate;
                populate = false;
            }
            FS.syncFSRequests++;
            if (FS.syncFSRequests > 1) {
                console.log(
                    "warning: " +
                        FS.syncFSRequests +
                        " FS.syncfs operations in flight at once, probably just doing extra work"
                );
            }
            var mounts = FS.getMounts(FS.root.mount);
            var completed = 0;
            function doCallback(err) {
                FS.syncFSRequests--;
                return callback(err);
            }
            function done(err) {
                if (err) {
                    if (!done.errored) {
                        done.errored = true;
                        return doCallback(err);
                    }
                    return;
                }
                if (++completed >= mounts.length) {
                    doCallback(null);
                }
            }
            mounts.forEach(function(mount) {
                if (!mount.type.syncfs) {
                    return done(null);
                }
                mount.type.syncfs(mount, populate, done);
            });
        },
        mount: function(type, opts, mountpoint) {
            var root = mountpoint === "/";
            var pseudo = !mountpoint;
            var node;
            if (root && FS.root) {
                throw new FS.ErrnoError(16);
            } else if (!root && !pseudo) {
                var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
                mountpoint = lookup.path;
                node = lookup.node;
                if (FS.isMountpoint(node)) {
                    throw new FS.ErrnoError(16);
                }
                if (!FS.isDir(node.mode)) {
                    throw new FS.ErrnoError(20);
                }
            }
            var mount = { type: type, opts: opts, mountpoint: mountpoint, mounts: [] };
            var mountRoot = type.mount(mount);
            mountRoot.mount = mount;
            mount.root = mountRoot;
            if (root) {
                FS.root = mountRoot;
            } else if (node) {
                node.mounted = mount;
                if (node.mount) {
                    node.mount.mounts.push(mount);
                }
            }
            return mountRoot;
        },
        unmount: function(mountpoint) {
            var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
            if (!FS.isMountpoint(lookup.node)) {
                throw new FS.ErrnoError(22);
            }
            var node = lookup.node;
            var mount = node.mounted;
            var mounts = FS.getMounts(mount);
            Object.keys(FS.nameTable).forEach(function(hash) {
                var current = FS.nameTable[hash];
                while (current) {
                    var next = current.name_next;
                    if (mounts.indexOf(current.mount) !== -1) {
                        FS.destroyNode(current);
                    }
                    current = next;
                }
            });
            node.mounted = null;
            var idx = node.mount.mounts.indexOf(mount);
            node.mount.mounts.splice(idx, 1);
        },
        lookup: function(parent, name) {
            return parent.node_ops.lookup(parent, name);
        },
        mknod: function(path, mode, dev) {
            var lookup = FS.lookupPath(path, { parent: true });
            var parent = lookup.node;
            var name = PATH.basename(path);
            if (!name || name === "." || name === "..") {
                throw new FS.ErrnoError(22);
            }
            var err = FS.mayCreate(parent, name);
            if (err) {
                throw new FS.ErrnoError(err);
            }
            if (!parent.node_ops.mknod) {
                throw new FS.ErrnoError(1);
            }
            return parent.node_ops.mknod(parent, name, mode, dev);
        },
        create: function(path, mode) {
            mode = mode !== undefined ? mode : 438;
            mode &= 4095;
            mode |= 32768;
            return FS.mknod(path, mode, 0);
        },
        mkdir: function(path, mode) {
            mode = mode !== undefined ? mode : 511;
            mode &= 511 | 512;
            mode |= 16384;
            return FS.mknod(path, mode, 0);
        },
        mkdirTree: function(path, mode) {
            var dirs = path.split("/");
            var d = "";
            for (var i = 0; i < dirs.length; ++i) {
                if (!dirs[i]) continue;
                d += "/" + dirs[i];
                try {
                    FS.mkdir(d, mode);
                } catch (e) {
                    if (e.errno != 17) throw e;
                }
            }
        },
        mkdev: function(path, mode, dev) {
            if (typeof dev === "undefined") {
                dev = mode;
                mode = 438;
            }
            mode |= 8192;
            return FS.mknod(path, mode, dev);
        },
        symlink: function(oldpath, newpath) {
            if (!PATH.resolve(oldpath)) {
                throw new FS.ErrnoError(2);
            }
            var lookup = FS.lookupPath(newpath, { parent: true });
            var parent = lookup.node;
            if (!parent) {
                throw new FS.ErrnoError(2);
            }
            var newname = PATH.basename(newpath);
            var err = FS.mayCreate(parent, newname);
            if (err) {
                throw new FS.ErrnoError(err);
            }
            if (!parent.node_ops.symlink) {
                throw new FS.ErrnoError(1);
            }
            return parent.node_ops.symlink(parent, newname, oldpath);
        },
        rename: function(old_path, new_path) {
            var old_dirname = PATH.dirname(old_path);
            var new_dirname = PATH.dirname(new_path);
            var old_name = PATH.basename(old_path);
            var new_name = PATH.basename(new_path);
            var lookup, old_dir, new_dir;
            try {
                lookup = FS.lookupPath(old_path, { parent: true });
                old_dir = lookup.node;
                lookup = FS.lookupPath(new_path, { parent: true });
                new_dir = lookup.node;
            } catch (e) {
                throw new FS.ErrnoError(16);
            }
            if (!old_dir || !new_dir) throw new FS.ErrnoError(2);
            if (old_dir.mount !== new_dir.mount) {
                throw new FS.ErrnoError(18);
            }
            var old_node = FS.lookupNode(old_dir, old_name);
            var relative = PATH.relative(old_path, new_dirname);
            if (relative.charAt(0) !== ".") {
                throw new FS.ErrnoError(22);
            }
            relative = PATH.relative(new_path, old_dirname);
            if (relative.charAt(0) !== ".") {
                throw new FS.ErrnoError(39);
            }
            var new_node;
            try {
                new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {}
            if (old_node === new_node) {
                return;
            }
            var isdir = FS.isDir(old_node.mode);
            var err = FS.mayDelete(old_dir, old_name, isdir);
            if (err) {
                throw new FS.ErrnoError(err);
            }
            err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
            if (err) {
                throw new FS.ErrnoError(err);
            }
            if (!old_dir.node_ops.rename) {
                throw new FS.ErrnoError(1);
            }
            if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
                throw new FS.ErrnoError(16);
            }
            if (new_dir !== old_dir) {
                err = FS.nodePermissions(old_dir, "w");
                if (err) {
                    throw new FS.ErrnoError(err);
                }
            }
            try {
                if (FS.trackingDelegate["willMovePath"]) {
                    FS.trackingDelegate["willMovePath"](old_path, new_path);
                }
            } catch (e) {
                console.log(
                    "FS.trackingDelegate['willMovePath']('" +
                        old_path +
                        "', '" +
                        new_path +
                        "') threw an exception: " +
                        e.message
                );
            }
            FS.hashRemoveNode(old_node);
            try {
                old_dir.node_ops.rename(old_node, new_dir, new_name);
            } catch (e) {
                throw e;
            } finally {
                FS.hashAddNode(old_node);
            }
            try {
                if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path);
            } catch (e) {
                console.log(
                    "FS.trackingDelegate['onMovePath']('" +
                        old_path +
                        "', '" +
                        new_path +
                        "') threw an exception: " +
                        e.message
                );
            }
        },
        rmdir: function(path) {
            var lookup = FS.lookupPath(path, { parent: true });
            var parent = lookup.node;
            var name = PATH.basename(path);
            var node = FS.lookupNode(parent, name);
            var err = FS.mayDelete(parent, name, true);
            if (err) {
                throw new FS.ErrnoError(err);
            }
            if (!parent.node_ops.rmdir) {
                throw new FS.ErrnoError(1);
            }
            if (FS.isMountpoint(node)) {
                throw new FS.ErrnoError(16);
            }
            try {
                if (FS.trackingDelegate["willDeletePath"]) {
                    FS.trackingDelegate["willDeletePath"](path);
                }
            } catch (e) {
                console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
            }
            parent.node_ops.rmdir(parent, name);
            FS.destroyNode(node);
            try {
                if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path);
            } catch (e) {
                console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
            }
        },
        readdir: function(path) {
            var lookup = FS.lookupPath(path, { follow: true });
            var node = lookup.node;
            if (!node.node_ops.readdir) {
                throw new FS.ErrnoError(20);
            }
            return node.node_ops.readdir(node);
        },
        unlink: function(path) {
            var lookup = FS.lookupPath(path, { parent: true });
            var parent = lookup.node;
            var name = PATH.basename(path);
            var node = FS.lookupNode(parent, name);
            var err = FS.mayDelete(parent, name, false);
            if (err) {
                throw new FS.ErrnoError(err);
            }
            if (!parent.node_ops.unlink) {
                throw new FS.ErrnoError(1);
            }
            if (FS.isMountpoint(node)) {
                throw new FS.ErrnoError(16);
            }
            try {
                if (FS.trackingDelegate["willDeletePath"]) {
                    FS.trackingDelegate["willDeletePath"](path);
                }
            } catch (e) {
                console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
            }
            parent.node_ops.unlink(parent, name);
            FS.destroyNode(node);
            try {
                if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path);
            } catch (e) {
                console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
            }
        },
        readlink: function(path) {
            var lookup = FS.lookupPath(path);
            var link = lookup.node;
            if (!link) {
                throw new FS.ErrnoError(2);
            }
            if (!link.node_ops.readlink) {
                throw new FS.ErrnoError(22);
            }
            return PATH.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
        },
        stat: function(path, dontFollow) {
            var lookup = FS.lookupPath(path, { follow: !dontFollow });
            var node = lookup.node;
            if (!node) {
                throw new FS.ErrnoError(2);
            }
            if (!node.node_ops.getattr) {
                throw new FS.ErrnoError(1);
            }
            return node.node_ops.getattr(node);
        },
        lstat: function(path) {
            return FS.stat(path, true);
        },
        chmod: function(path, mode, dontFollow) {
            var node;
            if (typeof path === "string") {
                var lookup = FS.lookupPath(path, { follow: !dontFollow });
                node = lookup.node;
            } else {
                node = path;
            }
            if (!node.node_ops.setattr) {
                throw new FS.ErrnoError(1);
            }
            node.node_ops.setattr(node, { mode: (mode & 4095) | (node.mode & ~4095), timestamp: Date.now() });
        },
        lchmod: function(path, mode) {
            FS.chmod(path, mode, true);
        },
        fchmod: function(fd, mode) {
            var stream = FS.getStream(fd);
            if (!stream) {
                throw new FS.ErrnoError(9);
            }
            FS.chmod(stream.node, mode);
        },
        chown: function(path, uid, gid, dontFollow) {
            var node;
            if (typeof path === "string") {
                var lookup = FS.lookupPath(path, { follow: !dontFollow });
                node = lookup.node;
            } else {
                node = path;
            }
            if (!node.node_ops.setattr) {
                throw new FS.ErrnoError(1);
            }
            node.node_ops.setattr(node, { timestamp: Date.now() });
        },
        lchown: function(path, uid, gid) {
            FS.chown(path, uid, gid, true);
        },
        fchown: function(fd, uid, gid) {
            var stream = FS.getStream(fd);
            if (!stream) {
                throw new FS.ErrnoError(9);
            }
            FS.chown(stream.node, uid, gid);
        },
        truncate: function(path, len) {
            if (len < 0) {
                throw new FS.ErrnoError(22);
            }
            var node;
            if (typeof path === "string") {
                var lookup = FS.lookupPath(path, { follow: true });
                node = lookup.node;
            } else {
                node = path;
            }
            if (!node.node_ops.setattr) {
                throw new FS.ErrnoError(1);
            }
            if (FS.isDir(node.mode)) {
                throw new FS.ErrnoError(21);
            }
            if (!FS.isFile(node.mode)) {
                throw new FS.ErrnoError(22);
            }
            var err = FS.nodePermissions(node, "w");
            if (err) {
                throw new FS.ErrnoError(err);
            }
            node.node_ops.setattr(node, { size: len, timestamp: Date.now() });
        },
        ftruncate: function(fd, len) {
            var stream = FS.getStream(fd);
            if (!stream) {
                throw new FS.ErrnoError(9);
            }
            if ((stream.flags & 2097155) === 0) {
                throw new FS.ErrnoError(22);
            }
            FS.truncate(stream.node, len);
        },
        utime: function(path, atime, mtime) {
            var lookup = FS.lookupPath(path, { follow: true });
            var node = lookup.node;
            node.node_ops.setattr(node, { timestamp: Math.max(atime, mtime) });
        },
        open: function(path, flags, mode, fd_start, fd_end) {
            if (path === "") {
                throw new FS.ErrnoError(2);
            }
            flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
            mode = typeof mode === "undefined" ? 438 : mode;
            if (flags & 64) {
                mode = (mode & 4095) | 32768;
            } else {
                mode = 0;
            }
            var node;
            if (typeof path === "object") {
                node = path;
            } else {
                path = PATH.normalize(path);
                try {
                    var lookup = FS.lookupPath(path, { follow: !(flags & 131072) });
                    node = lookup.node;
                } catch (e) {}
            }
            var created = false;
            if (flags & 64) {
                if (node) {
                    if (flags & 128) {
                        throw new FS.ErrnoError(17);
                    }
                } else {
                    node = FS.mknod(path, mode, 0);
                    created = true;
                }
            }
            if (!node) {
                throw new FS.ErrnoError(2);
            }
            if (FS.isChrdev(node.mode)) {
                flags &= ~512;
            }
            if (flags & 65536 && !FS.isDir(node.mode)) {
                throw new FS.ErrnoError(20);
            }
            if (!created) {
                var err = FS.mayOpen(node, flags);
                if (err) {
                    throw new FS.ErrnoError(err);
                }
            }
            if (flags & 512) {
                FS.truncate(node, 0);
            }
            flags &= ~(128 | 512);
            var stream = FS.createStream(
                {
                    node: node,
                    path: FS.getPath(node),
                    flags: flags,
                    seekable: true,
                    position: 0,
                    stream_ops: node.stream_ops,
                    ungotten: [],
                    error: false
                },
                fd_start,
                fd_end
            );
            if (stream.stream_ops.open) {
                stream.stream_ops.open(stream);
            }
            if (Module["logReadFiles"] && !(flags & 1)) {
                if (!FS.readFiles) FS.readFiles = {};
                if (!(path in FS.readFiles)) {
                    FS.readFiles[path] = 1;
                    console.log("FS.trackingDelegate error on read file: " + path);
                }
            }
            try {
                if (FS.trackingDelegate["onOpenFile"]) {
                    var trackingFlags = 0;
                    if ((flags & 2097155) !== 1) {
                        trackingFlags |= FS.tracking.openFlags.READ;
                    }
                    if ((flags & 2097155) !== 0) {
                        trackingFlags |= FS.tracking.openFlags.WRITE;
                    }
                    FS.trackingDelegate["onOpenFile"](path, trackingFlags);
                }
            } catch (e) {
                console.log(
                    "FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message
                );
            }
            return stream;
        },
        close: function(stream) {
            if (FS.isClosed(stream)) {
                throw new FS.ErrnoError(9);
            }
            if (stream.getdents) stream.getdents = null;
            try {
                if (stream.stream_ops.close) {
                    stream.stream_ops.close(stream);
                }
            } catch (e) {
                throw e;
            } finally {
                FS.closeStream(stream.fd);
            }
            stream.fd = null;
        },
        isClosed: function(stream) {
            return stream.fd === null;
        },
        llseek: function(stream, offset, whence) {
            if (FS.isClosed(stream)) {
                throw new FS.ErrnoError(9);
            }
            if (!stream.seekable || !stream.stream_ops.llseek) {
                throw new FS.ErrnoError(29);
            }
            if (whence != 0 && whence != 1 && whence != 2) {
                throw new FS.ErrnoError(22);
            }
            stream.position = stream.stream_ops.llseek(stream, offset, whence);
            stream.ungotten = [];
            return stream.position;
        },
        read: function(stream, buffer, offset, length, position) {
            if (length < 0 || position < 0) {
                throw new FS.ErrnoError(22);
            }
            if (FS.isClosed(stream)) {
                throw new FS.ErrnoError(9);
            }
            if ((stream.flags & 2097155) === 1) {
                throw new FS.ErrnoError(9);
            }
            if (FS.isDir(stream.node.mode)) {
                throw new FS.ErrnoError(21);
            }
            if (!stream.stream_ops.read) {
                throw new FS.ErrnoError(22);
            }
            var seeking = typeof position !== "undefined";
            if (!seeking) {
                position = stream.position;
            } else if (!stream.seekable) {
                throw new FS.ErrnoError(29);
            }
            var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
            if (!seeking) stream.position += bytesRead;
            return bytesRead;
        },
        write: function(stream, buffer, offset, length, position, canOwn) {
            if (length < 0 || position < 0) {
                throw new FS.ErrnoError(22);
            }
            if (FS.isClosed(stream)) {
                throw new FS.ErrnoError(9);
            }
            if ((stream.flags & 2097155) === 0) {
                throw new FS.ErrnoError(9);
            }
            if (FS.isDir(stream.node.mode)) {
                throw new FS.ErrnoError(21);
            }
            if (!stream.stream_ops.write) {
                throw new FS.ErrnoError(22);
            }
            if (stream.flags & 1024) {
                FS.llseek(stream, 0, 2);
            }
            var seeking = typeof position !== "undefined";
            if (!seeking) {
                position = stream.position;
            } else if (!stream.seekable) {
                throw new FS.ErrnoError(29);
            }
            var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
            if (!seeking) stream.position += bytesWritten;
            try {
                if (stream.path && FS.trackingDelegate["onWriteToFile"])
                    FS.trackingDelegate["onWriteToFile"](stream.path);
            } catch (e) {
                console.log(
                    "FS.trackingDelegate['onWriteToFile']('" + stream.path + "') threw an exception: " + e.message
                );
            }
            return bytesWritten;
        },
        allocate: function(stream, offset, length) {
            if (FS.isClosed(stream)) {
                throw new FS.ErrnoError(9);
            }
            if (offset < 0 || length <= 0) {
                throw new FS.ErrnoError(22);
            }
            if ((stream.flags & 2097155) === 0) {
                throw new FS.ErrnoError(9);
            }
            if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
                throw new FS.ErrnoError(19);
            }
            if (!stream.stream_ops.allocate) {
                throw new FS.ErrnoError(95);
            }
            stream.stream_ops.allocate(stream, offset, length);
        },
        mmap: function(stream, buffer, offset, length, position, prot, flags) {
            if ((stream.flags & 2097155) === 1) {
                throw new FS.ErrnoError(13);
            }
            if (!stream.stream_ops.mmap) {
                throw new FS.ErrnoError(19);
            }
            return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
        },
        msync: function(stream, buffer, offset, length, mmapFlags) {
            if (!stream || !stream.stream_ops.msync) {
                return 0;
            }
            return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
        },
        munmap: function(stream) {
            return 0;
        },
        ioctl: function(stream, cmd, arg) {
            if (!stream.stream_ops.ioctl) {
                throw new FS.ErrnoError(25);
            }
            return stream.stream_ops.ioctl(stream, cmd, arg);
        },
        readFile: function(path, opts) {
            opts = opts || {};
            opts.flags = opts.flags || "r";
            opts.encoding = opts.encoding || "binary";
            if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
                throw new Error('Invalid encoding type "' + opts.encoding + '"');
            }
            var ret;
            var stream = FS.open(path, opts.flags);
            var stat = FS.stat(path);
            var length = stat.size;
            var buf = new Uint8Array(length);
            FS.read(stream, buf, 0, length, 0);
            if (opts.encoding === "utf8") {
                ret = UTF8ArrayToString(buf, 0);
            } else if (opts.encoding === "binary") {
                ret = buf;
            }
            FS.close(stream);
            return ret;
        },
        writeFile: function(path, data, opts) {
            opts = opts || {};
            opts.flags = opts.flags || "w";
            var stream = FS.open(path, opts.flags, opts.mode);
            if (typeof data === "string") {
                var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
                var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
                FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
            } else if (ArrayBuffer.isView(data)) {
                FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
            } else {
                throw new Error("Unsupported data type");
            }
            FS.close(stream);
        },
        cwd: function() {
            return FS.currentPath;
        },
        chdir: function(path) {
            var lookup = FS.lookupPath(path, { follow: true });
            if (lookup.node === null) {
                throw new FS.ErrnoError(2);
            }
            if (!FS.isDir(lookup.node.mode)) {
                throw new FS.ErrnoError(20);
            }
            var err = FS.nodePermissions(lookup.node, "x");
            if (err) {
                throw new FS.ErrnoError(err);
            }
            FS.currentPath = lookup.path;
        },
        createDefaultDirectories: function() {
            FS.mkdir("/tmp");
            FS.mkdir("/home");
            FS.mkdir("/home/web_user");
        },
        createDefaultDevices: function() {
            FS.mkdir("/dev");
            FS.registerDevice(FS.makedev(1, 3), {
                read: function() {
                    return 0;
                },
                write: function(stream, buffer, offset, length, pos) {
                    return length;
                }
            });
            FS.mkdev("/dev/null", FS.makedev(1, 3));
            TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
            TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
            FS.mkdev("/dev/tty", FS.makedev(5, 0));
            FS.mkdev("/dev/tty1", FS.makedev(6, 0));
            var random_device;
            if (typeof crypto === "object" && typeof crypto["getRandomValues"] === "function") {
                var randomBuffer = new Uint8Array(1);
                random_device = function() {
                    crypto.getRandomValues(randomBuffer);
                    return randomBuffer[0];
                };
            } else if (ENVIRONMENT_IS_NODE) {
                try {
                    var crypto_module = require("crypto");
                    random_device = function() {
                        return crypto_module["randomBytes"](1)[0];
                    };
                } catch (e) {
                    random_device = function() {
                        return (Math.random() * 256) | 0;
                    };
                }
            } else {
                random_device = function() {
                    abort("random_device");
                };
            }
            FS.createDevice("/dev", "random", random_device);
            FS.createDevice("/dev", "urandom", random_device);
            FS.mkdir("/dev/shm");
            FS.mkdir("/dev/shm/tmp");
        },
        createSpecialDirectories: function() {
            FS.mkdir("/proc");
            FS.mkdir("/proc/self");
            FS.mkdir("/proc/self/fd");
            FS.mount(
                {
                    mount: function() {
                        var node = FS.createNode("/proc/self", "fd", 16384 | 511, 73);
                        node.node_ops = {
                            lookup: function(parent, name) {
                                var fd = +name;
                                var stream = FS.getStream(fd);
                                if (!stream) throw new FS.ErrnoError(9);
                                var ret = {
                                    parent: null,
                                    mount: { mountpoint: "fake" },
                                    node_ops: {
                                        readlink: function() {
                                            return stream.path;
                                        }
                                    }
                                };
                                ret.parent = ret;
                                return ret;
                            }
                        };
                        return node;
                    }
                },
                {},
                "/proc/self/fd"
            );
        },
        createStandardStreams: function() {
            if (Module["stdin"]) {
                FS.createDevice("/dev", "stdin", Module["stdin"]);
            } else {
                FS.symlink("/dev/tty", "/dev/stdin");
            }
            if (Module["stdout"]) {
                FS.createDevice("/dev", "stdout", null, Module["stdout"]);
            } else {
                FS.symlink("/dev/tty", "/dev/stdout");
            }
            if (Module["stderr"]) {
                FS.createDevice("/dev", "stderr", null, Module["stderr"]);
            } else {
                FS.symlink("/dev/tty1", "/dev/stderr");
            }
            var stdin = FS.open("/dev/stdin", "r");
            var stdout = FS.open("/dev/stdout", "w");
            var stderr = FS.open("/dev/stderr", "w");
        },
        ensureErrnoError: function() {
            if (FS.ErrnoError) return;
            FS.ErrnoError = function ErrnoError(errno, node) {
                this.node = node;
                this.setErrno = function(errno) {
                    this.errno = errno;
                };
                this.setErrno(errno);
                this.message = "FS error";
                if (this.stack) Object.defineProperty(this, "stack", { value: new Error().stack, writable: true });
            };
            FS.ErrnoError.prototype = new Error();
            FS.ErrnoError.prototype.constructor = FS.ErrnoError;
            [2].forEach(function(code) {
                FS.genericErrors[code] = new FS.ErrnoError(code);
                FS.genericErrors[code].stack = "<generic error, no stack>";
            });
        },
        staticInit: function() {
            FS.ensureErrnoError();
            FS.nameTable = new Array(4096);
            FS.mount(MEMFS, {}, "/");
            FS.createDefaultDirectories();
            FS.createDefaultDevices();
            FS.createSpecialDirectories();
            FS.filesystems = { MEMFS: MEMFS, IDBFS: IDBFS, NODEFS: NODEFS, WORKERFS: WORKERFS };
        },
        init: function(input, output, error) {
            FS.init.initialized = true;
            FS.ensureErrnoError();
            Module["stdin"] = input || Module["stdin"];
            Module["stdout"] = output || Module["stdout"];
            Module["stderr"] = error || Module["stderr"];
            FS.createStandardStreams();
        },
        quit: function() {
            FS.init.initialized = false;
            var fflush = Module["_fflush"];
            if (fflush) fflush(0);
            for (var i = 0; i < FS.streams.length; i++) {
                var stream = FS.streams[i];
                if (!stream) {
                    continue;
                }
                FS.close(stream);
            }
        },
        getMode: function(canRead, canWrite) {
            var mode = 0;
            if (canRead) mode |= 292 | 73;
            if (canWrite) mode |= 146;
            return mode;
        },
        joinPath: function(parts, forceRelative) {
            var path = PATH.join.apply(null, parts);
            if (forceRelative && path[0] == "/") path = path.substr(1);
            return path;
        },
        absolutePath: function(relative, base) {
            return PATH.resolve(base, relative);
        },
        standardizePath: function(path) {
            return PATH.normalize(path);
        },
        findObject: function(path, dontResolveLastLink) {
            var ret = FS.analyzePath(path, dontResolveLastLink);
            if (ret.exists) {
                return ret.object;
            } else {
                ___setErrNo(ret.error);
                return null;
            }
        },
        analyzePath: function(path, dontResolveLastLink) {
            try {
                var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
                path = lookup.path;
            } catch (e) {}
            var ret = {
                isRoot: false,
                exists: false,
                error: 0,
                name: null,
                path: null,
                object: null,
                parentExists: false,
                parentPath: null,
                parentObject: null
            };
            try {
                var lookup = FS.lookupPath(path, { parent: true });
                ret.parentExists = true;
                ret.parentPath = lookup.path;
                ret.parentObject = lookup.node;
                ret.name = PATH.basename(path);
                lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
                ret.exists = true;
                ret.path = lookup.path;
                ret.object = lookup.node;
                ret.name = lookup.node.name;
                ret.isRoot = lookup.path === "/";
            } catch (e) {
                ret.error = e.errno;
            }
            return ret;
        },
        createFolder: function(parent, name, canRead, canWrite) {
            var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
            var mode = FS.getMode(canRead, canWrite);
            return FS.mkdir(path, mode);
        },
        createPath: function(parent, path, canRead, canWrite) {
            parent = typeof parent === "string" ? parent : FS.getPath(parent);
            var parts = path.split("/").reverse();
            while (parts.length) {
                var part = parts.pop();
                if (!part) continue;
                var current = PATH.join2(parent, part);
                try {
                    FS.mkdir(current);
                } catch (e) {}
                parent = current;
            }
            return current;
        },
        createFile: function(parent, name, properties, canRead, canWrite) {
            var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
            var mode = FS.getMode(canRead, canWrite);
            return FS.create(path, mode);
        },
        createDataFile: function(parent, name, data, canRead, canWrite, canOwn) {
            var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
            var mode = FS.getMode(canRead, canWrite);
            var node = FS.create(path, mode);
            if (data) {
                if (typeof data === "string") {
                    var arr = new Array(data.length);
                    for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
                    data = arr;
                }
                FS.chmod(node, mode | 146);
                var stream = FS.open(node, "w");
                FS.write(stream, data, 0, data.length, 0, canOwn);
                FS.close(stream);
                FS.chmod(node, mode);
            }
            return node;
        },
        createDevice: function(parent, name, input, output) {
            var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
            var mode = FS.getMode(!!input, !!output);
            if (!FS.createDevice.major) FS.createDevice.major = 64;
            var dev = FS.makedev(FS.createDevice.major++, 0);
            FS.registerDevice(dev, {
                open: function(stream) {
                    stream.seekable = false;
                },
                close: function(stream) {
                    if (output && output.buffer && output.buffer.length) {
                        output(10);
                    }
                },
                read: function(stream, buffer, offset, length, pos) {
                    var bytesRead = 0;
                    for (var i = 0; i < length; i++) {
                        var result;
                        try {
                            result = input();
                        } catch (e) {
                            throw new FS.ErrnoError(5);
                        }
                        if (result === undefined && bytesRead === 0) {
                            throw new FS.ErrnoError(11);
                        }
                        if (result === null || result === undefined) break;
                        bytesRead++;
                        buffer[offset + i] = result;
                    }
                    if (bytesRead) {
                        stream.node.timestamp = Date.now();
                    }
                    return bytesRead;
                },
                write: function(stream, buffer, offset, length, pos) {
                    for (var i = 0; i < length; i++) {
                        try {
                            output(buffer[offset + i]);
                        } catch (e) {
                            throw new FS.ErrnoError(5);
                        }
                    }
                    if (length) {
                        stream.node.timestamp = Date.now();
                    }
                    return i;
                }
            });
            return FS.mkdev(path, mode, dev);
        },
        createLink: function(parent, name, target, canRead, canWrite) {
            var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
            return FS.symlink(target, path);
        },
        forceLoadFile: function(obj) {
            if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
            var success = true;
            if (typeof XMLHttpRequest !== "undefined") {
                throw new Error(
                    "Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread."
                );
            } else if (Module["read"]) {
                try {
                    obj.contents = intArrayFromString(Module["read"](obj.url), true);
                    obj.usedBytes = obj.contents.length;
                } catch (e) {
                    success = false;
                }
            } else {
                throw new Error("Cannot load without read() or XMLHttpRequest.");
            }
            if (!success) ___setErrNo(5);
            return success;
        },
        createLazyFile: function(parent, name, url, canRead, canWrite) {
            function LazyUint8Array() {
                this.lengthKnown = false;
                this.chunks = [];
            }
            LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
                if (idx > this.length - 1 || idx < 0) {
                    return undefined;
                }
                var chunkOffset = idx % this.chunkSize;
                var chunkNum = (idx / this.chunkSize) | 0;
                return this.getter(chunkNum)[chunkOffset];
            };
            LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
                this.getter = getter;
            };
            LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
                var xhr = new XMLHttpRequest();
                xhr.open("HEAD", url, false);
                xhr.send(null);
                if (!((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304))
                    throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                var datalength = Number(xhr.getResponseHeader("Content-length"));
                var header;
                var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
                var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
                var chunkSize = 1024 * 1024;
                if (!hasByteServing) chunkSize = datalength;
                var doXHR = function(from, to) {
                    if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                    if (to > datalength - 1)
                        throw new Error("only " + datalength + " bytes available! programmer error!");
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", url, false);
                    if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
                    if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
                    if (xhr.overrideMimeType) {
                        xhr.overrideMimeType("text/plain; charset=x-user-defined");
                    }
                    xhr.send(null);
                    if (!((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304))
                        throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                    if (xhr.response !== undefined) {
                        return new Uint8Array(xhr.response || []);
                    } else {
                        return intArrayFromString(xhr.responseText || "", true);
                    }
                };
                var lazyArray = this;
                lazyArray.setDataGetter(function(chunkNum) {
                    var start = chunkNum * chunkSize;
                    var end = (chunkNum + 1) * chunkSize - 1;
                    end = Math.min(end, datalength - 1);
                    if (typeof lazyArray.chunks[chunkNum] === "undefined") {
                        lazyArray.chunks[chunkNum] = doXHR(start, end);
                    }
                    if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
                    return lazyArray.chunks[chunkNum];
                });
                if (usesGzip || !datalength) {
                    chunkSize = datalength = 1;
                    datalength = this.getter(0).length;
                    chunkSize = datalength;
                    console.log("LazyFiles on gzip forces download of the whole file when length is accessed");
                }
                this._length = datalength;
                this._chunkSize = chunkSize;
                this.lengthKnown = true;
            };
            if (typeof XMLHttpRequest !== "undefined") {
                if (!ENVIRONMENT_IS_WORKER)
                    throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
                var lazyArray = new LazyUint8Array();
                Object.defineProperties(lazyArray, {
                    length: {
                        get: function() {
                            if (!this.lengthKnown) {
                                this.cacheLength();
                            }
                            return this._length;
                        }
                    },
                    chunkSize: {
                        get: function() {
                            if (!this.lengthKnown) {
                                this.cacheLength();
                            }
                            return this._chunkSize;
                        }
                    }
                });
                var properties = { isDevice: false, contents: lazyArray };
            } else {
                var properties = { isDevice: false, url: url };
            }
            var node = FS.createFile(parent, name, properties, canRead, canWrite);
            if (properties.contents) {
                node.contents = properties.contents;
            } else if (properties.url) {
                node.contents = null;
                node.url = properties.url;
            }
            Object.defineProperties(node, {
                usedBytes: {
                    get: function() {
                        return this.contents.length;
                    }
                }
            });
            var stream_ops = {};
            var keys = Object.keys(node.stream_ops);
            keys.forEach(function(key) {
                var fn = node.stream_ops[key];
                stream_ops[key] = function forceLoadLazyFile() {
                    if (!FS.forceLoadFile(node)) {
                        throw new FS.ErrnoError(5);
                    }
                    return fn.apply(null, arguments);
                };
            });
            stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
                if (!FS.forceLoadFile(node)) {
                    throw new FS.ErrnoError(5);
                }
                var contents = stream.node.contents;
                if (position >= contents.length) return 0;
                var size = Math.min(contents.length - position, length);
                if (contents.slice) {
                    for (var i = 0; i < size; i++) {
                        buffer[offset + i] = contents[position + i];
                    }
                } else {
                    for (var i = 0; i < size; i++) {
                        buffer[offset + i] = contents.get(position + i);
                    }
                }
                return size;
            };
            node.stream_ops = stream_ops;
            return node;
        },
        createPreloadedFile: function(
            parent,
            name,
            url,
            canRead,
            canWrite,
            onload,
            onerror,
            dontCreateFile,
            canOwn,
            preFinish
        ) {
            Browser.init();
            var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
            var dep = getUniqueRunDependency("cp " + fullname);
            function processData(byteArray) {
                function finish(byteArray) {
                    if (preFinish) preFinish();
                    if (!dontCreateFile) {
                        FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
                    }
                    if (onload) onload();
                    removeRunDependency(dep);
                }
                var handled = false;
                Module["preloadPlugins"].forEach(function(plugin) {
                    if (handled) return;
                    if (plugin["canHandle"](fullname)) {
                        plugin["handle"](byteArray, fullname, finish, function() {
                            if (onerror) onerror();
                            removeRunDependency(dep);
                        });
                        handled = true;
                    }
                });
                if (!handled) finish(byteArray);
            }
            addRunDependency(dep);
            if (typeof url == "string") {
                Browser.asyncLoad(
                    url,
                    function(byteArray) {
                        processData(byteArray);
                    },
                    onerror
                );
            } else {
                processData(url);
            }
        },
        indexedDB: function() {
            return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        },
        DB_NAME: function() {
            return "EM_FS_" + window.location.pathname;
        },
        DB_VERSION: 20,
        DB_STORE_NAME: "FILE_DATA",
        saveFilesToDB: function(paths, onload, onerror) {
            onload = onload || function() {};
            onerror = onerror || function() {};
            var indexedDB = FS.indexedDB();
            try {
                var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
            } catch (e) {
                return onerror(e);
            }
            openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
                console.log("creating db");
                var db = openRequest.result;
                db.createObjectStore(FS.DB_STORE_NAME);
            };
            openRequest.onsuccess = function openRequest_onsuccess() {
                var db = openRequest.result;
                var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
                var files = transaction.objectStore(FS.DB_STORE_NAME);
                var ok = 0,
                    fail = 0,
                    total = paths.length;
                function finish() {
                    if (fail == 0) onload();
                    else onerror();
                }
                paths.forEach(function(path) {
                    var putRequest = files.put(FS.analyzePath(path).object.contents, path);
                    putRequest.onsuccess = function putRequest_onsuccess() {
                        ok++;
                        if (ok + fail == total) finish();
                    };
                    putRequest.onerror = function putRequest_onerror() {
                        fail++;
                        if (ok + fail == total) finish();
                    };
                });
                transaction.onerror = onerror;
            };
            openRequest.onerror = onerror;
        },
        loadFilesFromDB: function(paths, onload, onerror) {
            onload = onload || function() {};
            onerror = onerror || function() {};
            var indexedDB = FS.indexedDB();
            try {
                var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
            } catch (e) {
                return onerror(e);
            }
            openRequest.onupgradeneeded = onerror;
            openRequest.onsuccess = function openRequest_onsuccess() {
                var db = openRequest.result;
                try {
                    var transaction = db.transaction([FS.DB_STORE_NAME], "readonly");
                } catch (e) {
                    onerror(e);
                    return;
                }
                var files = transaction.objectStore(FS.DB_STORE_NAME);
                var ok = 0,
                    fail = 0,
                    total = paths.length;
                function finish() {
                    if (fail == 0) onload();
                    else onerror();
                }
                paths.forEach(function(path) {
                    var getRequest = files.get(path);
                    getRequest.onsuccess = function getRequest_onsuccess() {
                        if (FS.analyzePath(path).exists) {
                            FS.unlink(path);
                        }
                        FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
                        ok++;
                        if (ok + fail == total) finish();
                    };
                    getRequest.onerror = function getRequest_onerror() {
                        fail++;
                        if (ok + fail == total) finish();
                    };
                });
                transaction.onerror = onerror;
            };
            openRequest.onerror = onerror;
        }
    };
    var ERRNO_CODES = {
        EPERM: 1,
        ENOENT: 2,
        ESRCH: 3,
        EINTR: 4,
        EIO: 5,
        ENXIO: 6,
        E2BIG: 7,
        ENOEXEC: 8,
        EBADF: 9,
        ECHILD: 10,
        EAGAIN: 11,
        EWOULDBLOCK: 11,
        ENOMEM: 12,
        EACCES: 13,
        EFAULT: 14,
        ENOTBLK: 15,
        EBUSY: 16,
        EEXIST: 17,
        EXDEV: 18,
        ENODEV: 19,
        ENOTDIR: 20,
        EISDIR: 21,
        EINVAL: 22,
        ENFILE: 23,
        EMFILE: 24,
        ENOTTY: 25,
        ETXTBSY: 26,
        EFBIG: 27,
        ENOSPC: 28,
        ESPIPE: 29,
        EROFS: 30,
        EMLINK: 31,
        EPIPE: 32,
        EDOM: 33,
        ERANGE: 34,
        ENOMSG: 42,
        EIDRM: 43,
        ECHRNG: 44,
        EL2NSYNC: 45,
        EL3HLT: 46,
        EL3RST: 47,
        ELNRNG: 48,
        EUNATCH: 49,
        ENOCSI: 50,
        EL2HLT: 51,
        EDEADLK: 35,
        ENOLCK: 37,
        EBADE: 52,
        EBADR: 53,
        EXFULL: 54,
        ENOANO: 55,
        EBADRQC: 56,
        EBADSLT: 57,
        EDEADLOCK: 35,
        EBFONT: 59,
        ENOSTR: 60,
        ENODATA: 61,
        ETIME: 62,
        ENOSR: 63,
        ENONET: 64,
        ENOPKG: 65,
        EREMOTE: 66,
        ENOLINK: 67,
        EADV: 68,
        ESRMNT: 69,
        ECOMM: 70,
        EPROTO: 71,
        EMULTIHOP: 72,
        EDOTDOT: 73,
        EBADMSG: 74,
        ENOTUNIQ: 76,
        EBADFD: 77,
        EREMCHG: 78,
        ELIBACC: 79,
        ELIBBAD: 80,
        ELIBSCN: 81,
        ELIBMAX: 82,
        ELIBEXEC: 83,
        ENOSYS: 38,
        ENOTEMPTY: 39,
        ENAMETOOLONG: 36,
        ELOOP: 40,
        EOPNOTSUPP: 95,
        EPFNOSUPPORT: 96,
        ECONNRESET: 104,
        ENOBUFS: 105,
        EAFNOSUPPORT: 97,
        EPROTOTYPE: 91,
        ENOTSOCK: 88,
        ENOPROTOOPT: 92,
        ESHUTDOWN: 108,
        ECONNREFUSED: 111,
        EADDRINUSE: 98,
        ECONNABORTED: 103,
        ENETUNREACH: 101,
        ENETDOWN: 100,
        ETIMEDOUT: 110,
        EHOSTDOWN: 112,
        EHOSTUNREACH: 113,
        EINPROGRESS: 115,
        EALREADY: 114,
        EDESTADDRREQ: 89,
        EMSGSIZE: 90,
        EPROTONOSUPPORT: 93,
        ESOCKTNOSUPPORT: 94,
        EADDRNOTAVAIL: 99,
        ENETRESET: 102,
        EISCONN: 106,
        ENOTCONN: 107,
        ETOOMANYREFS: 109,
        EUSERS: 87,
        EDQUOT: 122,
        ESTALE: 116,
        ENOTSUP: 95,
        ENOMEDIUM: 123,
        EILSEQ: 84,
        EOVERFLOW: 75,
        ECANCELED: 125,
        ENOTRECOVERABLE: 131,
        EOWNERDEAD: 130,
        ESTRPIPE: 86
    };
    var SYSCALLS = {
        DEFAULT_POLLMASK: 5,
        mappings: {},
        umask: 511,
        calculateAt: function(dirfd, path) {
            if (path[0] !== "/") {
                var dir;
                if (dirfd === -100) {
                    dir = FS.cwd();
                } else {
                    var dirstream = FS.getStream(dirfd);
                    if (!dirstream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
                    dir = dirstream.path;
                }
                path = PATH.join2(dir, path);
            }
            return path;
        },
        doStat: function(func, path, buf) {
            try {
                var stat = func(path);
            } catch (e) {
                if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
                    return -ERRNO_CODES.ENOTDIR;
                }
                throw e;
            }
            HEAP32[buf >> 2] = stat.dev;
            HEAP32[(buf + 4) >> 2] = 0;
            HEAP32[(buf + 8) >> 2] = stat.ino;
            HEAP32[(buf + 12) >> 2] = stat.mode;
            HEAP32[(buf + 16) >> 2] = stat.nlink;
            HEAP32[(buf + 20) >> 2] = stat.uid;
            HEAP32[(buf + 24) >> 2] = stat.gid;
            HEAP32[(buf + 28) >> 2] = stat.rdev;
            HEAP32[(buf + 32) >> 2] = 0;
            HEAP32[(buf + 36) >> 2] = stat.size;
            HEAP32[(buf + 40) >> 2] = 4096;
            HEAP32[(buf + 44) >> 2] = stat.blocks;
            HEAP32[(buf + 48) >> 2] = (stat.atime.getTime() / 1e3) | 0;
            HEAP32[(buf + 52) >> 2] = 0;
            HEAP32[(buf + 56) >> 2] = (stat.mtime.getTime() / 1e3) | 0;
            HEAP32[(buf + 60) >> 2] = 0;
            HEAP32[(buf + 64) >> 2] = (stat.ctime.getTime() / 1e3) | 0;
            HEAP32[(buf + 68) >> 2] = 0;
            HEAP32[(buf + 72) >> 2] = stat.ino;
            return 0;
        },
        doMsync: function(addr, stream, len, flags) {
            var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
            FS.msync(stream, buffer, 0, len, flags);
        },
        doMkdir: function(path, mode) {
            path = PATH.normalize(path);
            if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
            FS.mkdir(path, mode, 0);
            return 0;
        },
        doMknod: function(path, mode, dev) {
            switch (mode & 61440) {
                case 32768:
                case 8192:
                case 24576:
                case 4096:
                case 49152:
                    break;
                default:
                    return -ERRNO_CODES.EINVAL;
            }
            FS.mknod(path, mode, dev);
            return 0;
        },
        doReadlink: function(path, buf, bufsize) {
            if (bufsize <= 0) return -ERRNO_CODES.EINVAL;
            var ret = FS.readlink(path);
            var len = Math.min(bufsize, lengthBytesUTF8(ret));
            var endChar = HEAP8[buf + len];
            stringToUTF8(ret, buf, bufsize + 1);
            HEAP8[buf + len] = endChar;
            return len;
        },
        doAccess: function(path, amode) {
            if (amode & ~7) {
                return -ERRNO_CODES.EINVAL;
            }
            var node;
            var lookup = FS.lookupPath(path, { follow: true });
            node = lookup.node;
            var perms = "";
            if (amode & 4) perms += "r";
            if (amode & 2) perms += "w";
            if (amode & 1) perms += "x";
            if (perms && FS.nodePermissions(node, perms)) {
                return -ERRNO_CODES.EACCES;
            }
            return 0;
        },
        doDup: function(path, flags, suggestFD) {
            var suggest = FS.getStream(suggestFD);
            if (suggest) FS.close(suggest);
            return FS.open(path, flags, 0, suggestFD, suggestFD).fd;
        },
        doReadv: function(stream, iov, iovcnt, offset) {
            var ret = 0;
            for (var i = 0; i < iovcnt; i++) {
                var ptr = HEAP32[(iov + i * 8) >> 2];
                var len = HEAP32[(iov + (i * 8 + 4)) >> 2];
                var curr = FS.read(stream, HEAP8, ptr, len, offset);
                if (curr < 0) return -1;
                ret += curr;
                if (curr < len) break;
            }
            return ret;
        },
        doWritev: function(stream, iov, iovcnt, offset) {
            var ret = 0;
            for (var i = 0; i < iovcnt; i++) {
                var ptr = HEAP32[(iov + i * 8) >> 2];
                var len = HEAP32[(iov + (i * 8 + 4)) >> 2];
                var curr = FS.write(stream, HEAP8, ptr, len, offset);
                if (curr < 0) return -1;
                ret += curr;
            }
            return ret;
        },
        varargs: 0,
        get: function(varargs) {
            SYSCALLS.varargs += 4;
            var ret = HEAP32[(SYSCALLS.varargs - 4) >> 2];
            return ret;
        },
        getStr: function() {
            var ret = UTF8ToString(SYSCALLS.get());
            return ret;
        },
        getStreamFromFD: function() {
            var stream = FS.getStream(SYSCALLS.get());
            if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
            return stream;
        },
        getSocketFromFD: function() {
            var socket = SOCKFS.getSocket(SYSCALLS.get());
            if (!socket) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
            return socket;
        },
        getSocketAddress: function(allowNull) {
            var addrp = SYSCALLS.get(),
                addrlen = SYSCALLS.get();
            if (allowNull && addrp === 0) return null;
            var info = __read_sockaddr(addrp, addrlen);
            if (info.errno) throw new FS.ErrnoError(info.errno);
            info.addr = DNS.lookup_addr(info.addr) || info.addr;
            return info;
        },
        get64: function() {
            var low = SYSCALLS.get(),
                high = SYSCALLS.get();
            return low;
        },
        getZero: function() {
            SYSCALLS.get();
        }
    };
    function ___syscall140(which, varargs) {
        SYSCALLS.varargs = varargs;
        try {
            var stream = SYSCALLS.getStreamFromFD(),
                offset_high = SYSCALLS.get(),
                offset_low = SYSCALLS.get(),
                result = SYSCALLS.get(),
                whence = SYSCALLS.get();
            var offset = offset_low;
            FS.llseek(stream, offset, whence);
            HEAP32[result >> 2] = stream.position;
            if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
            return 0;
        } catch (e) {
            if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
            return -e.errno;
        }
    }
    function ___syscall146(which, varargs) {
        SYSCALLS.varargs = varargs;
        try {
            var stream = SYSCALLS.getStreamFromFD(),
                iov = SYSCALLS.get(),
                iovcnt = SYSCALLS.get();
            return SYSCALLS.doWritev(stream, iov, iovcnt);
        } catch (e) {
            if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
            return -e.errno;
        }
    }
    function ___syscall221(which, varargs) {
        SYSCALLS.varargs = varargs;
        try {
            var stream = SYSCALLS.getStreamFromFD(),
                cmd = SYSCALLS.get();
            switch (cmd) {
                case 0: {
                    var arg = SYSCALLS.get();
                    if (arg < 0) {
                        return -ERRNO_CODES.EINVAL;
                    }
                    var newStream;
                    newStream = FS.open(stream.path, stream.flags, 0, arg);
                    return newStream.fd;
                }
                case 1:
                case 2:
                    return 0;
                case 3:
                    return stream.flags;
                case 4: {
                    var arg = SYSCALLS.get();
                    stream.flags |= arg;
                    return 0;
                }
                case 12: {
                    var arg = SYSCALLS.get();
                    var offset = 0;
                    HEAP16[(arg + offset) >> 1] = 2;
                    return 0;
                }
                case 13:
                case 14:
                    return 0;
                case 16:
                case 8:
                    return -ERRNO_CODES.EINVAL;
                case 9:
                    ___setErrNo(ERRNO_CODES.EINVAL);
                    return -1;
                default: {
                    return -ERRNO_CODES.EINVAL;
                }
            }
        } catch (e) {
            if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
            return -e.errno;
        }
    }
    function ___syscall3(which, varargs) {
        SYSCALLS.varargs = varargs;
        try {
            var stream = SYSCALLS.getStreamFromFD(),
                buf = SYSCALLS.get(),
                count = SYSCALLS.get();
            return FS.read(stream, HEAP8, buf, count);
        } catch (e) {
            if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
            return -e.errno;
        }
    }
    function ___syscall5(which, varargs) {
        SYSCALLS.varargs = varargs;
        try {
            var pathname = SYSCALLS.getStr(),
                flags = SYSCALLS.get(),
                mode = SYSCALLS.get();
            var stream = FS.open(pathname, flags, mode);
            return stream.fd;
        } catch (e) {
            if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
            return -e.errno;
        }
    }
    function ___syscall54(which, varargs) {
        SYSCALLS.varargs = varargs;
        try {
            var stream = SYSCALLS.getStreamFromFD(),
                op = SYSCALLS.get();
            switch (op) {
                case 21509:
                case 21505: {
                    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
                    return 0;
                }
                case 21510:
                case 21511:
                case 21512:
                case 21506:
                case 21507:
                case 21508: {
                    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
                    return 0;
                }
                case 21519: {
                    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
                    var argp = SYSCALLS.get();
                    HEAP32[argp >> 2] = 0;
                    return 0;
                }
                case 21520: {
                    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
                    return -ERRNO_CODES.EINVAL;
                }
                case 21531: {
                    var argp = SYSCALLS.get();
                    return FS.ioctl(stream, op, argp);
                }
                case 21523: {
                    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
                    return 0;
                }
                case 21524: {
                    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
                    return 0;
                }
                default:
                    abort("bad ioctl syscall " + op);
            }
        } catch (e) {
            if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
            return -e.errno;
        }
    }
    function ___syscall6(which, varargs) {
        SYSCALLS.varargs = varargs;
        try {
            var stream = SYSCALLS.getStreamFromFD();
            FS.close(stream);
            return 0;
        } catch (e) {
            if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
            return -e.errno;
        }
    }
    var tupleRegistrations = {};
    function runDestructors(destructors) {
        while (destructors.length) {
            var ptr = destructors.pop();
            var del = destructors.pop();
            del(ptr);
        }
    }
    function simpleReadValueFromPointer(pointer) {
        return this["fromWireType"](HEAPU32[pointer >> 2]);
    }
    var awaitingDependencies = {};
    var registeredTypes = {};
    var typeDependencies = {};
    var char_0 = 48;
    var char_9 = 57;
    function makeLegalFunctionName(name) {
        if (undefined === name) {
            return "_unknown";
        }
        name = name.replace(/[^a-zA-Z0-9_]/g, "$");
        var f = name.charCodeAt(0);
        if (f >= char_0 && f <= char_9) {
            return "_" + name;
        } else {
            return name;
        }
    }
    function createNamedFunction(name, body) {
        name = makeLegalFunctionName(name);
        return new Function(
            "body",
            "return function " +
                name +
                "() {\n" +
                '    "use strict";' +
                "    return body.apply(this, arguments);\n" +
                "};\n"
        )(body);
    }
    function extendError(baseErrorType, errorName) {
        var errorClass = createNamedFunction(errorName, function(message) {
            this.name = errorName;
            this.message = message;
            var stack = new Error(message).stack;
            if (stack !== undefined) {
                this.stack = this.toString() + "\n" + stack.replace(/^Error(:[^\n]*)?\n/, "");
            }
        });
        errorClass.prototype = Object.create(baseErrorType.prototype);
        errorClass.prototype.constructor = errorClass;
        errorClass.prototype.toString = function() {
            if (this.message === undefined) {
                return this.name;
            } else {
                return this.name + ": " + this.message;
            }
        };
        return errorClass;
    }
    var InternalError = undefined;
    function throwInternalError(message) {
        throw new InternalError(message);
    }
    function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
        myTypes.forEach(function(type) {
            typeDependencies[type] = dependentTypes;
        });
        function onComplete(typeConverters) {
            var myTypeConverters = getTypeConverters(typeConverters);
            if (myTypeConverters.length !== myTypes.length) {
                throwInternalError("Mismatched type converter count");
            }
            for (var i = 0; i < myTypes.length; ++i) {
                registerType(myTypes[i], myTypeConverters[i]);
            }
        }
        var typeConverters = new Array(dependentTypes.length);
        var unregisteredTypes = [];
        var registered = 0;
        dependentTypes.forEach(function(dt, i) {
            if (registeredTypes.hasOwnProperty(dt)) {
                typeConverters[i] = registeredTypes[dt];
            } else {
                unregisteredTypes.push(dt);
                if (!awaitingDependencies.hasOwnProperty(dt)) {
                    awaitingDependencies[dt] = [];
                }
                awaitingDependencies[dt].push(function() {
                    typeConverters[i] = registeredTypes[dt];
                    ++registered;
                    if (registered === unregisteredTypes.length) {
                        onComplete(typeConverters);
                    }
                });
            }
        });
        if (0 === unregisteredTypes.length) {
            onComplete(typeConverters);
        }
    }
    function __embind_finalize_value_array(rawTupleType) {
        var reg = tupleRegistrations[rawTupleType];
        delete tupleRegistrations[rawTupleType];
        var elements = reg.elements;
        var elementsLength = elements.length;
        var elementTypes = elements
            .map(function(elt) {
                return elt.getterReturnType;
            })
            .concat(
                elements.map(function(elt) {
                    return elt.setterArgumentType;
                })
            );
        var rawConstructor = reg.rawConstructor;
        var rawDestructor = reg.rawDestructor;
        whenDependentTypesAreResolved([rawTupleType], elementTypes, function(elementTypes) {
            elements.forEach(function(elt, i) {
                var getterReturnType = elementTypes[i];
                var getter = elt.getter;
                var getterContext = elt.getterContext;
                var setterArgumentType = elementTypes[i + elementsLength];
                var setter = elt.setter;
                var setterContext = elt.setterContext;
                elt.read = function(ptr) {
                    return getterReturnType["fromWireType"](getter(getterContext, ptr));
                };
                elt.write = function(ptr, o) {
                    var destructors = [];
                    setter(setterContext, ptr, setterArgumentType["toWireType"](destructors, o));
                    runDestructors(destructors);
                };
            });
            return [
                {
                    name: reg.name,
                    fromWireType: function(ptr) {
                        var rv = new Array(elementsLength);
                        for (var i = 0; i < elementsLength; ++i) {
                            rv[i] = elements[i].read(ptr);
                        }
                        rawDestructor(ptr);
                        return rv;
                    },
                    toWireType: function(destructors, o) {
                        if (elementsLength !== o.length) {
                            throw new TypeError(
                                "Incorrect number of tuple elements for " +
                                    reg.name +
                                    ": expected=" +
                                    elementsLength +
                                    ", actual=" +
                                    o.length
                            );
                        }
                        var ptr = rawConstructor();
                        for (var i = 0; i < elementsLength; ++i) {
                            elements[i].write(ptr, o[i]);
                        }
                        if (destructors !== null) {
                            destructors.push(rawDestructor, ptr);
                        }
                        return ptr;
                    },
                    argPackAdvance: 8,
                    readValueFromPointer: simpleReadValueFromPointer,
                    destructorFunction: rawDestructor
                }
            ];
        });
    }
    var structRegistrations = {};
    function __embind_finalize_value_object(structType) {
        var reg = structRegistrations[structType];
        delete structRegistrations[structType];
        var rawConstructor = reg.rawConstructor;
        var rawDestructor = reg.rawDestructor;
        var fieldRecords = reg.fields;
        var fieldTypes = fieldRecords
            .map(function(field) {
                return field.getterReturnType;
            })
            .concat(
                fieldRecords.map(function(field) {
                    return field.setterArgumentType;
                })
            );
        whenDependentTypesAreResolved([structType], fieldTypes, function(fieldTypes) {
            var fields = {};
            fieldRecords.forEach(function(field, i) {
                var fieldName = field.fieldName;
                var getterReturnType = fieldTypes[i];
                var getter = field.getter;
                var getterContext = field.getterContext;
                var setterArgumentType = fieldTypes[i + fieldRecords.length];
                var setter = field.setter;
                var setterContext = field.setterContext;
                fields[fieldName] = {
                    read: function(ptr) {
                        return getterReturnType["fromWireType"](getter(getterContext, ptr));
                    },
                    write: function(ptr, o) {
                        var destructors = [];
                        setter(setterContext, ptr, setterArgumentType["toWireType"](destructors, o));
                        runDestructors(destructors);
                    }
                };
            });
            return [
                {
                    name: reg.name,
                    fromWireType: function(ptr) {
                        var rv = {};
                        for (var i in fields) {
                            rv[i] = fields[i].read(ptr);
                        }
                        rawDestructor(ptr);
                        return rv;
                    },
                    toWireType: function(destructors, o) {
                        for (var fieldName in fields) {
                            if (!(fieldName in o)) {
                                throw new TypeError("Missing field");
                            }
                        }
                        var ptr = rawConstructor();
                        for (fieldName in fields) {
                            fields[fieldName].write(ptr, o[fieldName]);
                        }
                        if (destructors !== null) {
                            destructors.push(rawDestructor, ptr);
                        }
                        return ptr;
                    },
                    argPackAdvance: 8,
                    readValueFromPointer: simpleReadValueFromPointer,
                    destructorFunction: rawDestructor
                }
            ];
        });
    }
    function getShiftFromSize(size) {
        switch (size) {
            case 1:
                return 0;
            case 2:
                return 1;
            case 4:
                return 2;
            case 8:
                return 3;
            default:
                throw new TypeError("Unknown type size: " + size);
        }
    }
    function embind_init_charCodes() {
        var codes = new Array(256);
        for (var i = 0; i < 256; ++i) {
            codes[i] = String.fromCharCode(i);
        }
        embind_charCodes = codes;
    }
    var embind_charCodes = undefined;
    function readLatin1String(ptr) {
        var ret = "";
        var c = ptr;
        while (HEAPU8[c]) {
            ret += embind_charCodes[HEAPU8[c++]];
        }
        return ret;
    }
    var BindingError = undefined;
    function throwBindingError(message) {
        throw new BindingError(message);
    }
    function registerType(rawType, registeredInstance, options) {
        options = options || {};
        if (!("argPackAdvance" in registeredInstance)) {
            throw new TypeError("registerType registeredInstance requires argPackAdvance");
        }
        var name = registeredInstance.name;
        if (!rawType) {
            throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
        }
        if (registeredTypes.hasOwnProperty(rawType)) {
            if (options.ignoreDuplicateRegistrations) {
                return;
            } else {
                throwBindingError("Cannot register type '" + name + "' twice");
            }
        }
        registeredTypes[rawType] = registeredInstance;
        delete typeDependencies[rawType];
        if (awaitingDependencies.hasOwnProperty(rawType)) {
            var callbacks = awaitingDependencies[rawType];
            delete awaitingDependencies[rawType];
            callbacks.forEach(function(cb) {
                cb();
            });
        }
    }
    function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
        var shift = getShiftFromSize(size);
        name = readLatin1String(name);
        registerType(rawType, {
            name: name,
            fromWireType: function(wt) {
                return !!wt;
            },
            toWireType: function(destructors, o) {
                return o ? trueValue : falseValue;
            },
            argPackAdvance: 8,
            readValueFromPointer: function(pointer) {
                var heap;
                if (size === 1) {
                    heap = HEAP8;
                } else if (size === 2) {
                    heap = HEAP16;
                } else if (size === 4) {
                    heap = HEAP32;
                } else {
                    throw new TypeError("Unknown boolean type size: " + name);
                }
                return this["fromWireType"](heap[pointer >> shift]);
            },
            destructorFunction: null
        });
    }
    function ClassHandle_isAliasOf(other) {
        if (!(this instanceof ClassHandle)) {
            return false;
        }
        if (!(other instanceof ClassHandle)) {
            return false;
        }
        var leftClass = this.$$.ptrType.registeredClass;
        var left = this.$$.ptr;
        var rightClass = other.$$.ptrType.registeredClass;
        var right = other.$$.ptr;
        while (leftClass.baseClass) {
            left = leftClass.upcast(left);
            leftClass = leftClass.baseClass;
        }
        while (rightClass.baseClass) {
            right = rightClass.upcast(right);
            rightClass = rightClass.baseClass;
        }
        return leftClass === rightClass && left === right;
    }
    function shallowCopyInternalPointer(o) {
        return {
            count: o.count,
            deleteScheduled: o.deleteScheduled,
            preservePointerOnDelete: o.preservePointerOnDelete,
            ptr: o.ptr,
            ptrType: o.ptrType,
            smartPtr: o.smartPtr,
            smartPtrType: o.smartPtrType
        };
    }
    function throwInstanceAlreadyDeleted(obj) {
        function getInstanceTypeName(handle) {
            return handle.$$.ptrType.registeredClass.name;
        }
        throwBindingError(getInstanceTypeName(obj) + " instance already deleted");
    }
    function ClassHandle_clone() {
        if (!this.$$.ptr) {
            throwInstanceAlreadyDeleted(this);
        }
        if (this.$$.preservePointerOnDelete) {
            this.$$.count.value += 1;
            return this;
        } else {
            var clone = Object.create(Object.getPrototypeOf(this), {
                $$: { value: shallowCopyInternalPointer(this.$$) }
            });
            clone.$$.count.value += 1;
            clone.$$.deleteScheduled = false;
            return clone;
        }
    }
    function runDestructor(handle) {
        var $$ = handle.$$;
        if ($$.smartPtr) {
            $$.smartPtrType.rawDestructor($$.smartPtr);
        } else {
            $$.ptrType.registeredClass.rawDestructor($$.ptr);
        }
    }
    function ClassHandle_delete() {
        if (!this.$$.ptr) {
            throwInstanceAlreadyDeleted(this);
        }
        if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
            throwBindingError("Object already scheduled for deletion");
        }
        this.$$.count.value -= 1;
        var toDelete = 0 === this.$$.count.value;
        if (toDelete) {
            runDestructor(this);
        }
        if (!this.$$.preservePointerOnDelete) {
            this.$$.smartPtr = undefined;
            this.$$.ptr = undefined;
        }
    }
    function ClassHandle_isDeleted() {
        return !this.$$.ptr;
    }
    var delayFunction = undefined;
    var deletionQueue = [];
    function flushPendingDeletes() {
        while (deletionQueue.length) {
            var obj = deletionQueue.pop();
            obj.$$.deleteScheduled = false;
            obj["delete"]();
        }
    }
    function ClassHandle_deleteLater() {
        if (!this.$$.ptr) {
            throwInstanceAlreadyDeleted(this);
        }
        if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
            throwBindingError("Object already scheduled for deletion");
        }
        deletionQueue.push(this);
        if (deletionQueue.length === 1 && delayFunction) {
            delayFunction(flushPendingDeletes);
        }
        this.$$.deleteScheduled = true;
        return this;
    }
    function init_ClassHandle() {
        ClassHandle.prototype["isAliasOf"] = ClassHandle_isAliasOf;
        ClassHandle.prototype["clone"] = ClassHandle_clone;
        ClassHandle.prototype["delete"] = ClassHandle_delete;
        ClassHandle.prototype["isDeleted"] = ClassHandle_isDeleted;
        ClassHandle.prototype["deleteLater"] = ClassHandle_deleteLater;
    }
    function ClassHandle() {}
    var registeredPointers = {};
    function ensureOverloadTable(proto, methodName, humanName) {
        if (undefined === proto[methodName].overloadTable) {
            var prevFunc = proto[methodName];
            proto[methodName] = function() {
                if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
                    throwBindingError(
                        "Function '" +
                            humanName +
                            "' called with an invalid number of arguments (" +
                            arguments.length +
                            ") - expects one of (" +
                            proto[methodName].overloadTable +
                            ")!"
                    );
                }
                return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
            };
            proto[methodName].overloadTable = [];
            proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
        }
    }
    function exposePublicSymbol(name, value, numArguments) {
        if (Module.hasOwnProperty(name)) {
            if (
                undefined === numArguments ||
                (undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments])
            ) {
                throwBindingError("Cannot register public name '" + name + "' twice");
            }
            ensureOverloadTable(Module, name, name);
            if (Module.hasOwnProperty(numArguments)) {
                throwBindingError(
                    "Cannot register multiple overloads of a function with the same number of arguments (" +
                        numArguments +
                        ")!"
                );
            }
            Module[name].overloadTable[numArguments] = value;
        } else {
            Module[name] = value;
            if (undefined !== numArguments) {
                Module[name].numArguments = numArguments;
            }
        }
    }
    function RegisteredClass(
        name,
        constructor,
        instancePrototype,
        rawDestructor,
        baseClass,
        getActualType,
        upcast,
        downcast
    ) {
        this.name = name;
        this.constructor = constructor;
        this.instancePrototype = instancePrototype;
        this.rawDestructor = rawDestructor;
        this.baseClass = baseClass;
        this.getActualType = getActualType;
        this.upcast = upcast;
        this.downcast = downcast;
        this.pureVirtualFunctions = [];
    }
    function upcastPointer(ptr, ptrClass, desiredClass) {
        while (ptrClass !== desiredClass) {
            if (!ptrClass.upcast) {
                throwBindingError(
                    "Expected null or instance of " + desiredClass.name + ", got an instance of " + ptrClass.name
                );
            }
            ptr = ptrClass.upcast(ptr);
            ptrClass = ptrClass.baseClass;
        }
        return ptr;
    }
    function constNoSmartPtrRawPointerToWireType(destructors, handle) {
        if (handle === null) {
            if (this.isReference) {
                throwBindingError("null is not a valid " + this.name);
            }
            return 0;
        }
        if (!handle.$$) {
            throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
        }
        if (!handle.$$.ptr) {
            throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
        }
        var handleClass = handle.$$.ptrType.registeredClass;
        var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
        return ptr;
    }
    function genericPointerToWireType(destructors, handle) {
        var ptr;
        if (handle === null) {
            if (this.isReference) {
                throwBindingError("null is not a valid " + this.name);
            }
            if (this.isSmartPointer) {
                ptr = this.rawConstructor();
                if (destructors !== null) {
                    destructors.push(this.rawDestructor, ptr);
                }
                return ptr;
            } else {
                return 0;
            }
        }
        if (!handle.$$) {
            throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
        }
        if (!handle.$$.ptr) {
            throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
        }
        if (!this.isConst && handle.$$.ptrType.isConst) {
            throwBindingError(
                "Cannot convert argument of type " +
                    (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) +
                    " to parameter type " +
                    this.name
            );
        }
        var handleClass = handle.$$.ptrType.registeredClass;
        ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
        if (this.isSmartPointer) {
            if (undefined === handle.$$.smartPtr) {
                throwBindingError("Passing raw pointer to smart pointer is illegal");
            }
            switch (this.sharingPolicy) {
                case 0:
                    if (handle.$$.smartPtrType === this) {
                        ptr = handle.$$.smartPtr;
                    } else {
                        throwBindingError(
                            "Cannot convert argument of type " +
                                (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) +
                                " to parameter type " +
                                this.name
                        );
                    }
                    break;
                case 1:
                    ptr = handle.$$.smartPtr;
                    break;
                case 2:
                    if (handle.$$.smartPtrType === this) {
                        ptr = handle.$$.smartPtr;
                    } else {
                        var clonedHandle = handle["clone"]();
                        ptr = this.rawShare(
                            ptr,
                            __emval_register(function() {
                                clonedHandle["delete"]();
                            })
                        );
                        if (destructors !== null) {
                            destructors.push(this.rawDestructor, ptr);
                        }
                    }
                    break;
                default:
                    throwBindingError("Unsupporting sharing policy");
            }
        }
        return ptr;
    }
    function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
        if (handle === null) {
            if (this.isReference) {
                throwBindingError("null is not a valid " + this.name);
            }
            return 0;
        }
        if (!handle.$$) {
            throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
        }
        if (!handle.$$.ptr) {
            throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
        }
        if (handle.$$.ptrType.isConst) {
            throwBindingError(
                "Cannot convert argument of type " + handle.$$.ptrType.name + " to parameter type " + this.name
            );
        }
        var handleClass = handle.$$.ptrType.registeredClass;
        var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
        return ptr;
    }
    function RegisteredPointer_getPointee(ptr) {
        if (this.rawGetPointee) {
            ptr = this.rawGetPointee(ptr);
        }
        return ptr;
    }
    function RegisteredPointer_destructor(ptr) {
        if (this.rawDestructor) {
            this.rawDestructor(ptr);
        }
    }
    function RegisteredPointer_deleteObject(handle) {
        if (handle !== null) {
            handle["delete"]();
        }
    }
    function downcastPointer(ptr, ptrClass, desiredClass) {
        if (ptrClass === desiredClass) {
            return ptr;
        }
        if (undefined === desiredClass.baseClass) {
            return null;
        }
        var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
        if (rv === null) {
            return null;
        }
        return desiredClass.downcast(rv);
    }
    function getInheritedInstanceCount() {
        return Object.keys(registeredInstances).length;
    }
    function getLiveInheritedInstances() {
        var rv = [];
        for (var k in registeredInstances) {
            if (registeredInstances.hasOwnProperty(k)) {
                rv.push(registeredInstances[k]);
            }
        }
        return rv;
    }
    function setDelayFunction(fn) {
        delayFunction = fn;
        if (deletionQueue.length && delayFunction) {
            delayFunction(flushPendingDeletes);
        }
    }
    function init_embind() {
        Module["getInheritedInstanceCount"] = getInheritedInstanceCount;
        Module["getLiveInheritedInstances"] = getLiveInheritedInstances;
        Module["flushPendingDeletes"] = flushPendingDeletes;
        Module["setDelayFunction"] = setDelayFunction;
    }
    var registeredInstances = {};
    function getBasestPointer(class_, ptr) {
        if (ptr === undefined) {
            throwBindingError("ptr should not be undefined");
        }
        while (class_.baseClass) {
            ptr = class_.upcast(ptr);
            class_ = class_.baseClass;
        }
        return ptr;
    }
    function getInheritedInstance(class_, ptr) {
        ptr = getBasestPointer(class_, ptr);
        return registeredInstances[ptr];
    }
    function makeClassHandle(prototype, record) {
        if (!record.ptrType || !record.ptr) {
            throwInternalError("makeClassHandle requires ptr and ptrType");
        }
        var hasSmartPtrType = !!record.smartPtrType;
        var hasSmartPtr = !!record.smartPtr;
        if (hasSmartPtrType !== hasSmartPtr) {
            throwInternalError("Both smartPtrType and smartPtr must be specified");
        }
        record.count = { value: 1 };
        return Object.create(prototype, { $$: { value: record } });
    }
    function RegisteredPointer_fromWireType(ptr) {
        var rawPointer = this.getPointee(ptr);
        if (!rawPointer) {
            this.destructor(ptr);
            return null;
        }
        var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
        if (undefined !== registeredInstance) {
            if (0 === registeredInstance.$$.count.value) {
                registeredInstance.$$.ptr = rawPointer;
                registeredInstance.$$.smartPtr = ptr;
                return registeredInstance["clone"]();
            } else {
                var rv = registeredInstance["clone"]();
                this.destructor(ptr);
                return rv;
            }
        }
        function makeDefaultHandle() {
            if (this.isSmartPointer) {
                return makeClassHandle(this.registeredClass.instancePrototype, {
                    ptrType: this.pointeeType,
                    ptr: rawPointer,
                    smartPtrType: this,
                    smartPtr: ptr
                });
            } else {
                return makeClassHandle(this.registeredClass.instancePrototype, { ptrType: this, ptr: ptr });
            }
        }
        var actualType = this.registeredClass.getActualType(rawPointer);
        var registeredPointerRecord = registeredPointers[actualType];
        if (!registeredPointerRecord) {
            return makeDefaultHandle.call(this);
        }
        var toType;
        if (this.isConst) {
            toType = registeredPointerRecord.constPointerType;
        } else {
            toType = registeredPointerRecord.pointerType;
        }
        var dp = downcastPointer(rawPointer, this.registeredClass, toType.registeredClass);
        if (dp === null) {
            return makeDefaultHandle.call(this);
        }
        if (this.isSmartPointer) {
            return makeClassHandle(toType.registeredClass.instancePrototype, {
                ptrType: toType,
                ptr: dp,
                smartPtrType: this,
                smartPtr: ptr
            });
        } else {
            return makeClassHandle(toType.registeredClass.instancePrototype, { ptrType: toType, ptr: dp });
        }
    }
    function init_RegisteredPointer() {
        RegisteredPointer.prototype.getPointee = RegisteredPointer_getPointee;
        RegisteredPointer.prototype.destructor = RegisteredPointer_destructor;
        RegisteredPointer.prototype["argPackAdvance"] = 8;
        RegisteredPointer.prototype["readValueFromPointer"] = simpleReadValueFromPointer;
        RegisteredPointer.prototype["deleteObject"] = RegisteredPointer_deleteObject;
        RegisteredPointer.prototype["fromWireType"] = RegisteredPointer_fromWireType;
    }
    function RegisteredPointer(
        name,
        registeredClass,
        isReference,
        isConst,
        isSmartPointer,
        pointeeType,
        sharingPolicy,
        rawGetPointee,
        rawConstructor,
        rawShare,
        rawDestructor
    ) {
        this.name = name;
        this.registeredClass = registeredClass;
        this.isReference = isReference;
        this.isConst = isConst;
        this.isSmartPointer = isSmartPointer;
        this.pointeeType = pointeeType;
        this.sharingPolicy = sharingPolicy;
        this.rawGetPointee = rawGetPointee;
        this.rawConstructor = rawConstructor;
        this.rawShare = rawShare;
        this.rawDestructor = rawDestructor;
        if (!isSmartPointer && registeredClass.baseClass === undefined) {
            if (isConst) {
                this["toWireType"] = constNoSmartPtrRawPointerToWireType;
                this.destructorFunction = null;
            } else {
                this["toWireType"] = nonConstNoSmartPtrRawPointerToWireType;
                this.destructorFunction = null;
            }
        } else {
            this["toWireType"] = genericPointerToWireType;
        }
    }
    function replacePublicSymbol(name, value, numArguments) {
        if (!Module.hasOwnProperty(name)) {
            throwInternalError("Replacing nonexistant public symbol");
        }
        if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
            Module[name].overloadTable[numArguments] = value;
        } else {
            Module[name] = value;
            Module[name].argCount = numArguments;
        }
    }
    function embind__requireFunction(signature, rawFunction) {
        signature = readLatin1String(signature);
        function makeDynCaller(dynCall) {
            var args = [];
            for (var i = 1; i < signature.length; ++i) {
                args.push("a" + i);
            }
            var name = "dynCall_" + signature + "_" + rawFunction;
            var body = "return function " + name + "(" + args.join(", ") + ") {\n";
            body += "    return dynCall(rawFunction" + (args.length ? ", " : "") + args.join(", ") + ");\n";
            body += "};\n";
            return new Function("dynCall", "rawFunction", body)(dynCall, rawFunction);
        }
        var fp;
        if (Module["FUNCTION_TABLE_" + signature] !== undefined) {
            fp = Module["FUNCTION_TABLE_" + signature][rawFunction];
        } else if (typeof FUNCTION_TABLE !== "undefined") {
            fp = FUNCTION_TABLE[rawFunction];
        } else {
            var dc = Module["dynCall_" + signature];
            if (dc === undefined) {
                dc = Module["dynCall_" + signature.replace(/f/g, "d")];
                if (dc === undefined) {
                    throwBindingError("No dynCall invoker for signature: " + signature);
                }
            }
            fp = makeDynCaller(dc);
        }
        if (typeof fp !== "function") {
            throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction);
        }
        return fp;
    }
    var UnboundTypeError = undefined;
    function getTypeName(type) {
        var ptr = ___getTypeName(type);
        var rv = readLatin1String(ptr);
        _free(ptr);
        return rv;
    }
    function throwUnboundTypeError(message, types) {
        var unboundTypes = [];
        var seen = {};
        function visit(type) {
            if (seen[type]) {
                return;
            }
            if (registeredTypes[type]) {
                return;
            }
            if (typeDependencies[type]) {
                typeDependencies[type].forEach(visit);
                return;
            }
            unboundTypes.push(type);
            seen[type] = true;
        }
        types.forEach(visit);
        throw new UnboundTypeError(message + ": " + unboundTypes.map(getTypeName).join([", "]));
    }
    function __embind_register_class(
        rawType,
        rawPointerType,
        rawConstPointerType,
        baseClassRawType,
        getActualTypeSignature,
        getActualType,
        upcastSignature,
        upcast,
        downcastSignature,
        downcast,
        name,
        destructorSignature,
        rawDestructor
    ) {
        name = readLatin1String(name);
        getActualType = embind__requireFunction(getActualTypeSignature, getActualType);
        if (upcast) {
            upcast = embind__requireFunction(upcastSignature, upcast);
        }
        if (downcast) {
            downcast = embind__requireFunction(downcastSignature, downcast);
        }
        rawDestructor = embind__requireFunction(destructorSignature, rawDestructor);
        var legalFunctionName = makeLegalFunctionName(name);
        exposePublicSymbol(legalFunctionName, function() {
            throwUnboundTypeError("Cannot construct " + name + " due to unbound types", [baseClassRawType]);
        });
        whenDependentTypesAreResolved(
            [rawType, rawPointerType, rawConstPointerType],
            baseClassRawType ? [baseClassRawType] : [],
            function(base) {
                base = base[0];
                var baseClass;
                var basePrototype;
                if (baseClassRawType) {
                    baseClass = base.registeredClass;
                    basePrototype = baseClass.instancePrototype;
                } else {
                    basePrototype = ClassHandle.prototype;
                }
                var constructor = createNamedFunction(legalFunctionName, function() {
                    if (Object.getPrototypeOf(this) !== instancePrototype) {
                        throw new BindingError("Use 'new' to construct " + name);
                    }
                    if (undefined === registeredClass.constructor_body) {
                        throw new BindingError(name + " has no accessible constructor");
                    }
                    var body = registeredClass.constructor_body[arguments.length];
                    if (undefined === body) {
                        throw new BindingError(
                            "Tried to invoke ctor of " +
                                name +
                                " with invalid number of parameters (" +
                                arguments.length +
                                ") - expected (" +
                                Object.keys(registeredClass.constructor_body).toString() +
                                ") parameters instead!"
                        );
                    }
                    return body.apply(this, arguments);
                });
                var instancePrototype = Object.create(basePrototype, { constructor: { value: constructor } });
                constructor.prototype = instancePrototype;
                var registeredClass = new RegisteredClass(
                    name,
                    constructor,
                    instancePrototype,
                    rawDestructor,
                    baseClass,
                    getActualType,
                    upcast,
                    downcast
                );
                var referenceConverter = new RegisteredPointer(name, registeredClass, true, false, false);
                var pointerConverter = new RegisteredPointer(name + "*", registeredClass, false, false, false);
                var constPointerConverter = new RegisteredPointer(
                    name + " const*",
                    registeredClass,
                    false,
                    true,
                    false
                );
                registeredPointers[rawType] = {
                    pointerType: pointerConverter,
                    constPointerType: constPointerConverter
                };
                replacePublicSymbol(legalFunctionName, constructor);
                return [referenceConverter, pointerConverter, constPointerConverter];
            }
        );
    }
    function new_(constructor, argumentList) {
        if (!(constructor instanceof Function)) {
            throw new TypeError("new_ called with constructor type " + typeof constructor + " which is not a function");
        }
        var dummy = createNamedFunction(constructor.name || "unknownFunctionName", function() {});
        dummy.prototype = constructor.prototype;
        var obj = new dummy();
        var r = constructor.apply(obj, argumentList);
        return r instanceof Object ? r : obj;
    }
    function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
        var argCount = argTypes.length;
        if (argCount < 2) {
            throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
        }
        var isClassMethodFunc = argTypes[1] !== null && classType !== null;
        var needsDestructorStack = false;
        for (var i = 1; i < argTypes.length; ++i) {
            if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) {
                needsDestructorStack = true;
                break;
            }
        }
        var returns = argTypes[0].name !== "void";
        var argsList = "";
        var argsListWired = "";
        for (var i = 0; i < argCount - 2; ++i) {
            argsList += (i !== 0 ? ", " : "") + "arg" + i;
            argsListWired += (i !== 0 ? ", " : "") + "arg" + i + "Wired";
        }
        var invokerFnBody =
            "return function " +
            makeLegalFunctionName(humanName) +
            "(" +
            argsList +
            ") {\n" +
            "if (arguments.length !== " +
            (argCount - 2) +
            ") {\n" +
            "throwBindingError('function " +
            humanName +
            " called with ' + arguments.length + ' arguments, expected " +
            (argCount - 2) +
            " args!');\n" +
            "}\n";
        if (needsDestructorStack) {
            invokerFnBody += "var destructors = [];\n";
        }
        var dtorStack = needsDestructorStack ? "destructors" : "null";
        var args1 = ["throwBindingError", "invoker", "fn", "runDestructors", "retType", "classParam"];
        var args2 = [throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1]];
        if (isClassMethodFunc) {
            invokerFnBody += "var thisWired = classParam.toWireType(" + dtorStack + ", this);\n";
        }
        for (var i = 0; i < argCount - 2; ++i) {
            invokerFnBody +=
                "var arg" +
                i +
                "Wired = argType" +
                i +
                ".toWireType(" +
                dtorStack +
                ", arg" +
                i +
                "); // " +
                argTypes[i + 2].name +
                "\n";
            args1.push("argType" + i);
            args2.push(argTypes[i + 2]);
        }
        if (isClassMethodFunc) {
            argsListWired = "thisWired" + (argsListWired.length > 0 ? ", " : "") + argsListWired;
        }
        invokerFnBody +=
            (returns ? "var rv = " : "") +
            "invoker(fn" +
            (argsListWired.length > 0 ? ", " : "") +
            argsListWired +
            ");\n";
        if (needsDestructorStack) {
            invokerFnBody += "runDestructors(destructors);\n";
        } else {
            for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
                var paramName = i === 1 ? "thisWired" : "arg" + (i - 2) + "Wired";
                if (argTypes[i].destructorFunction !== null) {
                    invokerFnBody += paramName + "_dtor(" + paramName + "); // " + argTypes[i].name + "\n";
                    args1.push(paramName + "_dtor");
                    args2.push(argTypes[i].destructorFunction);
                }
            }
        }
        if (returns) {
            invokerFnBody += "var ret = retType.fromWireType(rv);\n" + "return ret;\n";
        } else {
        }
        invokerFnBody += "}\n";
        args1.push(invokerFnBody);
        var invokerFunction = new_(Function, args1).apply(null, args2);
        return invokerFunction;
    }
    function heap32VectorToArray(count, firstElement) {
        var array = [];
        for (var i = 0; i < count; i++) {
            array.push(HEAP32[(firstElement >> 2) + i]);
        }
        return array;
    }
    function __embind_register_class_class_function(
        rawClassType,
        methodName,
        argCount,
        rawArgTypesAddr,
        invokerSignature,
        rawInvoker,
        fn
    ) {
        var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
        methodName = readLatin1String(methodName);
        rawInvoker = embind__requireFunction(invokerSignature, rawInvoker);
        whenDependentTypesAreResolved([], [rawClassType], function(classType) {
            classType = classType[0];
            var humanName = classType.name + "." + methodName;
            function unboundTypesHandler() {
                throwUnboundTypeError("Cannot call " + humanName + " due to unbound types", rawArgTypes);
            }
            var proto = classType.registeredClass.constructor;
            if (undefined === proto[methodName]) {
                unboundTypesHandler.argCount = argCount - 1;
                proto[methodName] = unboundTypesHandler;
            } else {
                ensureOverloadTable(proto, methodName, humanName);
                proto[methodName].overloadTable[argCount - 1] = unboundTypesHandler;
            }
            whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
                var invokerArgsArray = [argTypes[0], null].concat(argTypes.slice(1));
                var func = craftInvokerFunction(humanName, invokerArgsArray, null, rawInvoker, fn);
                if (undefined === proto[methodName].overloadTable) {
                    func.argCount = argCount - 1;
                    proto[methodName] = func;
                } else {
                    proto[methodName].overloadTable[argCount - 1] = func;
                }
                return [];
            });
            return [];
        });
    }
    function __embind_register_class_constructor(
        rawClassType,
        argCount,
        rawArgTypesAddr,
        invokerSignature,
        invoker,
        rawConstructor
    ) {
        var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
        invoker = embind__requireFunction(invokerSignature, invoker);
        whenDependentTypesAreResolved([], [rawClassType], function(classType) {
            classType = classType[0];
            var humanName = "constructor " + classType.name;
            if (undefined === classType.registeredClass.constructor_body) {
                classType.registeredClass.constructor_body = [];
            }
            if (undefined !== classType.registeredClass.constructor_body[argCount - 1]) {
                throw new BindingError(
                    "Cannot register multiple constructors with identical number of parameters (" +
                        (argCount - 1) +
                        ") for class '" +
                        classType.name +
                        "'! Overload resolution is currently only performed using the parameter count, not actual type info!"
                );
            }
            classType.registeredClass.constructor_body[argCount - 1] = function unboundTypeHandler() {
                throwUnboundTypeError("Cannot construct " + classType.name + " due to unbound types", rawArgTypes);
            };
            whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
                classType.registeredClass.constructor_body[argCount - 1] = function constructor_body() {
                    if (arguments.length !== argCount - 1) {
                        throwBindingError(
                            humanName + " called with " + arguments.length + " arguments, expected " + (argCount - 1)
                        );
                    }
                    var destructors = [];
                    var args = new Array(argCount);
                    args[0] = rawConstructor;
                    for (var i = 1; i < argCount; ++i) {
                        args[i] = argTypes[i]["toWireType"](destructors, arguments[i - 1]);
                    }
                    var ptr = invoker.apply(null, args);
                    runDestructors(destructors);
                    return argTypes[0]["fromWireType"](ptr);
                };
                return [];
            });
            return [];
        });
    }
    function __embind_register_class_function(
        rawClassType,
        methodName,
        argCount,
        rawArgTypesAddr,
        invokerSignature,
        rawInvoker,
        context,
        isPureVirtual
    ) {
        var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
        methodName = readLatin1String(methodName);
        rawInvoker = embind__requireFunction(invokerSignature, rawInvoker);
        whenDependentTypesAreResolved([], [rawClassType], function(classType) {
            classType = classType[0];
            var humanName = classType.name + "." + methodName;
            if (isPureVirtual) {
                classType.registeredClass.pureVirtualFunctions.push(methodName);
            }
            function unboundTypesHandler() {
                throwUnboundTypeError("Cannot call " + humanName + " due to unbound types", rawArgTypes);
            }
            var proto = classType.registeredClass.instancePrototype;
            var method = proto[methodName];
            if (
                undefined === method ||
                (undefined === method.overloadTable &&
                    method.className !== classType.name &&
                    method.argCount === argCount - 2)
            ) {
                unboundTypesHandler.argCount = argCount - 2;
                unboundTypesHandler.className = classType.name;
                proto[methodName] = unboundTypesHandler;
            } else {
                ensureOverloadTable(proto, methodName, humanName);
                proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler;
            }
            whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
                var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context);
                if (undefined === proto[methodName].overloadTable) {
                    memberFunction.argCount = argCount - 2;
                    proto[methodName] = memberFunction;
                } else {
                    proto[methodName].overloadTable[argCount - 2] = memberFunction;
                }
                return [];
            });
            return [];
        });
    }
    function validateThis(this_, classType, humanName) {
        if (!(this_ instanceof Object)) {
            throwBindingError(humanName + ' with invalid "this": ' + this_);
        }
        if (!(this_ instanceof classType.registeredClass.constructor)) {
            throwBindingError(humanName + ' incompatible with "this" of type ' + this_.constructor.name);
        }
        if (!this_.$$.ptr) {
            throwBindingError("cannot call emscripten binding method " + humanName + " on deleted object");
        }
        return upcastPointer(this_.$$.ptr, this_.$$.ptrType.registeredClass, classType.registeredClass);
    }
    function __embind_register_class_property(
        classType,
        fieldName,
        getterReturnType,
        getterSignature,
        getter,
        getterContext,
        setterArgumentType,
        setterSignature,
        setter,
        setterContext
    ) {
        fieldName = readLatin1String(fieldName);
        getter = embind__requireFunction(getterSignature, getter);
        whenDependentTypesAreResolved([], [classType], function(classType) {
            classType = classType[0];
            var humanName = classType.name + "." + fieldName;
            var desc = {
                get: function() {
                    throwUnboundTypeError("Cannot access " + humanName + " due to unbound types", [
                        getterReturnType,
                        setterArgumentType
                    ]);
                },
                enumerable: true,
                configurable: true
            };
            if (setter) {
                desc.set = function() {
                    throwUnboundTypeError("Cannot access " + humanName + " due to unbound types", [
                        getterReturnType,
                        setterArgumentType
                    ]);
                };
            } else {
                desc.set = function(v) {
                    throwBindingError(humanName + " is a read-only property");
                };
            }
            Object.defineProperty(classType.registeredClass.instancePrototype, fieldName, desc);
            whenDependentTypesAreResolved(
                [],
                setter ? [getterReturnType, setterArgumentType] : [getterReturnType],
                function(types) {
                    var getterReturnType = types[0];
                    var desc = {
                        get: function() {
                            var ptr = validateThis(this, classType, humanName + " getter");
                            return getterReturnType["fromWireType"](getter(getterContext, ptr));
                        },
                        enumerable: true
                    };
                    if (setter) {
                        setter = embind__requireFunction(setterSignature, setter);
                        var setterArgumentType = types[1];
                        desc.set = function(v) {
                            var ptr = validateThis(this, classType, humanName + " setter");
                            var destructors = [];
                            setter(setterContext, ptr, setterArgumentType["toWireType"](destructors, v));
                            runDestructors(destructors);
                        };
                    }
                    Object.defineProperty(classType.registeredClass.instancePrototype, fieldName, desc);
                    return [];
                }
            );
            return [];
        });
    }
    var emval_free_list = [];
    var emval_handle_array = [{}, { value: undefined }, { value: null }, { value: true }, { value: false }];
    function __emval_decref(handle) {
        if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
            emval_handle_array[handle] = undefined;
            emval_free_list.push(handle);
        }
    }
    function count_emval_handles() {
        var count = 0;
        for (var i = 5; i < emval_handle_array.length; ++i) {
            if (emval_handle_array[i] !== undefined) {
                ++count;
            }
        }
        return count;
    }
    function get_first_emval() {
        for (var i = 5; i < emval_handle_array.length; ++i) {
            if (emval_handle_array[i] !== undefined) {
                return emval_handle_array[i];
            }
        }
        return null;
    }
    function init_emval() {
        Module["count_emval_handles"] = count_emval_handles;
        Module["get_first_emval"] = get_first_emval;
    }
    function __emval_register(value) {
        switch (value) {
            case undefined: {
                return 1;
            }
            case null: {
                return 2;
            }
            case true: {
                return 3;
            }
            case false: {
                return 4;
            }
            default: {
                var handle = emval_free_list.length ? emval_free_list.pop() : emval_handle_array.length;
                emval_handle_array[handle] = { refcount: 1, value: value };
                return handle;
            }
        }
    }
    function __embind_register_emval(rawType, name) {
        name = readLatin1String(name);
        registerType(rawType, {
            name: name,
            fromWireType: function(handle) {
                var rv = emval_handle_array[handle].value;
                __emval_decref(handle);
                return rv;
            },
            toWireType: function(destructors, value) {
                return __emval_register(value);
            },
            argPackAdvance: 8,
            readValueFromPointer: simpleReadValueFromPointer,
            destructorFunction: null
        });
    }
    function enumReadValueFromPointer(name, shift, signed) {
        switch (shift) {
            case 0:
                return function(pointer) {
                    var heap = signed ? HEAP8 : HEAPU8;
                    return this["fromWireType"](heap[pointer]);
                };
            case 1:
                return function(pointer) {
                    var heap = signed ? HEAP16 : HEAPU16;
                    return this["fromWireType"](heap[pointer >> 1]);
                };
            case 2:
                return function(pointer) {
                    var heap = signed ? HEAP32 : HEAPU32;
                    return this["fromWireType"](heap[pointer >> 2]);
                };
            default:
                throw new TypeError("Unknown integer type: " + name);
        }
    }
    function __embind_register_enum(rawType, name, size, isSigned) {
        var shift = getShiftFromSize(size);
        name = readLatin1String(name);
        function ctor() {}
        ctor.values = {};
        registerType(rawType, {
            name: name,
            constructor: ctor,
            fromWireType: function(c) {
                return this.constructor.values[c];
            },
            toWireType: function(destructors, c) {
                return c.value;
            },
            argPackAdvance: 8,
            readValueFromPointer: enumReadValueFromPointer(name, shift, isSigned),
            destructorFunction: null
        });
        exposePublicSymbol(name, ctor);
    }
    function requireRegisteredType(rawType, humanName) {
        var impl = registeredTypes[rawType];
        if (undefined === impl) {
            throwBindingError(humanName + " has unknown type " + getTypeName(rawType));
        }
        return impl;
    }
    function __embind_register_enum_value(rawEnumType, name, enumValue) {
        var enumType = requireRegisteredType(rawEnumType, "enum");
        name = readLatin1String(name);
        var Enum = enumType.constructor;
        var Value = Object.create(enumType.constructor.prototype, {
            value: { value: enumValue },
            constructor: { value: createNamedFunction(enumType.name + "_" + name, function() {}) }
        });
        Enum.values[enumValue] = Value;
        Enum[name] = Value;
    }
    function _embind_repr(v) {
        if (v === null) {
            return "null";
        }
        var t = typeof v;
        if (t === "object" || t === "array" || t === "function") {
            return v.toString();
        } else {
            return "" + v;
        }
    }
    function floatReadValueFromPointer(name, shift) {
        switch (shift) {
            case 2:
                return function(pointer) {
                    return this["fromWireType"](HEAPF32[pointer >> 2]);
                };
            case 3:
                return function(pointer) {
                    return this["fromWireType"](HEAPF64[pointer >> 3]);
                };
            default:
                throw new TypeError("Unknown float type: " + name);
        }
    }
    function __embind_register_float(rawType, name, size) {
        var shift = getShiftFromSize(size);
        name = readLatin1String(name);
        registerType(rawType, {
            name: name,
            fromWireType: function(value) {
                return value;
            },
            toWireType: function(destructors, value) {
                if (typeof value !== "number" && typeof value !== "boolean") {
                    throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
                }
                return value;
            },
            argPackAdvance: 8,
            readValueFromPointer: floatReadValueFromPointer(name, shift),
            destructorFunction: null
        });
    }
    function __embind_register_function(name, argCount, rawArgTypesAddr, signature, rawInvoker, fn) {
        var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
        name = readLatin1String(name);
        rawInvoker = embind__requireFunction(signature, rawInvoker);
        exposePublicSymbol(
            name,
            function() {
                throwUnboundTypeError("Cannot call " + name + " due to unbound types", argTypes);
            },
            argCount - 1
        );
        whenDependentTypesAreResolved([], argTypes, function(argTypes) {
            var invokerArgsArray = [argTypes[0], null].concat(argTypes.slice(1));
            replacePublicSymbol(name, craftInvokerFunction(name, invokerArgsArray, null, rawInvoker, fn), argCount - 1);
            return [];
        });
    }
    function integerReadValueFromPointer(name, shift, signed) {
        switch (shift) {
            case 0:
                return signed
                    ? function readS8FromPointer(pointer) {
                          return HEAP8[pointer];
                      }
                    : function readU8FromPointer(pointer) {
                          return HEAPU8[pointer];
                      };
            case 1:
                return signed
                    ? function readS16FromPointer(pointer) {
                          return HEAP16[pointer >> 1];
                      }
                    : function readU16FromPointer(pointer) {
                          return HEAPU16[pointer >> 1];
                      };
            case 2:
                return signed
                    ? function readS32FromPointer(pointer) {
                          return HEAP32[pointer >> 2];
                      }
                    : function readU32FromPointer(pointer) {
                          return HEAPU32[pointer >> 2];
                      };
            default:
                throw new TypeError("Unknown integer type: " + name);
        }
    }
    function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
        name = readLatin1String(name);
        if (maxRange === -1) {
            maxRange = 4294967295;
        }
        var shift = getShiftFromSize(size);
        var fromWireType = function(value) {
            return value;
        };
        if (minRange === 0) {
            var bitshift = 32 - 8 * size;
            fromWireType = function(value) {
                return (value << bitshift) >>> bitshift;
            };
        }
        var isUnsignedType = name.indexOf("unsigned") != -1;
        registerType(primitiveType, {
            name: name,
            fromWireType: fromWireType,
            toWireType: function(destructors, value) {
                if (typeof value !== "number" && typeof value !== "boolean") {
                    throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
                }
                if (value < minRange || value > maxRange) {
                    throw new TypeError(
                        'Passing a number "' +
                            _embind_repr(value) +
                            '" from JS side to C/C++ side to an argument of type "' +
                            name +
                            '", which is outside the valid range [' +
                            minRange +
                            ", " +
                            maxRange +
                            "]!"
                    );
                }
                return isUnsignedType ? value >>> 0 : value | 0;
            },
            argPackAdvance: 8,
            readValueFromPointer: integerReadValueFromPointer(name, shift, minRange !== 0),
            destructorFunction: null
        });
    }
    function __embind_register_memory_view(rawType, dataTypeIndex, name) {
        var typeMapping = [
            Int8Array,
            Uint8Array,
            Int16Array,
            Uint16Array,
            Int32Array,
            Uint32Array,
            Float32Array,
            Float64Array
        ];
        var TA = typeMapping[dataTypeIndex];
        function decodeMemoryView(handle) {
            handle = handle >> 2;
            var heap = HEAPU32;
            var size = heap[handle];
            var data = heap[handle + 1];
            return new TA(heap["buffer"], data, size);
        }
        name = readLatin1String(name);
        registerType(
            rawType,
            { name: name, fromWireType: decodeMemoryView, argPackAdvance: 8, readValueFromPointer: decodeMemoryView },
            { ignoreDuplicateRegistrations: true }
        );
    }
    function __embind_register_std_string(rawType, name) {
        name = readLatin1String(name);
        var stdStringIsUTF8 = name === "std::string";
        registerType(rawType, {
            name: name,
            fromWireType: function(value) {
                var length = HEAPU32[value >> 2];
                var str;
                if (stdStringIsUTF8) {
                    var endChar = HEAPU8[value + 4 + length];
                    var endCharSwap = 0;
                    if (endChar != 0) {
                        endCharSwap = endChar;
                        HEAPU8[value + 4 + length] = 0;
                    }
                    var decodeStartPtr = value + 4;
                    for (var i = 0; i <= length; ++i) {
                        var currentBytePtr = value + 4 + i;
                        if (HEAPU8[currentBytePtr] == 0) {
                            var stringSegment = UTF8ToString(decodeStartPtr);
                            if (str === undefined) str = stringSegment;
                            else {
                                str += String.fromCharCode(0);
                                str += stringSegment;
                            }
                            decodeStartPtr = currentBytePtr + 1;
                        }
                    }
                    if (endCharSwap != 0) HEAPU8[value + 4 + length] = endCharSwap;
                } else {
                    var a = new Array(length);
                    for (var i = 0; i < length; ++i) {
                        a[i] = String.fromCharCode(HEAPU8[value + 4 + i]);
                    }
                    str = a.join("");
                }
                _free(value);
                return str;
            },
            toWireType: function(destructors, value) {
                if (value instanceof ArrayBuffer) {
                    value = new Uint8Array(value);
                }
                var getLength;
                var valueIsOfTypeString = typeof value === "string";
                if (
                    !(
                        valueIsOfTypeString ||
                        value instanceof Uint8Array ||
                        value instanceof Uint8ClampedArray ||
                        value instanceof Int8Array
                    )
                ) {
                    throwBindingError("Cannot pass non-string to std::string");
                }
                if (stdStringIsUTF8 && valueIsOfTypeString) {
                    getLength = function() {
                        return lengthBytesUTF8(value);
                    };
                } else {
                    getLength = function() {
                        return value.length;
                    };
                }
                var length = getLength();
                var ptr = _malloc(4 + length + 1);
                HEAPU32[ptr >> 2] = length;
                if (stdStringIsUTF8 && valueIsOfTypeString) {
                    stringToUTF8(value, ptr + 4, length + 1);
                } else {
                    if (valueIsOfTypeString) {
                        for (var i = 0; i < length; ++i) {
                            var charCode = value.charCodeAt(i);
                            if (charCode > 255) {
                                _free(ptr);
                                throwBindingError("String has UTF-16 code units that do not fit in 8 bits");
                            }
                            HEAPU8[ptr + 4 + i] = charCode;
                        }
                    } else {
                        for (var i = 0; i < length; ++i) {
                            HEAPU8[ptr + 4 + i] = value[i];
                        }
                    }
                }
                if (destructors !== null) {
                    destructors.push(_free, ptr);
                }
                return ptr;
            },
            argPackAdvance: 8,
            readValueFromPointer: simpleReadValueFromPointer,
            destructorFunction: function(ptr) {
                _free(ptr);
            }
        });
    }
    function __embind_register_std_wstring(rawType, charSize, name) {
        name = readLatin1String(name);
        var getHeap, shift;
        if (charSize === 2) {
            getHeap = function() {
                return HEAPU16;
            };
            shift = 1;
        } else if (charSize === 4) {
            getHeap = function() {
                return HEAPU32;
            };
            shift = 2;
        }
        registerType(rawType, {
            name: name,
            fromWireType: function(value) {
                var HEAP = getHeap();
                var length = HEAPU32[value >> 2];
                var a = new Array(length);
                var start = (value + 4) >> shift;
                for (var i = 0; i < length; ++i) {
                    a[i] = String.fromCharCode(HEAP[start + i]);
                }
                _free(value);
                return a.join("");
            },
            toWireType: function(destructors, value) {
                var HEAP = getHeap();
                var length = value.length;
                var ptr = _malloc(4 + length * charSize);
                HEAPU32[ptr >> 2] = length;
                var start = (ptr + 4) >> shift;
                for (var i = 0; i < length; ++i) {
                    HEAP[start + i] = value.charCodeAt(i);
                }
                if (destructors !== null) {
                    destructors.push(_free, ptr);
                }
                return ptr;
            },
            argPackAdvance: 8,
            readValueFromPointer: simpleReadValueFromPointer,
            destructorFunction: function(ptr) {
                _free(ptr);
            }
        });
    }
    function __embind_register_value_array(
        rawType,
        name,
        constructorSignature,
        rawConstructor,
        destructorSignature,
        rawDestructor
    ) {
        tupleRegistrations[rawType] = {
            name: readLatin1String(name),
            rawConstructor: embind__requireFunction(constructorSignature, rawConstructor),
            rawDestructor: embind__requireFunction(destructorSignature, rawDestructor),
            elements: []
        };
    }
    function __embind_register_value_array_element(
        rawTupleType,
        getterReturnType,
        getterSignature,
        getter,
        getterContext,
        setterArgumentType,
        setterSignature,
        setter,
        setterContext
    ) {
        tupleRegistrations[rawTupleType].elements.push({
            getterReturnType: getterReturnType,
            getter: embind__requireFunction(getterSignature, getter),
            getterContext: getterContext,
            setterArgumentType: setterArgumentType,
            setter: embind__requireFunction(setterSignature, setter),
            setterContext: setterContext
        });
    }
    function __embind_register_value_object(
        rawType,
        name,
        constructorSignature,
        rawConstructor,
        destructorSignature,
        rawDestructor
    ) {
        structRegistrations[rawType] = {
            name: readLatin1String(name),
            rawConstructor: embind__requireFunction(constructorSignature, rawConstructor),
            rawDestructor: embind__requireFunction(destructorSignature, rawDestructor),
            fields: []
        };
    }
    function __embind_register_value_object_field(
        structType,
        fieldName,
        getterReturnType,
        getterSignature,
        getter,
        getterContext,
        setterArgumentType,
        setterSignature,
        setter,
        setterContext
    ) {
        structRegistrations[structType].fields.push({
            fieldName: readLatin1String(fieldName),
            getterReturnType: getterReturnType,
            getter: embind__requireFunction(getterSignature, getter),
            getterContext: getterContext,
            setterArgumentType: setterArgumentType,
            setter: embind__requireFunction(setterSignature, setter),
            setterContext: setterContext
        });
    }
    function __embind_register_void(rawType, name) {
        name = readLatin1String(name);
        registerType(rawType, {
            isVoid: true,
            name: name,
            argPackAdvance: 0,
            fromWireType: function() {
                return undefined;
            },
            toWireType: function(destructors, o) {
                return undefined;
            }
        });
    }
    function requireHandle(handle) {
        if (!handle) {
            throwBindingError("Cannot use deleted val. handle = " + handle);
        }
        return emval_handle_array[handle].value;
    }
    function __emval_as(handle, returnType, destructorsRef) {
        handle = requireHandle(handle);
        returnType = requireRegisteredType(returnType, "emval::as");
        var destructors = [];
        var rd = __emval_register(destructors);
        HEAP32[destructorsRef >> 2] = rd;
        return returnType["toWireType"](destructors, handle);
    }
    function __emval_get_property(handle, key) {
        handle = requireHandle(handle);
        key = requireHandle(key);
        return __emval_register(handle[key]);
    }
    function __emval_incref(handle) {
        if (handle > 4) {
            emval_handle_array[handle].refcount += 1;
        }
    }
    var emval_symbols = {};
    function getStringOrSymbol(address) {
        var symbol = emval_symbols[address];
        if (symbol === undefined) {
            return readLatin1String(address);
        } else {
            return symbol;
        }
    }
    function __emval_new_cstring(v) {
        return __emval_register(getStringOrSymbol(v));
    }
    function __emval_run_destructors(handle) {
        var destructors = emval_handle_array[handle].value;
        runDestructors(destructors);
        __emval_decref(handle);
    }
    function __emval_take_value(type, argv) {
        type = requireRegisteredType(type, "_emval_take_value");
        var v = type["readValueFromPointer"](argv);
        return __emval_register(v);
    }
    function _abort() {
        Module["abort"]();
    }
    function _emscripten_get_now() {
        abort();
    }
    function _emscripten_get_now_is_monotonic() {
        return (
            0 ||
            ENVIRONMENT_IS_NODE ||
            typeof dateNow !== "undefined" ||
            ((ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && self["performance"] && self["performance"]["now"])
        );
    }
    function _clock_gettime(clk_id, tp) {
        var now;
        if (clk_id === 0) {
            now = Date.now();
        } else if (clk_id === 1 && _emscripten_get_now_is_monotonic()) {
            now = _emscripten_get_now();
        } else {
            ___setErrNo(22);
            return -1;
        }
        HEAP32[tp >> 2] = (now / 1e3) | 0;
        HEAP32[(tp + 4) >> 2] = ((now % 1e3) * 1e3 * 1e3) | 0;
        return 0;
    }
    function _emscripten_get_heap_size() {
        return TOTAL_MEMORY;
    }
    var GL = {
        counter: 1,
        lastError: 0,
        buffers: [],
        mappedBuffers: {},
        programs: [],
        framebuffers: [],
        renderbuffers: [],
        textures: [],
        uniforms: [],
        shaders: [],
        vaos: [],
        contexts: {},
        currentContext: null,
        offscreenCanvases: {},
        timerQueriesEXT: [],
        queries: [],
        samplers: [],
        transformFeedbacks: [],
        syncs: [],
        programInfos: {},
        stringCache: {},
        stringiCache: {},
        unpackAlignment: 4,
        init: function() {
            GL.miniTempBuffer = new Float32Array(GL.MINI_TEMP_BUFFER_SIZE);
            for (var i = 0; i < GL.MINI_TEMP_BUFFER_SIZE; i++) {
                GL.miniTempBufferViews[i] = GL.miniTempBuffer.subarray(0, i + 1);
            }
        },
        recordError: function recordError(errorCode) {
            if (!GL.lastError) {
                GL.lastError = errorCode;
            }
        },
        getNewId: function(table) {
            var ret = GL.counter++;
            for (var i = table.length; i < ret; i++) {
                table[i] = null;
            }
            return ret;
        },
        MINI_TEMP_BUFFER_SIZE: 256,
        miniTempBuffer: null,
        miniTempBufferViews: [0],
        getSource: function(shader, count, string, length) {
            var source = "";
            for (var i = 0; i < count; ++i) {
                var len = length ? HEAP32[(length + i * 4) >> 2] : -1;
                source += UTF8ToString(HEAP32[(string + i * 4) >> 2], len < 0 ? undefined : len);
            }
            return source;
        },
        createContext: function(canvas, webGLContextAttributes) {
            var ctx =
                webGLContextAttributes.majorVersion > 1
                    ? canvas.getContext("webgl2", webGLContextAttributes)
                    : canvas.getContext("webgl", webGLContextAttributes) ||
                      canvas.getContext("experimental-webgl", webGLContextAttributes);
            return ctx && GL.registerContext(ctx, webGLContextAttributes);
        },
        registerContext: function(ctx, webGLContextAttributes) {
            var handle = _malloc(8);
            var context = {
                handle: handle,
                attributes: webGLContextAttributes,
                version: webGLContextAttributes.majorVersion,
                GLctx: ctx
            };
            function getChromeVersion() {
                var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
                return raw ? parseInt(raw[2], 10) : false;
            }
            context.supportsWebGL2EntryPoints =
                context.version >= 2 && (getChromeVersion() === false || getChromeVersion() >= 58);
            if (ctx.canvas) ctx.canvas.GLctxObject = context;
            GL.contexts[handle] = context;
            if (
                typeof webGLContextAttributes.enableExtensionsByDefault === "undefined" ||
                webGLContextAttributes.enableExtensionsByDefault
            ) {
                GL.initExtensions(context);
            }
            return handle;
        },
        makeContextCurrent: function(contextHandle) {
            GL.currentContext = GL.contexts[contextHandle];
            Module.ctx = GLctx = GL.currentContext && GL.currentContext.GLctx;
            return !(contextHandle && !GLctx);
        },
        getContext: function(contextHandle) {
            return GL.contexts[contextHandle];
        },
        deleteContext: function(contextHandle) {
            if (GL.currentContext === GL.contexts[contextHandle]) GL.currentContext = null;
            if (typeof JSEvents === "object")
                JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
            if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas)
                GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
            _free(GL.contexts[contextHandle]);
            GL.contexts[contextHandle] = null;
        },
        initExtensions: function(context) {
            if (!context) context = GL.currentContext;
            if (context.initExtensionsDone) return;
            context.initExtensionsDone = true;
            var GLctx = context.GLctx;
            if (context.version < 2) {
                var instancedArraysExt = GLctx.getExtension("ANGLE_instanced_arrays");
                if (instancedArraysExt) {
                    GLctx["vertexAttribDivisor"] = function(index, divisor) {
                        instancedArraysExt["vertexAttribDivisorANGLE"](index, divisor);
                    };
                    GLctx["drawArraysInstanced"] = function(mode, first, count, primcount) {
                        instancedArraysExt["drawArraysInstancedANGLE"](mode, first, count, primcount);
                    };
                    GLctx["drawElementsInstanced"] = function(mode, count, type, indices, primcount) {
                        instancedArraysExt["drawElementsInstancedANGLE"](mode, count, type, indices, primcount);
                    };
                }
                var vaoExt = GLctx.getExtension("OES_vertex_array_object");
                if (vaoExt) {
                    GLctx["createVertexArray"] = function() {
                        return vaoExt["createVertexArrayOES"]();
                    };
                    GLctx["deleteVertexArray"] = function(vao) {
                        vaoExt["deleteVertexArrayOES"](vao);
                    };
                    GLctx["bindVertexArray"] = function(vao) {
                        vaoExt["bindVertexArrayOES"](vao);
                    };
                    GLctx["isVertexArray"] = function(vao) {
                        return vaoExt["isVertexArrayOES"](vao);
                    };
                }
                var drawBuffersExt = GLctx.getExtension("WEBGL_draw_buffers");
                if (drawBuffersExt) {
                    GLctx["drawBuffers"] = function(n, bufs) {
                        drawBuffersExt["drawBuffersWEBGL"](n, bufs);
                    };
                }
            }
            GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query");
            var automaticallyEnabledExtensions = [
                "OES_texture_float",
                "OES_texture_half_float",
                "OES_standard_derivatives",
                "OES_vertex_array_object",
                "WEBGL_compressed_texture_s3tc",
                "WEBGL_depth_texture",
                "OES_element_index_uint",
                "EXT_texture_filter_anisotropic",
                "EXT_frag_depth",
                "WEBGL_draw_buffers",
                "ANGLE_instanced_arrays",
                "OES_texture_float_linear",
                "OES_texture_half_float_linear",
                "EXT_blend_minmax",
                "EXT_shader_texture_lod",
                "WEBGL_compressed_texture_pvrtc",
                "EXT_color_buffer_half_float",
                "WEBGL_color_buffer_float",
                "EXT_sRGB",
                "WEBGL_compressed_texture_etc1",
                "EXT_disjoint_timer_query",
                "WEBGL_compressed_texture_etc",
                "WEBGL_compressed_texture_astc",
                "EXT_color_buffer_float",
                "WEBGL_compressed_texture_s3tc_srgb",
                "EXT_disjoint_timer_query_webgl2"
            ];
            var exts = GLctx.getSupportedExtensions();
            if (exts && exts.length > 0) {
                GLctx.getSupportedExtensions().forEach(function(ext) {
                    if (automaticallyEnabledExtensions.indexOf(ext) != -1) {
                        GLctx.getExtension(ext);
                    }
                });
            }
        },
        populateUniformTable: function(program) {
            var p = GL.programs[program];
            var ptable = (GL.programInfos[program] = {
                uniforms: {},
                maxUniformLength: 0,
                maxAttributeLength: -1,
                maxUniformBlockNameLength: -1
            });
            var utable = ptable.uniforms;
            var numUniforms = GLctx.getProgramParameter(p, 35718);
            for (var i = 0; i < numUniforms; ++i) {
                var u = GLctx.getActiveUniform(p, i);
                var name = u.name;
                ptable.maxUniformLength = Math.max(ptable.maxUniformLength, name.length + 1);
                if (name.slice(-1) == "]") {
                    name = name.slice(0, name.lastIndexOf("["));
                }
                var loc = GLctx.getUniformLocation(p, name);
                if (loc) {
                    var id = GL.getNewId(GL.uniforms);
                    utable[name] = [u.size, id];
                    GL.uniforms[id] = loc;
                    for (var j = 1; j < u.size; ++j) {
                        var n = name + "[" + j + "]";
                        loc = GLctx.getUniformLocation(p, n);
                        id = GL.getNewId(GL.uniforms);
                        GL.uniforms[id] = loc;
                    }
                }
            }
        }
    };
    function _emscripten_glActiveTexture(x0) {
        GLctx["activeTexture"](x0);
    }
    function _emscripten_glAttachShader(program, shader) {
        GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
    }
    function _emscripten_glBeginQuery(target, id) {
        GLctx["beginQuery"](target, GL.queries[id]);
    }
    function _emscripten_glBeginQueryEXT(target, id) {
        GLctx.disjointTimerQueryExt["beginQueryEXT"](target, GL.timerQueriesEXT[id]);
    }
    function _emscripten_glBeginTransformFeedback(x0) {
        GLctx["beginTransformFeedback"](x0);
    }
    function _emscripten_glBindAttribLocation(program, index, name) {
        GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name));
    }
    function _emscripten_glBindBuffer(target, buffer) {
        if (target == 35051) {
            GLctx.currentPixelPackBufferBinding = buffer;
        } else if (target == 35052) {
            GLctx.currentPixelUnpackBufferBinding = buffer;
        }
        GLctx.bindBuffer(target, GL.buffers[buffer]);
    }
    function _emscripten_glBindBufferBase(target, index, buffer) {
        GLctx["bindBufferBase"](target, index, GL.buffers[buffer]);
    }
    function _emscripten_glBindBufferRange(target, index, buffer, offset, ptrsize) {
        GLctx["bindBufferRange"](target, index, GL.buffers[buffer], offset, ptrsize);
    }
    function _emscripten_glBindFramebuffer(target, framebuffer) {
        GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer]);
    }
    function _emscripten_glBindRenderbuffer(target, renderbuffer) {
        GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer]);
    }
    function _emscripten_glBindSampler(unit, sampler) {
        GLctx["bindSampler"](unit, GL.samplers[sampler]);
    }
    function _emscripten_glBindTexture(target, texture) {
        GLctx.bindTexture(target, GL.textures[texture]);
    }
    function _emscripten_glBindTransformFeedback(target, id) {
        GLctx["bindTransformFeedback"](target, GL.transformFeedbacks[id]);
    }
    function _emscripten_glBindVertexArray(vao) {
        GLctx["bindVertexArray"](GL.vaos[vao]);
    }
    function _emscripten_glBindVertexArrayOES(vao) {
        GLctx["bindVertexArray"](GL.vaos[vao]);
    }
    function _emscripten_glBlendColor(x0, x1, x2, x3) {
        GLctx["blendColor"](x0, x1, x2, x3);
    }
    function _emscripten_glBlendEquation(x0) {
        GLctx["blendEquation"](x0);
    }
    function _emscripten_glBlendEquationSeparate(x0, x1) {
        GLctx["blendEquationSeparate"](x0, x1);
    }
    function _emscripten_glBlendFunc(x0, x1) {
        GLctx["blendFunc"](x0, x1);
    }
    function _emscripten_glBlendFuncSeparate(x0, x1, x2, x3) {
        GLctx["blendFuncSeparate"](x0, x1, x2, x3);
    }
    function _emscripten_glBlitFramebuffer(x0, x1, x2, x3, x4, x5, x6, x7, x8, x9) {
        GLctx["blitFramebuffer"](x0, x1, x2, x3, x4, x5, x6, x7, x8, x9);
    }
    function _emscripten_glBufferData(target, size, data, usage) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            if (data) {
                GLctx.bufferData(target, HEAPU8, usage, data, size);
            } else {
                GLctx.bufferData(target, size, usage);
            }
        } else {
            GLctx.bufferData(target, data ? HEAPU8.subarray(data, data + size) : size, usage);
        }
    }
    function _emscripten_glBufferSubData(target, offset, size, data) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.bufferSubData(target, offset, HEAPU8, data, size);
            return;
        }
        GLctx.bufferSubData(target, offset, HEAPU8.subarray(data, data + size));
    }
    function _emscripten_glCheckFramebufferStatus(x0) {
        return GLctx["checkFramebufferStatus"](x0);
    }
    function _emscripten_glClear(x0) {
        GLctx["clear"](x0);
    }
    function _emscripten_glClearBufferfi(x0, x1, x2, x3) {
        GLctx["clearBufferfi"](x0, x1, x2, x3);
    }
    function _emscripten_glClearBufferfv(buffer, drawbuffer, value) {
        GLctx["clearBufferfv"](buffer, drawbuffer, HEAPF32, value >> 2);
    }
    function _emscripten_glClearBufferiv(buffer, drawbuffer, value) {
        GLctx["clearBufferiv"](buffer, drawbuffer, HEAP32, value >> 2);
    }
    function _emscripten_glClearBufferuiv(buffer, drawbuffer, value) {
        GLctx["clearBufferuiv"](buffer, drawbuffer, HEAPU32, value >> 2);
    }
    function _emscripten_glClearColor(x0, x1, x2, x3) {
        GLctx["clearColor"](x0, x1, x2, x3);
    }
    function _emscripten_glClearDepthf(x0) {
        GLctx["clearDepth"](x0);
    }
    function _emscripten_glClearStencil(x0) {
        GLctx["clearStencil"](x0);
    }
    function _emscripten_glClientWaitSync(sync, flags, timeoutLo, timeoutHi) {
        timeoutLo = timeoutLo >>> 0;
        timeoutHi = timeoutHi >>> 0;
        var timeout = timeoutLo == 4294967295 && timeoutHi == 4294967295 ? -1 : makeBigInt(timeoutLo, timeoutHi, true);
        return GLctx.clientWaitSync(GL.syncs[sync], flags, timeout);
    }
    function _emscripten_glColorMask(red, green, blue, alpha) {
        GLctx.colorMask(!!red, !!green, !!blue, !!alpha);
    }
    function _emscripten_glCompileShader(shader) {
        GLctx.compileShader(GL.shaders[shader]);
    }
    function _emscripten_glCompressedTexImage2D(target, level, internalFormat, width, height, border, imageSize, data) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            if (GLctx.currentPixelUnpackBufferBinding) {
                GLctx["compressedTexImage2D"](target, level, internalFormat, width, height, border, imageSize, data);
            } else {
                GLctx["compressedTexImage2D"](
                    target,
                    level,
                    internalFormat,
                    width,
                    height,
                    border,
                    HEAPU8,
                    data,
                    imageSize
                );
            }
            return;
        }
        GLctx["compressedTexImage2D"](
            target,
            level,
            internalFormat,
            width,
            height,
            border,
            data ? HEAPU8.subarray(data, data + imageSize) : null
        );
    }
    function _emscripten_glCompressedTexImage3D(
        target,
        level,
        internalFormat,
        width,
        height,
        depth,
        border,
        imageSize,
        data
    ) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            if (GLctx.currentPixelUnpackBufferBinding) {
                GLctx["compressedTexImage3D"](
                    target,
                    level,
                    internalFormat,
                    width,
                    height,
                    depth,
                    border,
                    imageSize,
                    data
                );
            } else {
                GLctx["compressedTexImage3D"](
                    target,
                    level,
                    internalFormat,
                    width,
                    height,
                    depth,
                    border,
                    HEAPU8,
                    data,
                    imageSize
                );
            }
        } else {
            GLctx["compressedTexImage3D"](
                target,
                level,
                internalFormat,
                width,
                height,
                depth,
                border,
                data ? HEAPU8.subarray(data, data + imageSize) : null
            );
        }
    }
    function _emscripten_glCompressedTexSubImage2D(
        target,
        level,
        xoffset,
        yoffset,
        width,
        height,
        format,
        imageSize,
        data
    ) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            if (GLctx.currentPixelUnpackBufferBinding) {
                GLctx["compressedTexSubImage2D"](
                    target,
                    level,
                    xoffset,
                    yoffset,
                    width,
                    height,
                    format,
                    imageSize,
                    data
                );
            } else {
                GLctx["compressedTexSubImage2D"](
                    target,
                    level,
                    xoffset,
                    yoffset,
                    width,
                    height,
                    format,
                    HEAPU8,
                    data,
                    imageSize
                );
            }
            return;
        }
        GLctx["compressedTexSubImage2D"](
            target,
            level,
            xoffset,
            yoffset,
            width,
            height,
            format,
            data ? HEAPU8.subarray(data, data + imageSize) : null
        );
    }
    function _emscripten_glCompressedTexSubImage3D(
        target,
        level,
        xoffset,
        yoffset,
        zoffset,
        width,
        height,
        depth,
        format,
        imageSize,
        data
    ) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            if (GLctx.currentPixelUnpackBufferBinding) {
                GLctx["compressedTexSubImage3D"](
                    target,
                    level,
                    xoffset,
                    yoffset,
                    zoffset,
                    width,
                    height,
                    depth,
                    format,
                    imageSize,
                    data
                );
            } else {
                GLctx["compressedTexSubImage3D"](
                    target,
                    level,
                    xoffset,
                    yoffset,
                    zoffset,
                    width,
                    height,
                    depth,
                    format,
                    HEAPU8,
                    data,
                    imageSize
                );
            }
        } else {
            GLctx["compressedTexSubImage3D"](
                target,
                level,
                xoffset,
                yoffset,
                zoffset,
                width,
                height,
                depth,
                format,
                data ? HEAPU8.subarray(data, data + imageSize) : null
            );
        }
    }
    function _emscripten_glCopyBufferSubData(x0, x1, x2, x3, x4) {
        GLctx["copyBufferSubData"](x0, x1, x2, x3, x4);
    }
    function _emscripten_glCopyTexImage2D(x0, x1, x2, x3, x4, x5, x6, x7) {
        GLctx["copyTexImage2D"](x0, x1, x2, x3, x4, x5, x6, x7);
    }
    function _emscripten_glCopyTexSubImage2D(x0, x1, x2, x3, x4, x5, x6, x7) {
        GLctx["copyTexSubImage2D"](x0, x1, x2, x3, x4, x5, x6, x7);
    }
    function _emscripten_glCopyTexSubImage3D(x0, x1, x2, x3, x4, x5, x6, x7, x8) {
        GLctx["copyTexSubImage3D"](x0, x1, x2, x3, x4, x5, x6, x7, x8);
    }
    function _emscripten_glCreateProgram() {
        var id = GL.getNewId(GL.programs);
        var program = GLctx.createProgram();
        program.name = id;
        GL.programs[id] = program;
        return id;
    }
    function _emscripten_glCreateShader(shaderType) {
        var id = GL.getNewId(GL.shaders);
        GL.shaders[id] = GLctx.createShader(shaderType);
        return id;
    }
    function _emscripten_glCullFace(x0) {
        GLctx["cullFace"](x0);
    }
    function _emscripten_glDeleteBuffers(n, buffers) {
        for (var i = 0; i < n; i++) {
            var id = HEAP32[(buffers + i * 4) >> 2];
            var buffer = GL.buffers[id];
            if (!buffer) continue;
            GLctx.deleteBuffer(buffer);
            buffer.name = 0;
            GL.buffers[id] = null;
            if (id == GL.currArrayBuffer) GL.currArrayBuffer = 0;
            if (id == GL.currElementArrayBuffer) GL.currElementArrayBuffer = 0;
            if (id == GLctx.currentPixelPackBufferBinding) GLctx.currentPixelPackBufferBinding = 0;
            if (id == GLctx.currentPixelUnpackBufferBinding) GLctx.currentPixelUnpackBufferBinding = 0;
        }
    }
    function _emscripten_glDeleteFramebuffers(n, framebuffers) {
        for (var i = 0; i < n; ++i) {
            var id = HEAP32[(framebuffers + i * 4) >> 2];
            var framebuffer = GL.framebuffers[id];
            if (!framebuffer) continue;
            GLctx.deleteFramebuffer(framebuffer);
            framebuffer.name = 0;
            GL.framebuffers[id] = null;
        }
    }
    function _emscripten_glDeleteProgram(id) {
        if (!id) return;
        var program = GL.programs[id];
        if (!program) {
            GL.recordError(1281);
            return;
        }
        GLctx.deleteProgram(program);
        program.name = 0;
        GL.programs[id] = null;
        GL.programInfos[id] = null;
    }
    function _emscripten_glDeleteQueries(n, ids) {
        for (var i = 0; i < n; i++) {
            var id = HEAP32[(ids + i * 4) >> 2];
            var query = GL.queries[id];
            if (!query) continue;
            GLctx["deleteQuery"](query);
            GL.queries[id] = null;
        }
    }
    function _emscripten_glDeleteQueriesEXT(n, ids) {
        for (var i = 0; i < n; i++) {
            var id = HEAP32[(ids + i * 4) >> 2];
            var query = GL.timerQueriesEXT[id];
            if (!query) continue;
            GLctx.disjointTimerQueryExt["deleteQueryEXT"](query);
            GL.timerQueriesEXT[id] = null;
        }
    }
    function _emscripten_glDeleteRenderbuffers(n, renderbuffers) {
        for (var i = 0; i < n; i++) {
            var id = HEAP32[(renderbuffers + i * 4) >> 2];
            var renderbuffer = GL.renderbuffers[id];
            if (!renderbuffer) continue;
            GLctx.deleteRenderbuffer(renderbuffer);
            renderbuffer.name = 0;
            GL.renderbuffers[id] = null;
        }
    }
    function _emscripten_glDeleteSamplers(n, samplers) {
        for (var i = 0; i < n; i++) {
            var id = HEAP32[(samplers + i * 4) >> 2];
            var sampler = GL.samplers[id];
            if (!sampler) continue;
            GLctx["deleteSampler"](sampler);
            sampler.name = 0;
            GL.samplers[id] = null;
        }
    }
    function _emscripten_glDeleteShader(id) {
        if (!id) return;
        var shader = GL.shaders[id];
        if (!shader) {
            GL.recordError(1281);
            return;
        }
        GLctx.deleteShader(shader);
        GL.shaders[id] = null;
    }
    function _emscripten_glDeleteSync(id) {
        if (!id) return;
        var sync = GL.syncs[id];
        if (!sync) {
            GL.recordError(1281);
            return;
        }
        GLctx.deleteSync(sync);
        sync.name = 0;
        GL.syncs[id] = null;
    }
    function _emscripten_glDeleteTextures(n, textures) {
        for (var i = 0; i < n; i++) {
            var id = HEAP32[(textures + i * 4) >> 2];
            var texture = GL.textures[id];
            if (!texture) continue;
            GLctx.deleteTexture(texture);
            texture.name = 0;
            GL.textures[id] = null;
        }
    }
    function _emscripten_glDeleteTransformFeedbacks(n, ids) {
        for (var i = 0; i < n; i++) {
            var id = HEAP32[(ids + i * 4) >> 2];
            var transformFeedback = GL.transformFeedbacks[id];
            if (!transformFeedback) continue;
            GLctx["deleteTransformFeedback"](transformFeedback);
            transformFeedback.name = 0;
            GL.transformFeedbacks[id] = null;
        }
    }
    function _emscripten_glDeleteVertexArrays(n, vaos) {
        for (var i = 0; i < n; i++) {
            var id = HEAP32[(vaos + i * 4) >> 2];
            GLctx["deleteVertexArray"](GL.vaos[id]);
            GL.vaos[id] = null;
        }
    }
    function _emscripten_glDeleteVertexArraysOES(n, vaos) {
        for (var i = 0; i < n; i++) {
            var id = HEAP32[(vaos + i * 4) >> 2];
            GLctx["deleteVertexArray"](GL.vaos[id]);
            GL.vaos[id] = null;
        }
    }
    function _emscripten_glDepthFunc(x0) {
        GLctx["depthFunc"](x0);
    }
    function _emscripten_glDepthMask(flag) {
        GLctx.depthMask(!!flag);
    }
    function _emscripten_glDepthRangef(x0, x1) {
        GLctx["depthRange"](x0, x1);
    }
    function _emscripten_glDetachShader(program, shader) {
        GLctx.detachShader(GL.programs[program], GL.shaders[shader]);
    }
    function _emscripten_glDisable(x0) {
        GLctx["disable"](x0);
    }
    function _emscripten_glDisableVertexAttribArray(index) {
        GLctx.disableVertexAttribArray(index);
    }
    function _emscripten_glDrawArrays(mode, first, count) {
        GLctx.drawArrays(mode, first, count);
    }
    function _emscripten_glDrawArraysInstanced(mode, first, count, primcount) {
        GLctx["drawArraysInstanced"](mode, first, count, primcount);
    }
    function _emscripten_glDrawArraysInstancedANGLE(mode, first, count, primcount) {
        GLctx["drawArraysInstanced"](mode, first, count, primcount);
    }
    function _emscripten_glDrawArraysInstancedARB(mode, first, count, primcount) {
        GLctx["drawArraysInstanced"](mode, first, count, primcount);
    }
    function _emscripten_glDrawArraysInstancedEXT(mode, first, count, primcount) {
        GLctx["drawArraysInstanced"](mode, first, count, primcount);
    }
    function _emscripten_glDrawArraysInstancedNV(mode, first, count, primcount) {
        GLctx["drawArraysInstanced"](mode, first, count, primcount);
    }
    var __tempFixedLengthArray = [];
    function _emscripten_glDrawBuffers(n, bufs) {
        var bufArray = __tempFixedLengthArray[n];
        for (var i = 0; i < n; i++) {
            bufArray[i] = HEAP32[(bufs + i * 4) >> 2];
        }
        GLctx["drawBuffers"](bufArray);
    }
    function _emscripten_glDrawBuffersEXT(n, bufs) {
        var bufArray = __tempFixedLengthArray[n];
        for (var i = 0; i < n; i++) {
            bufArray[i] = HEAP32[(bufs + i * 4) >> 2];
        }
        GLctx["drawBuffers"](bufArray);
    }
    function _emscripten_glDrawBuffersWEBGL(n, bufs) {
        var bufArray = __tempFixedLengthArray[n];
        for (var i = 0; i < n; i++) {
            bufArray[i] = HEAP32[(bufs + i * 4) >> 2];
        }
        GLctx["drawBuffers"](bufArray);
    }
    function _emscripten_glDrawElements(mode, count, type, indices) {
        GLctx.drawElements(mode, count, type, indices);
    }
    function _emscripten_glDrawElementsInstanced(mode, count, type, indices, primcount) {
        GLctx["drawElementsInstanced"](mode, count, type, indices, primcount);
    }
    function _emscripten_glDrawElementsInstancedANGLE(mode, count, type, indices, primcount) {
        GLctx["drawElementsInstanced"](mode, count, type, indices, primcount);
    }
    function _emscripten_glDrawElementsInstancedARB(mode, count, type, indices, primcount) {
        GLctx["drawElementsInstanced"](mode, count, type, indices, primcount);
    }
    function _emscripten_glDrawElementsInstancedEXT(mode, count, type, indices, primcount) {
        GLctx["drawElementsInstanced"](mode, count, type, indices, primcount);
    }
    function _emscripten_glDrawElementsInstancedNV(mode, count, type, indices, primcount) {
        GLctx["drawElementsInstanced"](mode, count, type, indices, primcount);
    }
    function _glDrawElements(mode, count, type, indices) {
        GLctx.drawElements(mode, count, type, indices);
    }
    function _emscripten_glDrawRangeElements(mode, start, end, count, type, indices) {
        _glDrawElements(mode, count, type, indices);
    }
    function _emscripten_glEnable(x0) {
        GLctx["enable"](x0);
    }
    function _emscripten_glEnableVertexAttribArray(index) {
        GLctx.enableVertexAttribArray(index);
    }
    function _emscripten_glEndQuery(x0) {
        GLctx["endQuery"](x0);
    }
    function _emscripten_glEndQueryEXT(target) {
        GLctx.disjointTimerQueryExt["endQueryEXT"](target);
    }
    function _emscripten_glEndTransformFeedback() {
        GLctx["endTransformFeedback"]();
    }
    function _emscripten_glFenceSync(condition, flags) {
        var sync = GLctx.fenceSync(condition, flags);
        if (sync) {
            var id = GL.getNewId(GL.syncs);
            sync.name = id;
            GL.syncs[id] = sync;
            return id;
        } else {
            return 0;
        }
    }
    function _emscripten_glFinish() {
        GLctx["finish"]();
    }
    function _emscripten_glFlush() {
        GLctx["flush"]();
    }
    function _emscripten_glFlushMappedBufferRange() {
        err("missing function: emscripten_glFlushMappedBufferRange");
        abort(-1);
    }
    function _emscripten_glFramebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer) {
        GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget, GL.renderbuffers[renderbuffer]);
    }
    function _emscripten_glFramebufferTexture2D(target, attachment, textarget, texture, level) {
        GLctx.framebufferTexture2D(target, attachment, textarget, GL.textures[texture], level);
    }
    function _emscripten_glFramebufferTextureLayer(target, attachment, texture, level, layer) {
        GLctx.framebufferTextureLayer(target, attachment, GL.textures[texture], level, layer);
    }
    function _emscripten_glFrontFace(x0) {
        GLctx["frontFace"](x0);
    }
    function __glGenObject(n, buffers, createFunction, objectTable) {
        for (var i = 0; i < n; i++) {
            var buffer = GLctx[createFunction]();
            var id = buffer && GL.getNewId(objectTable);
            if (buffer) {
                buffer.name = id;
                objectTable[id] = buffer;
            } else {
                GL.recordError(1282);
            }
            HEAP32[(buffers + i * 4) >> 2] = id;
        }
    }
    function _emscripten_glGenBuffers(n, buffers) {
        __glGenObject(n, buffers, "createBuffer", GL.buffers);
    }
    function _emscripten_glGenFramebuffers(n, ids) {
        __glGenObject(n, ids, "createFramebuffer", GL.framebuffers);
    }
    function _emscripten_glGenQueries(n, ids) {
        __glGenObject(n, ids, "createQuery", GL.queries);
    }
    function _emscripten_glGenQueriesEXT(n, ids) {
        for (var i = 0; i < n; i++) {
            var query = GLctx.disjointTimerQueryExt["createQueryEXT"]();
            if (!query) {
                GL.recordError(1282);
                while (i < n) HEAP32[(ids + i++ * 4) >> 2] = 0;
                return;
            }
            var id = GL.getNewId(GL.timerQueriesEXT);
            query.name = id;
            GL.timerQueriesEXT[id] = query;
            HEAP32[(ids + i * 4) >> 2] = id;
        }
    }
    function _emscripten_glGenRenderbuffers(n, renderbuffers) {
        __glGenObject(n, renderbuffers, "createRenderbuffer", GL.renderbuffers);
    }
    function _emscripten_glGenSamplers(n, samplers) {
        __glGenObject(n, samplers, "createSampler", GL.samplers);
    }
    function _emscripten_glGenTextures(n, textures) {
        __glGenObject(n, textures, "createTexture", GL.textures);
    }
    function _emscripten_glGenTransformFeedbacks(n, ids) {
        __glGenObject(n, ids, "createTransformFeedback", GL.transformFeedbacks);
    }
    function _emscripten_glGenVertexArrays(n, arrays) {
        __glGenObject(n, arrays, "createVertexArray", GL.vaos);
    }
    function _emscripten_glGenVertexArraysOES(n, arrays) {
        __glGenObject(n, arrays, "createVertexArray", GL.vaos);
    }
    function _emscripten_glGenerateMipmap(x0) {
        GLctx["generateMipmap"](x0);
    }
    function _emscripten_glGetActiveAttrib(program, index, bufSize, length, size, type, name) {
        program = GL.programs[program];
        var info = GLctx.getActiveAttrib(program, index);
        if (!info) return;
        if (bufSize > 0 && name) {
            var numBytesWrittenExclNull = stringToUTF8(info.name, name, bufSize);
            if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
        } else {
            if (length) HEAP32[length >> 2] = 0;
        }
        if (size) HEAP32[size >> 2] = info.size;
        if (type) HEAP32[type >> 2] = info.type;
    }
    function _emscripten_glGetActiveUniform(program, index, bufSize, length, size, type, name) {
        program = GL.programs[program];
        var info = GLctx.getActiveUniform(program, index);
        if (!info) return;
        if (bufSize > 0 && name) {
            var numBytesWrittenExclNull = stringToUTF8(info.name, name, bufSize);
            if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
        } else {
            if (length) HEAP32[length >> 2] = 0;
        }
        if (size) HEAP32[size >> 2] = info.size;
        if (type) HEAP32[type >> 2] = info.type;
    }
    function _emscripten_glGetActiveUniformBlockName(program, uniformBlockIndex, bufSize, length, uniformBlockName) {
        program = GL.programs[program];
        var result = GLctx["getActiveUniformBlockName"](program, uniformBlockIndex);
        if (!result) return;
        if (uniformBlockName && bufSize > 0) {
            var numBytesWrittenExclNull = stringToUTF8(result, uniformBlockName, bufSize);
            if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
        } else {
            if (length) HEAP32[length >> 2] = 0;
        }
    }
    function _emscripten_glGetActiveUniformBlockiv(program, uniformBlockIndex, pname, params) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        program = GL.programs[program];
        switch (pname) {
            case 35393:
                var name = GLctx["getActiveUniformBlockName"](program, uniformBlockIndex);
                HEAP32[params >> 2] = name.length + 1;
                return;
            default:
                var result = GLctx["getActiveUniformBlockParameter"](program, uniformBlockIndex, pname);
                if (!result) return;
                if (typeof result == "number") {
                    HEAP32[params >> 2] = result;
                } else {
                    for (var i = 0; i < result.length; i++) {
                        HEAP32[(params + i * 4) >> 2] = result[i];
                    }
                }
        }
    }
    function _emscripten_glGetActiveUniformsiv(program, uniformCount, uniformIndices, pname, params) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        if (uniformCount > 0 && uniformIndices == 0) {
            GL.recordError(1281);
            return;
        }
        program = GL.programs[program];
        var ids = [];
        for (var i = 0; i < uniformCount; i++) {
            ids.push(HEAP32[(uniformIndices + i * 4) >> 2]);
        }
        var result = GLctx["getActiveUniforms"](program, ids, pname);
        if (!result) return;
        var len = result.length;
        for (var i = 0; i < len; i++) {
            HEAP32[(params + i * 4) >> 2] = result[i];
        }
    }
    function _emscripten_glGetAttachedShaders(program, maxCount, count, shaders) {
        var result = GLctx.getAttachedShaders(GL.programs[program]);
        var len = result.length;
        if (len > maxCount) {
            len = maxCount;
        }
        HEAP32[count >> 2] = len;
        for (var i = 0; i < len; ++i) {
            var id = GL.shaders.indexOf(result[i]);
            HEAP32[(shaders + i * 4) >> 2] = id;
        }
    }
    function _emscripten_glGetAttribLocation(program, name) {
        return GLctx.getAttribLocation(GL.programs[program], UTF8ToString(name));
    }
    function emscriptenWebGLGet(name_, p, type) {
        if (!p) {
            GL.recordError(1281);
            return;
        }
        var ret = undefined;
        switch (name_) {
            case 36346:
                ret = 1;
                break;
            case 36344:
                if (type !== "Integer" && type !== "Integer64") {
                    GL.recordError(1280);
                }
                return;
            case 34814:
            case 36345:
                ret = 0;
                break;
            case 34466:
                var formats = GLctx.getParameter(34467);
                ret = formats ? formats.length : 0;
                break;
            case 33309:
                if (GL.currentContext.version < 2) {
                    GL.recordError(1282);
                    return;
                }
                var exts = GLctx.getSupportedExtensions();
                ret = 2 * exts.length;
                break;
            case 33307:
            case 33308:
                if (GL.currentContext.version < 2) {
                    GL.recordError(1280);
                    return;
                }
                ret = name_ == 33307 ? 3 : 0;
                break;
        }
        if (ret === undefined) {
            var result = GLctx.getParameter(name_);
            switch (typeof result) {
                case "number":
                    ret = result;
                    break;
                case "boolean":
                    ret = result ? 1 : 0;
                    break;
                case "string":
                    GL.recordError(1280);
                    return;
                case "object":
                    if (result === null) {
                        switch (name_) {
                            case 34964:
                            case 35725:
                            case 34965:
                            case 36006:
                            case 36007:
                            case 32873:
                            case 34229:
                            case 35097:
                            case 36389:
                            case 34068: {
                                ret = 0;
                                break;
                            }
                            default: {
                                GL.recordError(1280);
                                return;
                            }
                        }
                    } else if (
                        result instanceof Float32Array ||
                        result instanceof Uint32Array ||
                        result instanceof Int32Array ||
                        result instanceof Array
                    ) {
                        for (var i = 0; i < result.length; ++i) {
                            switch (type) {
                                case "Integer":
                                    HEAP32[(p + i * 4) >> 2] = result[i];
                                    break;
                                case "Float":
                                    HEAPF32[(p + i * 4) >> 2] = result[i];
                                    break;
                                case "Boolean":
                                    HEAP8[(p + i) >> 0] = result[i] ? 1 : 0;
                                    break;
                                default:
                                    throw "internal glGet error, bad type: " + type;
                            }
                        }
                        return;
                    } else {
                        try {
                            ret = result.name | 0;
                        } catch (e) {
                            GL.recordError(1280);
                            err(
                                "GL_INVALID_ENUM in glGet" +
                                    type +
                                    "v: Unknown object returned from WebGL getParameter(" +
                                    name_ +
                                    ")! (error: " +
                                    e +
                                    ")"
                            );
                            return;
                        }
                    }
                    break;
                default:
                    GL.recordError(1280);
                    return;
            }
        }
        switch (type) {
            case "Integer64":
                (tempI64 = [
                    ret >>> 0,
                    ((tempDouble = ret),
                    +Math_abs(tempDouble) >= 1
                        ? tempDouble > 0
                            ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0
                            : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
                        : 0)
                ]),
                    (HEAP32[p >> 2] = tempI64[0]),
                    (HEAP32[(p + 4) >> 2] = tempI64[1]);
                break;
            case "Integer":
                HEAP32[p >> 2] = ret;
                break;
            case "Float":
                HEAPF32[p >> 2] = ret;
                break;
            case "Boolean":
                HEAP8[p >> 0] = ret ? 1 : 0;
                break;
            default:
                throw "internal glGet error, bad type: " + type;
        }
    }
    function _emscripten_glGetBooleanv(name_, p) {
        emscriptenWebGLGet(name_, p, "Boolean");
    }
    function _emscripten_glGetBufferParameteri64v(target, value, data) {
        if (!data) {
            GL.recordError(1281);
            return;
        }
        (tempI64 = [
            GLctx.getBufferParameter(target, value) >>> 0,
            ((tempDouble = GLctx.getBufferParameter(target, value)),
            +Math_abs(tempDouble) >= 1
                ? tempDouble > 0
                    ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0
                    : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
                : 0)
        ]),
            (HEAP32[data >> 2] = tempI64[0]),
            (HEAP32[(data + 4) >> 2] = tempI64[1]);
    }
    function _emscripten_glGetBufferParameteriv(target, value, data) {
        if (!data) {
            GL.recordError(1281);
            return;
        }
        HEAP32[data >> 2] = GLctx.getBufferParameter(target, value);
    }
    function _emscripten_glGetBufferPointerv() {
        err("missing function: emscripten_glGetBufferPointerv");
        abort(-1);
    }
    function _emscripten_glGetError() {
        if (GL.lastError) {
            var error = GL.lastError;
            GL.lastError = 0;
            return error;
        } else {
            return GLctx.getError();
        }
    }
    function _emscripten_glGetFloatv(name_, p) {
        emscriptenWebGLGet(name_, p, "Float");
    }
    function _emscripten_glGetFragDataLocation(program, name) {
        return GLctx["getFragDataLocation"](GL.programs[program], UTF8ToString(name));
    }
    function _emscripten_glGetFramebufferAttachmentParameteriv(target, attachment, pname, params) {
        var result = GLctx.getFramebufferAttachmentParameter(target, attachment, pname);
        if (result instanceof WebGLRenderbuffer || result instanceof WebGLTexture) {
            result = result.name | 0;
        }
        HEAP32[params >> 2] = result;
    }
    function emscriptenWebGLGetIndexed(target, index, data, type) {
        if (!data) {
            GL.recordError(1281);
            return;
        }
        var result = GLctx["getIndexedParameter"](target, index);
        var ret;
        switch (typeof result) {
            case "boolean":
                ret = result ? 1 : 0;
                break;
            case "number":
                ret = result;
                break;
            case "object":
                if (result === null) {
                    switch (target) {
                        case 35983:
                        case 35368:
                            ret = 0;
                            break;
                        default: {
                            GL.recordError(1280);
                            return;
                        }
                    }
                } else if (result instanceof WebGLBuffer) {
                    ret = result.name | 0;
                } else {
                    GL.recordError(1280);
                    return;
                }
                break;
            default:
                GL.recordError(1280);
                return;
        }
        switch (type) {
            case "Integer64":
                (tempI64 = [
                    ret >>> 0,
                    ((tempDouble = ret),
                    +Math_abs(tempDouble) >= 1
                        ? tempDouble > 0
                            ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0
                            : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
                        : 0)
                ]),
                    (HEAP32[data >> 2] = tempI64[0]),
                    (HEAP32[(data + 4) >> 2] = tempI64[1]);
                break;
            case "Integer":
                HEAP32[data >> 2] = ret;
                break;
            case "Float":
                HEAPF32[data >> 2] = ret;
                break;
            case "Boolean":
                HEAP8[data >> 0] = ret ? 1 : 0;
                break;
            default:
                throw "internal emscriptenWebGLGetIndexed() error, bad type: " + type;
        }
    }
    function _emscripten_glGetInteger64i_v(target, index, data) {
        emscriptenWebGLGetIndexed(target, index, data, "Integer64");
    }
    function _emscripten_glGetInteger64v(name_, p) {
        emscriptenWebGLGet(name_, p, "Integer64");
    }
    function _emscripten_glGetIntegeri_v(target, index, data) {
        emscriptenWebGLGetIndexed(target, index, data, "Integer");
    }
    function _emscripten_glGetIntegerv(name_, p) {
        emscriptenWebGLGet(name_, p, "Integer");
    }
    function _emscripten_glGetInternalformativ() {
        err("missing function: emscripten_glGetInternalformativ");
        abort(-1);
    }
    function _emscripten_glGetProgramBinary(program, bufSize, length, binaryFormat, binary) {
        GL.recordError(1282);
    }
    function _emscripten_glGetProgramInfoLog(program, maxLength, length, infoLog) {
        var log = GLctx.getProgramInfoLog(GL.programs[program]);
        if (log === null) log = "(unknown error)";
        if (maxLength > 0 && infoLog) {
            var numBytesWrittenExclNull = stringToUTF8(log, infoLog, maxLength);
            if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
        } else {
            if (length) HEAP32[length >> 2] = 0;
        }
    }
    function _emscripten_glGetProgramiv(program, pname, p) {
        if (!p) {
            GL.recordError(1281);
            return;
        }
        if (program >= GL.counter) {
            GL.recordError(1281);
            return;
        }
        var ptable = GL.programInfos[program];
        if (!ptable) {
            GL.recordError(1282);
            return;
        }
        if (pname == 35716) {
            var log = GLctx.getProgramInfoLog(GL.programs[program]);
            if (log === null) log = "(unknown error)";
            HEAP32[p >> 2] = log.length + 1;
        } else if (pname == 35719) {
            HEAP32[p >> 2] = ptable.maxUniformLength;
        } else if (pname == 35722) {
            if (ptable.maxAttributeLength == -1) {
                program = GL.programs[program];
                var numAttribs = GLctx.getProgramParameter(program, 35721);
                ptable.maxAttributeLength = 0;
                for (var i = 0; i < numAttribs; ++i) {
                    var activeAttrib = GLctx.getActiveAttrib(program, i);
                    ptable.maxAttributeLength = Math.max(ptable.maxAttributeLength, activeAttrib.name.length + 1);
                }
            }
            HEAP32[p >> 2] = ptable.maxAttributeLength;
        } else if (pname == 35381) {
            if (ptable.maxUniformBlockNameLength == -1) {
                program = GL.programs[program];
                var numBlocks = GLctx.getProgramParameter(program, 35382);
                ptable.maxUniformBlockNameLength = 0;
                for (var i = 0; i < numBlocks; ++i) {
                    var activeBlockName = GLctx.getActiveUniformBlockName(program, i);
                    ptable.maxUniformBlockNameLength = Math.max(
                        ptable.maxUniformBlockNameLength,
                        activeBlockName.length + 1
                    );
                }
            }
            HEAP32[p >> 2] = ptable.maxUniformBlockNameLength;
        } else {
            HEAP32[p >> 2] = GLctx.getProgramParameter(GL.programs[program], pname);
        }
    }
    function _emscripten_glGetQueryObjecti64vEXT(id, pname, params) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        var query = GL.timerQueriesEXT[id];
        var param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
        var ret;
        if (typeof param == "boolean") {
            ret = param ? 1 : 0;
        } else {
            ret = param;
        }
        (tempI64 = [
            ret >>> 0,
            ((tempDouble = ret),
            +Math_abs(tempDouble) >= 1
                ? tempDouble > 0
                    ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0
                    : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
                : 0)
        ]),
            (HEAP32[params >> 2] = tempI64[0]),
            (HEAP32[(params + 4) >> 2] = tempI64[1]);
    }
    function _emscripten_glGetQueryObjectivEXT(id, pname, params) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        var query = GL.timerQueriesEXT[id];
        var param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
        var ret;
        if (typeof param == "boolean") {
            ret = param ? 1 : 0;
        } else {
            ret = param;
        }
        HEAP32[params >> 2] = ret;
    }
    function _emscripten_glGetQueryObjectui64vEXT(id, pname, params) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        var query = GL.timerQueriesEXT[id];
        var param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
        var ret;
        if (typeof param == "boolean") {
            ret = param ? 1 : 0;
        } else {
            ret = param;
        }
        (tempI64 = [
            ret >>> 0,
            ((tempDouble = ret),
            +Math_abs(tempDouble) >= 1
                ? tempDouble > 0
                    ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0
                    : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
                : 0)
        ]),
            (HEAP32[params >> 2] = tempI64[0]),
            (HEAP32[(params + 4) >> 2] = tempI64[1]);
    }
    function _emscripten_glGetQueryObjectuiv(id, pname, params) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        var query = GL.queries[id];
        var param = GLctx["getQueryParameter"](query, pname);
        var ret;
        if (typeof param == "boolean") {
            ret = param ? 1 : 0;
        } else {
            ret = param;
        }
        HEAP32[params >> 2] = ret;
    }
    function _emscripten_glGetQueryObjectuivEXT(id, pname, params) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        var query = GL.timerQueriesEXT[id];
        var param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
        var ret;
        if (typeof param == "boolean") {
            ret = param ? 1 : 0;
        } else {
            ret = param;
        }
        HEAP32[params >> 2] = ret;
    }
    function _emscripten_glGetQueryiv(target, pname, params) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        HEAP32[params >> 2] = GLctx["getQuery"](target, pname);
    }
    function _emscripten_glGetQueryivEXT(target, pname, params) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        HEAP32[params >> 2] = GLctx.disjointTimerQueryExt["getQueryEXT"](target, pname);
    }
    function _emscripten_glGetRenderbufferParameteriv(target, pname, params) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        HEAP32[params >> 2] = GLctx.getRenderbufferParameter(target, pname);
    }
    function _emscripten_glGetSamplerParameterfv(sampler, pname, params) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        sampler = GL.samplers[sampler];
        HEAPF32[params >> 2] = GLctx["getSamplerParameter"](sampler, pname);
    }
    function _emscripten_glGetSamplerParameteriv(sampler, pname, params) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        sampler = GL.samplers[sampler];
        HEAP32[params >> 2] = GLctx["getSamplerParameter"](sampler, pname);
    }
    function _emscripten_glGetShaderInfoLog(shader, maxLength, length, infoLog) {
        var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
        if (log === null) log = "(unknown error)";
        if (maxLength > 0 && infoLog) {
            var numBytesWrittenExclNull = stringToUTF8(log, infoLog, maxLength);
            if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
        } else {
            if (length) HEAP32[length >> 2] = 0;
        }
    }
    function _emscripten_glGetShaderPrecisionFormat(shaderType, precisionType, range, precision) {
        var result = GLctx.getShaderPrecisionFormat(shaderType, precisionType);
        HEAP32[range >> 2] = result.rangeMin;
        HEAP32[(range + 4) >> 2] = result.rangeMax;
        HEAP32[precision >> 2] = result.precision;
    }
    function _emscripten_glGetShaderSource(shader, bufSize, length, source) {
        var result = GLctx.getShaderSource(GL.shaders[shader]);
        if (!result) return;
        if (bufSize > 0 && source) {
            var numBytesWrittenExclNull = stringToUTF8(result, source, bufSize);
            if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
        } else {
            if (length) HEAP32[length >> 2] = 0;
        }
    }
    function _emscripten_glGetShaderiv(shader, pname, p) {
        if (!p) {
            GL.recordError(1281);
            return;
        }
        if (pname == 35716) {
            var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
            if (log === null) log = "(unknown error)";
            HEAP32[p >> 2] = log.length + 1;
        } else if (pname == 35720) {
            var source = GLctx.getShaderSource(GL.shaders[shader]);
            var sourceLength = source === null || source.length == 0 ? 0 : source.length + 1;
            HEAP32[p >> 2] = sourceLength;
        } else {
            HEAP32[p >> 2] = GLctx.getShaderParameter(GL.shaders[shader], pname);
        }
    }
    function stringToNewUTF8(jsString) {
        var length = lengthBytesUTF8(jsString) + 1;
        var cString = _malloc(length);
        stringToUTF8(jsString, cString, length);
        return cString;
    }
    function _emscripten_glGetString(name_) {
        if (GL.stringCache[name_]) return GL.stringCache[name_];
        var ret;
        switch (name_) {
            case 7939:
                var exts = GLctx.getSupportedExtensions();
                var gl_exts = [];
                for (var i = 0; i < exts.length; ++i) {
                    gl_exts.push(exts[i]);
                    gl_exts.push("GL_" + exts[i]);
                }
                ret = stringToNewUTF8(gl_exts.join(" "));
                break;
            case 7936:
            case 7937:
            case 37445:
            case 37446:
                var s = GLctx.getParameter(name_);
                if (!s) {
                    GL.recordError(1280);
                }
                ret = stringToNewUTF8(s);
                break;
            case 7938:
                var glVersion = GLctx.getParameter(GLctx.VERSION);
                if (GL.currentContext.version >= 2) glVersion = "OpenGL ES 3.0 (" + glVersion + ")";
                else {
                    glVersion = "OpenGL ES 2.0 (" + glVersion + ")";
                }
                ret = stringToNewUTF8(glVersion);
                break;
            case 35724:
                var glslVersion = GLctx.getParameter(GLctx.SHADING_LANGUAGE_VERSION);
                var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
                var ver_num = glslVersion.match(ver_re);
                if (ver_num !== null) {
                    if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + "0";
                    glslVersion = "OpenGL ES GLSL ES " + ver_num[1] + " (" + glslVersion + ")";
                }
                ret = stringToNewUTF8(glslVersion);
                break;
            default:
                GL.recordError(1280);
                return 0;
        }
        GL.stringCache[name_] = ret;
        return ret;
    }
    function _emscripten_glGetStringi(name, index) {
        if (GL.currentContext.version < 2) {
            GL.recordError(1282);
            return 0;
        }
        var stringiCache = GL.stringiCache[name];
        if (stringiCache) {
            if (index < 0 || index >= stringiCache.length) {
                GL.recordError(1281);
                return 0;
            }
            return stringiCache[index];
        }
        switch (name) {
            case 7939:
                var exts = GLctx.getSupportedExtensions();
                var gl_exts = [];
                for (var i = 0; i < exts.length; ++i) {
                    gl_exts.push(stringToNewUTF8(exts[i]));
                    gl_exts.push(stringToNewUTF8("GL_" + exts[i]));
                }
                stringiCache = GL.stringiCache[name] = gl_exts;
                if (index < 0 || index >= stringiCache.length) {
                    GL.recordError(1281);
                    return 0;
                }
                return stringiCache[index];
            default:
                GL.recordError(1280);
                return 0;
        }
    }
    function _emscripten_glGetSynciv(sync, pname, bufSize, length, values) {
        if (bufSize < 0) {
            GL.recordError(1281);
            return;
        }
        if (!values) {
            GL.recordError(1281);
            return;
        }
        var ret = GLctx.getSyncParameter(GL.syncs[sync], pname);
        HEAP32[length >> 2] = ret;
        if (ret !== null && length) HEAP32[length >> 2] = 1;
    }
    function _emscripten_glGetTexParameterfv(target, pname, params) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        HEAPF32[params >> 2] = GLctx.getTexParameter(target, pname);
    }
    function _emscripten_glGetTexParameteriv(target, pname, params) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        HEAP32[params >> 2] = GLctx.getTexParameter(target, pname);
    }
    function _emscripten_glGetTransformFeedbackVarying(program, index, bufSize, length, size, type, name) {
        program = GL.programs[program];
        var info = GLctx["getTransformFeedbackVarying"](program, index);
        if (!info) return;
        if (name && bufSize > 0) {
            var numBytesWrittenExclNull = stringToUTF8(info.name, name, bufSize);
            if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
        } else {
            if (length) HEAP32[length >> 2] = 0;
        }
        if (size) HEAP32[size >> 2] = info.size;
        if (type) HEAP32[type >> 2] = info.type;
    }
    function _emscripten_glGetUniformBlockIndex(program, uniformBlockName) {
        return GLctx["getUniformBlockIndex"](GL.programs[program], UTF8ToString(uniformBlockName));
    }
    function _emscripten_glGetUniformIndices(program, uniformCount, uniformNames, uniformIndices) {
        if (!uniformIndices) {
            GL.recordError(1281);
            return;
        }
        if (uniformCount > 0 && (uniformNames == 0 || uniformIndices == 0)) {
            GL.recordError(1281);
            return;
        }
        program = GL.programs[program];
        var names = [];
        for (var i = 0; i < uniformCount; i++) names.push(UTF8ToString(HEAP32[(uniformNames + i * 4) >> 2]));
        var result = GLctx["getUniformIndices"](program, names);
        if (!result) return;
        var len = result.length;
        for (var i = 0; i < len; i++) {
            HEAP32[(uniformIndices + i * 4) >> 2] = result[i];
        }
    }
    function _emscripten_glGetUniformLocation(program, name) {
        name = UTF8ToString(name);
        var arrayIndex = 0;
        if (name[name.length - 1] == "]") {
            var leftBrace = name.lastIndexOf("[");
            arrayIndex = name[leftBrace + 1] != "]" ? parseInt(name.slice(leftBrace + 1)) : 0;
            name = name.slice(0, leftBrace);
        }
        var uniformInfo = GL.programInfos[program] && GL.programInfos[program].uniforms[name];
        if (uniformInfo && arrayIndex >= 0 && arrayIndex < uniformInfo[0]) {
            return uniformInfo[1] + arrayIndex;
        } else {
            return -1;
        }
    }
    function emscriptenWebGLGetUniform(program, location, params, type) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        var data = GLctx.getUniform(GL.programs[program], GL.uniforms[location]);
        if (typeof data == "number" || typeof data == "boolean") {
            switch (type) {
                case "Integer":
                    HEAP32[params >> 2] = data;
                    break;
                case "Float":
                    HEAPF32[params >> 2] = data;
                    break;
                default:
                    throw "internal emscriptenWebGLGetUniform() error, bad type: " + type;
            }
        } else {
            for (var i = 0; i < data.length; i++) {
                switch (type) {
                    case "Integer":
                        HEAP32[(params + i * 4) >> 2] = data[i];
                        break;
                    case "Float":
                        HEAPF32[(params + i * 4) >> 2] = data[i];
                        break;
                    default:
                        throw "internal emscriptenWebGLGetUniform() error, bad type: " + type;
                }
            }
        }
    }
    function _emscripten_glGetUniformfv(program, location, params) {
        emscriptenWebGLGetUniform(program, location, params, "Float");
    }
    function _emscripten_glGetUniformiv(program, location, params) {
        emscriptenWebGLGetUniform(program, location, params, "Integer");
    }
    function _emscripten_glGetUniformuiv(program, location, params) {
        emscriptenWebGLGetUniform(program, location, params, "Integer");
    }
    function emscriptenWebGLGetVertexAttrib(index, pname, params, type) {
        if (!params) {
            GL.recordError(1281);
            return;
        }
        var data = GLctx.getVertexAttrib(index, pname);
        if (pname == 34975) {
            HEAP32[params >> 2] = data["name"];
        } else if (typeof data == "number" || typeof data == "boolean") {
            switch (type) {
                case "Integer":
                    HEAP32[params >> 2] = data;
                    break;
                case "Float":
                    HEAPF32[params >> 2] = data;
                    break;
                case "FloatToInteger":
                    HEAP32[params >> 2] = Math.fround(data);
                    break;
                default:
                    throw "internal emscriptenWebGLGetVertexAttrib() error, bad type: " + type;
            }
        } else {
            for (var i = 0; i < data.length; i++) {
                switch (type) {
                    case "Integer":
                        HEAP32[(params + i * 4) >> 2] = data[i];
                        break;
                    case "Float":
                        HEAPF32[(params + i * 4) >> 2] = data[i];
                        break;
                    case "FloatToInteger":
                        HEAP32[(params + i * 4) >> 2] = Math.fround(data[i]);
                        break;
                    default:
                        throw "internal emscriptenWebGLGetVertexAttrib() error, bad type: " + type;
                }
            }
        }
    }
    function _emscripten_glGetVertexAttribIiv(index, pname, params) {
        emscriptenWebGLGetVertexAttrib(index, pname, params, "Integer");
    }
    function _emscripten_glGetVertexAttribIuiv(index, pname, params) {
        emscriptenWebGLGetVertexAttrib(index, pname, params, "Integer");
    }
    function _emscripten_glGetVertexAttribPointerv(index, pname, pointer) {
        if (!pointer) {
            GL.recordError(1281);
            return;
        }
        HEAP32[pointer >> 2] = GLctx.getVertexAttribOffset(index, pname);
    }
    function _emscripten_glGetVertexAttribfv(index, pname, params) {
        emscriptenWebGLGetVertexAttrib(index, pname, params, "Float");
    }
    function _emscripten_glGetVertexAttribiv(index, pname, params) {
        emscriptenWebGLGetVertexAttrib(index, pname, params, "FloatToInteger");
    }
    function _emscripten_glHint(x0, x1) {
        GLctx["hint"](x0, x1);
    }
    function _emscripten_glInvalidateFramebuffer(target, numAttachments, attachments) {
        var list = __tempFixedLengthArray[numAttachments];
        for (var i = 0; i < numAttachments; i++) {
            list[i] = HEAP32[(attachments + i * 4) >> 2];
        }
        GLctx["invalidateFramebuffer"](target, list);
    }
    function _emscripten_glInvalidateSubFramebuffer(target, numAttachments, attachments, x, y, width, height) {
        var list = __tempFixedLengthArray[numAttachments];
        for (var i = 0; i < numAttachments; i++) {
            list[i] = HEAP32[(attachments + i * 4) >> 2];
        }
        GLctx["invalidateSubFramebuffer"](target, list, x, y, width, height);
    }
    function _emscripten_glIsBuffer(buffer) {
        var b = GL.buffers[buffer];
        if (!b) return 0;
        return GLctx.isBuffer(b);
    }
    function _emscripten_glIsEnabled(x0) {
        return GLctx["isEnabled"](x0);
    }
    function _emscripten_glIsFramebuffer(framebuffer) {
        var fb = GL.framebuffers[framebuffer];
        if (!fb) return 0;
        return GLctx.isFramebuffer(fb);
    }
    function _emscripten_glIsProgram(program) {
        program = GL.programs[program];
        if (!program) return 0;
        return GLctx.isProgram(program);
    }
    function _emscripten_glIsQuery(id) {
        var query = GL.queries[id];
        if (!query) return 0;
        return GLctx["isQuery"](query);
    }
    function _emscripten_glIsQueryEXT(id) {
        var query = GL.timerQueriesEXT[id];
        if (!query) return 0;
        return GLctx.disjointTimerQueryExt["isQueryEXT"](query);
    }
    function _emscripten_glIsRenderbuffer(renderbuffer) {
        var rb = GL.renderbuffers[renderbuffer];
        if (!rb) return 0;
        return GLctx.isRenderbuffer(rb);
    }
    function _emscripten_glIsSampler(id) {
        var sampler = GL.samplers[id];
        if (!sampler) return 0;
        return GLctx["isSampler"](sampler);
    }
    function _emscripten_glIsShader(shader) {
        var s = GL.shaders[shader];
        if (!s) return 0;
        return GLctx.isShader(s);
    }
    function _emscripten_glIsSync(sync) {
        var sync = GL.syncs[sync];
        if (!sync) return 0;
        return GLctx.isSync(sync);
    }
    function _emscripten_glIsTexture(id) {
        var texture = GL.textures[id];
        if (!texture) return 0;
        return GLctx.isTexture(texture);
    }
    function _emscripten_glIsTransformFeedback(id) {
        return GLctx["isTransformFeedback"](GL.transformFeedbacks[id]);
    }
    function _emscripten_glIsVertexArray(array) {
        var vao = GL.vaos[array];
        if (!vao) return 0;
        return GLctx["isVertexArray"](vao);
    }
    function _emscripten_glIsVertexArrayOES(array) {
        var vao = GL.vaos[array];
        if (!vao) return 0;
        return GLctx["isVertexArray"](vao);
    }
    function _emscripten_glLineWidth(x0) {
        GLctx["lineWidth"](x0);
    }
    function _emscripten_glLinkProgram(program) {
        GLctx.linkProgram(GL.programs[program]);
        GL.populateUniformTable(program);
    }
    function _emscripten_glMapBufferRange() {
        err("missing function: emscripten_glMapBufferRange");
        abort(-1);
    }
    function _emscripten_glPauseTransformFeedback() {
        GLctx["pauseTransformFeedback"]();
    }
    function _emscripten_glPixelStorei(pname, param) {
        if (pname == 3317) {
            GL.unpackAlignment = param;
        }
        GLctx.pixelStorei(pname, param);
    }
    function _emscripten_glPolygonOffset(x0, x1) {
        GLctx["polygonOffset"](x0, x1);
    }
    function _emscripten_glProgramBinary(program, binaryFormat, binary, length) {
        GL.recordError(1280);
    }
    function _emscripten_glProgramParameteri(program, pname, value) {
        GL.recordError(1280);
    }
    function _emscripten_glQueryCounterEXT(id, target) {
        GLctx.disjointTimerQueryExt["queryCounterEXT"](GL.timerQueriesEXT[id], target);
    }
    function _emscripten_glReadBuffer(x0) {
        GLctx["readBuffer"](x0);
    }
    function __computeUnpackAlignedImageSize(width, height, sizePerPixel, alignment) {
        function roundedToNextMultipleOf(x, y) {
            return (x + y - 1) & -y;
        }
        var plainRowSize = width * sizePerPixel;
        var alignedRowSize = roundedToNextMultipleOf(plainRowSize, alignment);
        return height * alignedRowSize;
    }
    var __colorChannelsInGlTextureFormat = {
        6402: 1,
        6403: 1,
        6406: 1,
        6407: 3,
        6408: 4,
        6409: 1,
        6410: 2,
        33319: 2,
        33320: 2,
        35904: 3,
        35906: 4,
        36244: 1,
        36248: 3,
        36249: 4
    };
    var __sizeOfGlTextureElementType = {
        5120: 1,
        5121: 1,
        5122: 2,
        5123: 2,
        5124: 4,
        5125: 4,
        5126: 4,
        5131: 2,
        32819: 2,
        32820: 2,
        33635: 2,
        33640: 4,
        34042: 4,
        35899: 4,
        35902: 4,
        36193: 2
    };
    function emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) {
        var sizePerPixel = __colorChannelsInGlTextureFormat[format] * __sizeOfGlTextureElementType[type];
        if (!sizePerPixel) {
            GL.recordError(1280);
            return;
        }
        var bytes = __computeUnpackAlignedImageSize(width, height, sizePerPixel, GL.unpackAlignment);
        var end = pixels + bytes;
        switch (type) {
            case 5120:
                return HEAP8.subarray(pixels, end);
            case 5121:
                return HEAPU8.subarray(pixels, end);
            case 5122:
                return HEAP16.subarray(pixels >> 1, end >> 1);
            case 5124:
                return HEAP32.subarray(pixels >> 2, end >> 2);
            case 5126:
                return HEAPF32.subarray(pixels >> 2, end >> 2);
            case 5125:
            case 34042:
            case 35902:
            case 33640:
            case 35899:
            case 34042:
                return HEAPU32.subarray(pixels >> 2, end >> 2);
            case 5123:
            case 33635:
            case 32819:
            case 32820:
            case 36193:
            case 5131:
                return HEAPU16.subarray(pixels >> 1, end >> 1);
            default:
                GL.recordError(1280);
        }
    }
    function __heapObjectForWebGLType(type) {
        switch (type) {
            case 5120:
                return HEAP8;
            case 5121:
                return HEAPU8;
            case 5122:
                return HEAP16;
            case 5123:
            case 33635:
            case 32819:
            case 32820:
            case 36193:
            case 5131:
                return HEAPU16;
            case 5124:
                return HEAP32;
            case 5125:
            case 34042:
            case 35902:
            case 33640:
            case 35899:
            case 34042:
                return HEAPU32;
            case 5126:
                return HEAPF32;
        }
    }
    var __heapAccessShiftForWebGLType = {
        5122: 1,
        5123: 1,
        5124: 2,
        5125: 2,
        5126: 2,
        5131: 1,
        32819: 1,
        32820: 1,
        33635: 1,
        33640: 2,
        34042: 2,
        35899: 2,
        35902: 2,
        36193: 1
    };
    function _emscripten_glReadPixels(x, y, width, height, format, type, pixels) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            if (GLctx.currentPixelPackBufferBinding) {
                GLctx.readPixels(x, y, width, height, format, type, pixels);
            } else {
                GLctx.readPixels(
                    x,
                    y,
                    width,
                    height,
                    format,
                    type,
                    __heapObjectForWebGLType(type),
                    pixels >> (__heapAccessShiftForWebGLType[type] | 0)
                );
            }
            return;
        }
        var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, format);
        if (!pixelData) {
            GL.recordError(1280);
            return;
        }
        GLctx.readPixels(x, y, width, height, format, type, pixelData);
    }
    function _emscripten_glReleaseShaderCompiler() {}
    function _emscripten_glRenderbufferStorage(x0, x1, x2, x3) {
        GLctx["renderbufferStorage"](x0, x1, x2, x3);
    }
    function _emscripten_glRenderbufferStorageMultisample(x0, x1, x2, x3, x4) {
        GLctx["renderbufferStorageMultisample"](x0, x1, x2, x3, x4);
    }
    function _emscripten_glResumeTransformFeedback() {
        GLctx["resumeTransformFeedback"]();
    }
    function _emscripten_glSampleCoverage(value, invert) {
        GLctx.sampleCoverage(value, !!invert);
    }
    function _emscripten_glSamplerParameterf(sampler, pname, param) {
        GLctx["samplerParameterf"](GL.samplers[sampler], pname, param);
    }
    function _emscripten_glSamplerParameterfv(sampler, pname, params) {
        var param = HEAPF32[params >> 2];
        GLctx["samplerParameterf"](GL.samplers[sampler], pname, param);
    }
    function _emscripten_glSamplerParameteri(sampler, pname, param) {
        GLctx["samplerParameteri"](GL.samplers[sampler], pname, param);
    }
    function _emscripten_glSamplerParameteriv(sampler, pname, params) {
        var param = HEAP32[params >> 2];
        GLctx["samplerParameteri"](GL.samplers[sampler], pname, param);
    }
    function _emscripten_glScissor(x0, x1, x2, x3) {
        GLctx["scissor"](x0, x1, x2, x3);
    }
    function _emscripten_glShaderBinary() {
        GL.recordError(1280);
    }
    function _emscripten_glShaderSource(shader, count, string, length) {
        var source = GL.getSource(shader, count, string, length);
        GLctx.shaderSource(GL.shaders[shader], source);
    }
    function _emscripten_glStencilFunc(x0, x1, x2) {
        GLctx["stencilFunc"](x0, x1, x2);
    }
    function _emscripten_glStencilFuncSeparate(x0, x1, x2, x3) {
        GLctx["stencilFuncSeparate"](x0, x1, x2, x3);
    }
    function _emscripten_glStencilMask(x0) {
        GLctx["stencilMask"](x0);
    }
    function _emscripten_glStencilMaskSeparate(x0, x1) {
        GLctx["stencilMaskSeparate"](x0, x1);
    }
    function _emscripten_glStencilOp(x0, x1, x2) {
        GLctx["stencilOp"](x0, x1, x2);
    }
    function _emscripten_glStencilOpSeparate(x0, x1, x2, x3) {
        GLctx["stencilOpSeparate"](x0, x1, x2, x3);
    }
    function _emscripten_glTexImage2D(target, level, internalFormat, width, height, border, format, type, pixels) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            if (GLctx.currentPixelUnpackBufferBinding) {
                GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels);
            } else if (pixels != 0) {
                GLctx.texImage2D(
                    target,
                    level,
                    internalFormat,
                    width,
                    height,
                    border,
                    format,
                    type,
                    __heapObjectForWebGLType(type),
                    pixels >> (__heapAccessShiftForWebGLType[type] | 0)
                );
            } else {
                GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, null);
            }
            return;
        }
        GLctx.texImage2D(
            target,
            level,
            internalFormat,
            width,
            height,
            border,
            format,
            type,
            pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) : null
        );
    }
    function _emscripten_glTexImage3D(
        target,
        level,
        internalFormat,
        width,
        height,
        depth,
        border,
        format,
        type,
        pixels
    ) {
        if (GLctx.currentPixelUnpackBufferBinding) {
            GLctx["texImage3D"](target, level, internalFormat, width, height, depth, border, format, type, pixels);
        } else if (pixels != 0) {
            GLctx["texImage3D"](
                target,
                level,
                internalFormat,
                width,
                height,
                depth,
                border,
                format,
                type,
                __heapObjectForWebGLType(type),
                pixels >> (__heapAccessShiftForWebGLType[type] | 0)
            );
        } else {
            GLctx["texImage3D"](target, level, internalFormat, width, height, depth, border, format, type, null);
        }
    }
    function _emscripten_glTexParameterf(x0, x1, x2) {
        GLctx["texParameterf"](x0, x1, x2);
    }
    function _emscripten_glTexParameterfv(target, pname, params) {
        var param = HEAPF32[params >> 2];
        GLctx.texParameterf(target, pname, param);
    }
    function _emscripten_glTexParameteri(x0, x1, x2) {
        GLctx["texParameteri"](x0, x1, x2);
    }
    function _emscripten_glTexParameteriv(target, pname, params) {
        var param = HEAP32[params >> 2];
        GLctx.texParameteri(target, pname, param);
    }
    function _emscripten_glTexStorage2D(x0, x1, x2, x3, x4) {
        GLctx["texStorage2D"](x0, x1, x2, x3, x4);
    }
    function _emscripten_glTexStorage3D(x0, x1, x2, x3, x4, x5) {
        GLctx["texStorage3D"](x0, x1, x2, x3, x4, x5);
    }
    function _emscripten_glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            if (GLctx.currentPixelUnpackBufferBinding) {
                GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels);
            } else if (pixels != 0) {
                GLctx.texSubImage2D(
                    target,
                    level,
                    xoffset,
                    yoffset,
                    width,
                    height,
                    format,
                    type,
                    __heapObjectForWebGLType(type),
                    pixels >> (__heapAccessShiftForWebGLType[type] | 0)
                );
            } else {
                GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, null);
            }
            return;
        }
        var pixelData = null;
        if (pixels) pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, 0);
        GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData);
    }
    function _emscripten_glTexSubImage3D(
        target,
        level,
        xoffset,
        yoffset,
        zoffset,
        width,
        height,
        depth,
        format,
        type,
        pixels
    ) {
        if (GLctx.currentPixelUnpackBufferBinding) {
            GLctx["texSubImage3D"](
                target,
                level,
                xoffset,
                yoffset,
                zoffset,
                width,
                height,
                depth,
                format,
                type,
                pixels
            );
        } else if (pixels != 0) {
            GLctx["texSubImage3D"](
                target,
                level,
                xoffset,
                yoffset,
                zoffset,
                width,
                height,
                depth,
                format,
                type,
                __heapObjectForWebGLType(type),
                pixels >> (__heapAccessShiftForWebGLType[type] | 0)
            );
        } else {
            GLctx["texSubImage3D"](target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, null);
        }
    }
    function _emscripten_glTransformFeedbackVaryings(program, count, varyings, bufferMode) {
        program = GL.programs[program];
        var vars = [];
        for (var i = 0; i < count; i++) vars.push(UTF8ToString(HEAP32[(varyings + i * 4) >> 2]));
        GLctx["transformFeedbackVaryings"](program, vars, bufferMode);
    }
    function _emscripten_glUniform1f(location, v0) {
        GLctx.uniform1f(GL.uniforms[location], v0);
    }
    function _emscripten_glUniform1fv(location, count, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniform1fv(GL.uniforms[location], HEAPF32, value >> 2, count);
            return;
        }
        if (count <= GL.MINI_TEMP_BUFFER_SIZE) {
            var view = GL.miniTempBufferViews[count - 1];
            for (var i = 0; i < count; ++i) {
                view[i] = HEAPF32[(value + 4 * i) >> 2];
            }
        } else {
            var view = HEAPF32.subarray(value >> 2, (value + count * 4) >> 2);
        }
        GLctx.uniform1fv(GL.uniforms[location], view);
    }
    function _emscripten_glUniform1i(location, v0) {
        GLctx.uniform1i(GL.uniforms[location], v0);
    }
    function _emscripten_glUniform1iv(location, count, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniform1iv(GL.uniforms[location], HEAP32, value >> 2, count);
            return;
        }
        GLctx.uniform1iv(GL.uniforms[location], HEAP32.subarray(value >> 2, (value + count * 4) >> 2));
    }
    function _emscripten_glUniform1ui(location, v0) {
        GLctx.uniform1ui(GL.uniforms[location], v0);
    }
    function _emscripten_glUniform1uiv(location, count, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniform1uiv(GL.uniforms[location], HEAPU32, value >> 2, count);
        } else {
            GLctx.uniform1uiv(GL.uniforms[location], HEAPU32.subarray(value >> 2, (value + count * 4) >> 2));
        }
    }
    function _emscripten_glUniform2f(location, v0, v1) {
        GLctx.uniform2f(GL.uniforms[location], v0, v1);
    }
    function _emscripten_glUniform2fv(location, count, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniform2fv(GL.uniforms[location], HEAPF32, value >> 2, count * 2);
            return;
        }
        if (2 * count <= GL.MINI_TEMP_BUFFER_SIZE) {
            var view = GL.miniTempBufferViews[2 * count - 1];
            for (var i = 0; i < 2 * count; i += 2) {
                view[i] = HEAPF32[(value + 4 * i) >> 2];
                view[i + 1] = HEAPF32[(value + (4 * i + 4)) >> 2];
            }
        } else {
            var view = HEAPF32.subarray(value >> 2, (value + count * 8) >> 2);
        }
        GLctx.uniform2fv(GL.uniforms[location], view);
    }
    function _emscripten_glUniform2i(location, v0, v1) {
        GLctx.uniform2i(GL.uniforms[location], v0, v1);
    }
    function _emscripten_glUniform2iv(location, count, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniform2iv(GL.uniforms[location], HEAP32, value >> 2, count * 2);
            return;
        }
        GLctx.uniform2iv(GL.uniforms[location], HEAP32.subarray(value >> 2, (value + count * 8) >> 2));
    }
    function _emscripten_glUniform2ui(location, v0, v1) {
        GLctx.uniform2ui(GL.uniforms[location], v0, v1);
    }
    function _emscripten_glUniform2uiv(location, count, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniform2uiv(GL.uniforms[location], HEAPU32, value >> 2, count * 2);
        } else {
            GLctx.uniform2uiv(GL.uniforms[location], HEAPU32.subarray(value >> 2, (value + count * 8) >> 2));
        }
    }
    function _emscripten_glUniform3f(location, v0, v1, v2) {
        GLctx.uniform3f(GL.uniforms[location], v0, v1, v2);
    }
    function _emscripten_glUniform3fv(location, count, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniform3fv(GL.uniforms[location], HEAPF32, value >> 2, count * 3);
            return;
        }
        if (3 * count <= GL.MINI_TEMP_BUFFER_SIZE) {
            var view = GL.miniTempBufferViews[3 * count - 1];
            for (var i = 0; i < 3 * count; i += 3) {
                view[i] = HEAPF32[(value + 4 * i) >> 2];
                view[i + 1] = HEAPF32[(value + (4 * i + 4)) >> 2];
                view[i + 2] = HEAPF32[(value + (4 * i + 8)) >> 2];
            }
        } else {
            var view = HEAPF32.subarray(value >> 2, (value + count * 12) >> 2);
        }
        GLctx.uniform3fv(GL.uniforms[location], view);
    }
    function _emscripten_glUniform3i(location, v0, v1, v2) {
        GLctx.uniform3i(GL.uniforms[location], v0, v1, v2);
    }
    function _emscripten_glUniform3iv(location, count, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniform3iv(GL.uniforms[location], HEAP32, value >> 2, count * 3);
            return;
        }
        GLctx.uniform3iv(GL.uniforms[location], HEAP32.subarray(value >> 2, (value + count * 12) >> 2));
    }
    function _emscripten_glUniform3ui(location, v0, v1, v2) {
        GLctx.uniform3ui(GL.uniforms[location], v0, v1, v2);
    }
    function _emscripten_glUniform3uiv(location, count, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniform3uiv(GL.uniforms[location], HEAPU32, value >> 2, count * 3);
        } else {
            GLctx.uniform3uiv(GL.uniforms[location], HEAPU32.subarray(value >> 2, (value + count * 12) >> 2));
        }
    }
    function _emscripten_glUniform4f(location, v0, v1, v2, v3) {
        GLctx.uniform4f(GL.uniforms[location], v0, v1, v2, v3);
    }
    function _emscripten_glUniform4fv(location, count, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniform4fv(GL.uniforms[location], HEAPF32, value >> 2, count * 4);
            return;
        }
        if (4 * count <= GL.MINI_TEMP_BUFFER_SIZE) {
            var view = GL.miniTempBufferViews[4 * count - 1];
            for (var i = 0; i < 4 * count; i += 4) {
                view[i] = HEAPF32[(value + 4 * i) >> 2];
                view[i + 1] = HEAPF32[(value + (4 * i + 4)) >> 2];
                view[i + 2] = HEAPF32[(value + (4 * i + 8)) >> 2];
                view[i + 3] = HEAPF32[(value + (4 * i + 12)) >> 2];
            }
        } else {
            var view = HEAPF32.subarray(value >> 2, (value + count * 16) >> 2);
        }
        GLctx.uniform4fv(GL.uniforms[location], view);
    }
    function _emscripten_glUniform4i(location, v0, v1, v2, v3) {
        GLctx.uniform4i(GL.uniforms[location], v0, v1, v2, v3);
    }
    function _emscripten_glUniform4iv(location, count, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniform4iv(GL.uniforms[location], HEAP32, value >> 2, count * 4);
            return;
        }
        GLctx.uniform4iv(GL.uniforms[location], HEAP32.subarray(value >> 2, (value + count * 16) >> 2));
    }
    function _emscripten_glUniform4ui(location, v0, v1, v2, v3) {
        GLctx.uniform4ui(GL.uniforms[location], v0, v1, v2, v3);
    }
    function _emscripten_glUniform4uiv(location, count, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniform4uiv(GL.uniforms[location], HEAPU32, value >> 2, count * 4);
        } else {
            GLctx.uniform4uiv(GL.uniforms[location], HEAPU32.subarray(value >> 2, (value + count * 16) >> 2));
        }
    }
    function _emscripten_glUniformBlockBinding(program, uniformBlockIndex, uniformBlockBinding) {
        program = GL.programs[program];
        GLctx["uniformBlockBinding"](program, uniformBlockIndex, uniformBlockBinding);
    }
    function _emscripten_glUniformMatrix2fv(location, count, transpose, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniformMatrix2fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 4);
            return;
        }
        if (4 * count <= GL.MINI_TEMP_BUFFER_SIZE) {
            var view = GL.miniTempBufferViews[4 * count - 1];
            for (var i = 0; i < 4 * count; i += 4) {
                view[i] = HEAPF32[(value + 4 * i) >> 2];
                view[i + 1] = HEAPF32[(value + (4 * i + 4)) >> 2];
                view[i + 2] = HEAPF32[(value + (4 * i + 8)) >> 2];
                view[i + 3] = HEAPF32[(value + (4 * i + 12)) >> 2];
            }
        } else {
            var view = HEAPF32.subarray(value >> 2, (value + count * 16) >> 2);
        }
        GLctx.uniformMatrix2fv(GL.uniforms[location], !!transpose, view);
    }
    function _emscripten_glUniformMatrix2x3fv(location, count, transpose, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniformMatrix2x3fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 6);
        } else {
            GLctx.uniformMatrix2x3fv(
                GL.uniforms[location],
                !!transpose,
                HEAPF32.subarray(value >> 2, (value + count * 24) >> 2)
            );
        }
    }
    function _emscripten_glUniformMatrix2x4fv(location, count, transpose, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniformMatrix2x4fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 8);
        } else {
            GLctx.uniformMatrix2x4fv(
                GL.uniforms[location],
                !!transpose,
                HEAPF32.subarray(value >> 2, (value + count * 32) >> 2)
            );
        }
    }
    function _emscripten_glUniformMatrix3fv(location, count, transpose, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniformMatrix3fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 9);
            return;
        }
        if (9 * count <= GL.MINI_TEMP_BUFFER_SIZE) {
            var view = GL.miniTempBufferViews[9 * count - 1];
            for (var i = 0; i < 9 * count; i += 9) {
                view[i] = HEAPF32[(value + 4 * i) >> 2];
                view[i + 1] = HEAPF32[(value + (4 * i + 4)) >> 2];
                view[i + 2] = HEAPF32[(value + (4 * i + 8)) >> 2];
                view[i + 3] = HEAPF32[(value + (4 * i + 12)) >> 2];
                view[i + 4] = HEAPF32[(value + (4 * i + 16)) >> 2];
                view[i + 5] = HEAPF32[(value + (4 * i + 20)) >> 2];
                view[i + 6] = HEAPF32[(value + (4 * i + 24)) >> 2];
                view[i + 7] = HEAPF32[(value + (4 * i + 28)) >> 2];
                view[i + 8] = HEAPF32[(value + (4 * i + 32)) >> 2];
            }
        } else {
            var view = HEAPF32.subarray(value >> 2, (value + count * 36) >> 2);
        }
        GLctx.uniformMatrix3fv(GL.uniforms[location], !!transpose, view);
    }
    function _emscripten_glUniformMatrix3x2fv(location, count, transpose, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniformMatrix3x2fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 6);
        } else {
            GLctx.uniformMatrix3x2fv(
                GL.uniforms[location],
                !!transpose,
                HEAPF32.subarray(value >> 2, (value + count * 24) >> 2)
            );
        }
    }
    function _emscripten_glUniformMatrix3x4fv(location, count, transpose, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniformMatrix3x4fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 12);
        } else {
            GLctx.uniformMatrix3x4fv(
                GL.uniforms[location],
                !!transpose,
                HEAPF32.subarray(value >> 2, (value + count * 48) >> 2)
            );
        }
    }
    function _emscripten_glUniformMatrix4fv(location, count, transpose, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniformMatrix4fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 16);
            return;
        }
        if (16 * count <= GL.MINI_TEMP_BUFFER_SIZE) {
            var view = GL.miniTempBufferViews[16 * count - 1];
            for (var i = 0; i < 16 * count; i += 16) {
                view[i] = HEAPF32[(value + 4 * i) >> 2];
                view[i + 1] = HEAPF32[(value + (4 * i + 4)) >> 2];
                view[i + 2] = HEAPF32[(value + (4 * i + 8)) >> 2];
                view[i + 3] = HEAPF32[(value + (4 * i + 12)) >> 2];
                view[i + 4] = HEAPF32[(value + (4 * i + 16)) >> 2];
                view[i + 5] = HEAPF32[(value + (4 * i + 20)) >> 2];
                view[i + 6] = HEAPF32[(value + (4 * i + 24)) >> 2];
                view[i + 7] = HEAPF32[(value + (4 * i + 28)) >> 2];
                view[i + 8] = HEAPF32[(value + (4 * i + 32)) >> 2];
                view[i + 9] = HEAPF32[(value + (4 * i + 36)) >> 2];
                view[i + 10] = HEAPF32[(value + (4 * i + 40)) >> 2];
                view[i + 11] = HEAPF32[(value + (4 * i + 44)) >> 2];
                view[i + 12] = HEAPF32[(value + (4 * i + 48)) >> 2];
                view[i + 13] = HEAPF32[(value + (4 * i + 52)) >> 2];
                view[i + 14] = HEAPF32[(value + (4 * i + 56)) >> 2];
                view[i + 15] = HEAPF32[(value + (4 * i + 60)) >> 2];
            }
        } else {
            var view = HEAPF32.subarray(value >> 2, (value + count * 64) >> 2);
        }
        GLctx.uniformMatrix4fv(GL.uniforms[location], !!transpose, view);
    }
    function _emscripten_glUniformMatrix4x2fv(location, count, transpose, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniformMatrix4x2fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 8);
        } else {
            GLctx.uniformMatrix4x2fv(
                GL.uniforms[location],
                !!transpose,
                HEAPF32.subarray(value >> 2, (value + count * 32) >> 2)
            );
        }
    }
    function _emscripten_glUniformMatrix4x3fv(location, count, transpose, value) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.uniformMatrix4x3fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 12);
        } else {
            GLctx.uniformMatrix4x3fv(
                GL.uniforms[location],
                !!transpose,
                HEAPF32.subarray(value >> 2, (value + count * 48) >> 2)
            );
        }
    }
    function _emscripten_glUnmapBuffer() {
        err("missing function: emscripten_glUnmapBuffer");
        abort(-1);
    }
    function _emscripten_glUseProgram(program) {
        GLctx.useProgram(GL.programs[program]);
    }
    function _emscripten_glValidateProgram(program) {
        GLctx.validateProgram(GL.programs[program]);
    }
    function _emscripten_glVertexAttrib1f(x0, x1) {
        GLctx["vertexAttrib1f"](x0, x1);
    }
    function _emscripten_glVertexAttrib1fv(index, v) {
        GLctx.vertexAttrib1f(index, HEAPF32[v >> 2]);
    }
    function _emscripten_glVertexAttrib2f(x0, x1, x2) {
        GLctx["vertexAttrib2f"](x0, x1, x2);
    }
    function _emscripten_glVertexAttrib2fv(index, v) {
        GLctx.vertexAttrib2f(index, HEAPF32[v >> 2], HEAPF32[(v + 4) >> 2]);
    }
    function _emscripten_glVertexAttrib3f(x0, x1, x2, x3) {
        GLctx["vertexAttrib3f"](x0, x1, x2, x3);
    }
    function _emscripten_glVertexAttrib3fv(index, v) {
        GLctx.vertexAttrib3f(index, HEAPF32[v >> 2], HEAPF32[(v + 4) >> 2], HEAPF32[(v + 8) >> 2]);
    }
    function _emscripten_glVertexAttrib4f(x0, x1, x2, x3, x4) {
        GLctx["vertexAttrib4f"](x0, x1, x2, x3, x4);
    }
    function _emscripten_glVertexAttrib4fv(index, v) {
        GLctx.vertexAttrib4f(
            index,
            HEAPF32[v >> 2],
            HEAPF32[(v + 4) >> 2],
            HEAPF32[(v + 8) >> 2],
            HEAPF32[(v + 12) >> 2]
        );
    }
    function _emscripten_glVertexAttribDivisor(index, divisor) {
        GLctx["vertexAttribDivisor"](index, divisor);
    }
    function _emscripten_glVertexAttribDivisorANGLE(index, divisor) {
        GLctx["vertexAttribDivisor"](index, divisor);
    }
    function _emscripten_glVertexAttribDivisorARB(index, divisor) {
        GLctx["vertexAttribDivisor"](index, divisor);
    }
    function _emscripten_glVertexAttribDivisorEXT(index, divisor) {
        GLctx["vertexAttribDivisor"](index, divisor);
    }
    function _emscripten_glVertexAttribDivisorNV(index, divisor) {
        GLctx["vertexAttribDivisor"](index, divisor);
    }
    function _emscripten_glVertexAttribI4i(x0, x1, x2, x3, x4) {
        GLctx["vertexAttribI4i"](x0, x1, x2, x3, x4);
    }
    function _emscripten_glVertexAttribI4iv(index, v) {
        GLctx.vertexAttribI4i(index, HEAP32[v >> 2], HEAP32[(v + 4) >> 2], HEAP32[(v + 8) >> 2], HEAP32[(v + 12) >> 2]);
    }
    function _emscripten_glVertexAttribI4ui(x0, x1, x2, x3, x4) {
        GLctx["vertexAttribI4ui"](x0, x1, x2, x3, x4);
    }
    function _emscripten_glVertexAttribI4uiv(index, v) {
        GLctx.vertexAttribI4ui(
            index,
            HEAPU32[v >> 2],
            HEAPU32[(v + 4) >> 2],
            HEAPU32[(v + 8) >> 2],
            HEAPU32[(v + 12) >> 2]
        );
    }
    function _emscripten_glVertexAttribIPointer(index, size, type, stride, ptr) {
        GLctx["vertexAttribIPointer"](index, size, type, stride, ptr);
    }
    function _emscripten_glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
        GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
    }
    function _emscripten_glViewport(x0, x1, x2, x3) {
        GLctx["viewport"](x0, x1, x2, x3);
    }
    function _emscripten_glWaitSync(sync, flags, timeoutLo, timeoutHi) {
        timeoutLo = timeoutLo >>> 0;
        timeoutHi = timeoutHi >>> 0;
        var timeout = timeoutLo == 4294967295 && timeoutHi == 4294967295 ? -1 : makeBigInt(timeoutLo, timeoutHi, true);
        GLctx.waitSync(GL.syncs[sync], flags, timeout);
    }
    function abortOnCannotGrowMemory(requestedSize) {
        abort("OOM");
    }
    function emscripten_realloc_buffer(size) {
        var PAGE_MULTIPLE = 65536;
        size = alignUp(size, PAGE_MULTIPLE);
        var old = Module["buffer"];
        var oldSize = old.byteLength;
        try {
            var result = wasmMemory.grow((size - oldSize) / 65536);
            if (result !== (-1 | 0)) {
                return (Module["buffer"] = wasmMemory.buffer);
            } else {
                return null;
            }
        } catch (e) {
            return null;
        }
    }
    function _emscripten_resize_heap(requestedSize) {
        var oldSize = _emscripten_get_heap_size();
        var PAGE_MULTIPLE = 65536;
        var LIMIT = 2147483648 - PAGE_MULTIPLE;
        if (requestedSize > LIMIT) {
            return false;
        }
        var MIN_TOTAL_MEMORY = 16777216;
        var newSize = Math.max(oldSize, MIN_TOTAL_MEMORY);
        while (newSize < requestedSize) {
            if (newSize <= 536870912) {
                newSize = alignUp(2 * newSize, PAGE_MULTIPLE);
            } else {
                newSize = Math.min(alignUp((3 * newSize + 2147483648) / 4, PAGE_MULTIPLE), LIMIT);
            }
        }
        var replacement = emscripten_realloc_buffer(newSize);
        if (!replacement || replacement.byteLength != newSize) {
            return false;
        }
        updateGlobalBuffer(replacement);
        updateGlobalBufferViews();
        TOTAL_MEMORY = newSize;
        HEAPU32[DYNAMICTOP_PTR >> 2] = requestedSize;
        return true;
    }
    function _glActiveTexture(x0) {
        GLctx["activeTexture"](x0);
    }
    function _glAttachShader(program, shader) {
        GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
    }
    function _glBindBuffer(target, buffer) {
        if (target == 35051) {
            GLctx.currentPixelPackBufferBinding = buffer;
        } else if (target == 35052) {
            GLctx.currentPixelUnpackBufferBinding = buffer;
        }
        GLctx.bindBuffer(target, GL.buffers[buffer]);
    }
    function _glBindBufferRange(target, index, buffer, offset, ptrsize) {
        GLctx["bindBufferRange"](target, index, GL.buffers[buffer], offset, ptrsize);
    }
    function _glBindFramebuffer(target, framebuffer) {
        GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer]);
    }
    function _glBindRenderbuffer(target, renderbuffer) {
        GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer]);
    }
    function _glBindSampler(unit, sampler) {
        GLctx["bindSampler"](unit, GL.samplers[sampler]);
    }
    function _glBindTexture(target, texture) {
        GLctx.bindTexture(target, GL.textures[texture]);
    }
    function _glBindVertexArray(vao) {
        GLctx["bindVertexArray"](GL.vaos[vao]);
    }
    function _glBlendEquationSeparate(x0, x1) {
        GLctx["blendEquationSeparate"](x0, x1);
    }
    function _glBlendFuncSeparate(x0, x1, x2, x3) {
        GLctx["blendFuncSeparate"](x0, x1, x2, x3);
    }
    function _glBlitFramebuffer(x0, x1, x2, x3, x4, x5, x6, x7, x8, x9) {
        GLctx["blitFramebuffer"](x0, x1, x2, x3, x4, x5, x6, x7, x8, x9);
    }
    function _glBufferData(target, size, data, usage) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            if (data) {
                GLctx.bufferData(target, HEAPU8, usage, data, size);
            } else {
                GLctx.bufferData(target, size, usage);
            }
        } else {
            GLctx.bufferData(target, data ? HEAPU8.subarray(data, data + size) : size, usage);
        }
    }
    function _glBufferSubData(target, offset, size, data) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            GLctx.bufferSubData(target, offset, HEAPU8, data, size);
            return;
        }
        GLctx.bufferSubData(target, offset, HEAPU8.subarray(data, data + size));
    }
    function _glClear(x0) {
        GLctx["clear"](x0);
    }
    function _glClearColor(x0, x1, x2, x3) {
        GLctx["clearColor"](x0, x1, x2, x3);
    }
    function _glClearDepthf(x0) {
        GLctx["clearDepth"](x0);
    }
    function _glClearStencil(x0) {
        GLctx["clearStencil"](x0);
    }
    function _glColorMask(red, green, blue, alpha) {
        GLctx.colorMask(!!red, !!green, !!blue, !!alpha);
    }
    function _glCompileShader(shader) {
        GLctx.compileShader(GL.shaders[shader]);
    }
    function _glCompressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, imageSize, data) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            if (GLctx.currentPixelUnpackBufferBinding) {
                GLctx["compressedTexSubImage2D"](
                    target,
                    level,
                    xoffset,
                    yoffset,
                    width,
                    height,
                    format,
                    imageSize,
                    data
                );
            } else {
                GLctx["compressedTexSubImage2D"](
                    target,
                    level,
                    xoffset,
                    yoffset,
                    width,
                    height,
                    format,
                    HEAPU8,
                    data,
                    imageSize
                );
            }
            return;
        }
        GLctx["compressedTexSubImage2D"](
            target,
            level,
            xoffset,
            yoffset,
            width,
            height,
            format,
            data ? HEAPU8.subarray(data, data + imageSize) : null
        );
    }
    function _glCompressedTexSubImage3D(
        target,
        level,
        xoffset,
        yoffset,
        zoffset,
        width,
        height,
        depth,
        format,
        imageSize,
        data
    ) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            if (GLctx.currentPixelUnpackBufferBinding) {
                GLctx["compressedTexSubImage3D"](
                    target,
                    level,
                    xoffset,
                    yoffset,
                    zoffset,
                    width,
                    height,
                    depth,
                    format,
                    imageSize,
                    data
                );
            } else {
                GLctx["compressedTexSubImage3D"](
                    target,
                    level,
                    xoffset,
                    yoffset,
                    zoffset,
                    width,
                    height,
                    depth,
                    format,
                    HEAPU8,
                    data,
                    imageSize
                );
            }
        } else {
            GLctx["compressedTexSubImage3D"](
                target,
                level,
                xoffset,
                yoffset,
                zoffset,
                width,
                height,
                depth,
                format,
                data ? HEAPU8.subarray(data, data + imageSize) : null
            );
        }
    }
    function _glCreateProgram() {
        var id = GL.getNewId(GL.programs);
        var program = GLctx.createProgram();
        program.name = id;
        GL.programs[id] = program;
        return id;
    }
    function _glCreateShader(shaderType) {
        var id = GL.getNewId(GL.shaders);
        GL.shaders[id] = GLctx.createShader(shaderType);
        return id;
    }
    function _glCullFace(x0) {
        GLctx["cullFace"](x0);
    }
    function _glDeleteBuffers(n, buffers) {
        for (var i = 0; i < n; i++) {
            var id = HEAP32[(buffers + i * 4) >> 2];
            var buffer = GL.buffers[id];
            if (!buffer) continue;
            GLctx.deleteBuffer(buffer);
            buffer.name = 0;
            GL.buffers[id] = null;
            if (id == GL.currArrayBuffer) GL.currArrayBuffer = 0;
            if (id == GL.currElementArrayBuffer) GL.currElementArrayBuffer = 0;
            if (id == GLctx.currentPixelPackBufferBinding) GLctx.currentPixelPackBufferBinding = 0;
            if (id == GLctx.currentPixelUnpackBufferBinding) GLctx.currentPixelUnpackBufferBinding = 0;
        }
    }
    function _glDeleteFramebuffers(n, framebuffers) {
        for (var i = 0; i < n; ++i) {
            var id = HEAP32[(framebuffers + i * 4) >> 2];
            var framebuffer = GL.framebuffers[id];
            if (!framebuffer) continue;
            GLctx.deleteFramebuffer(framebuffer);
            framebuffer.name = 0;
            GL.framebuffers[id] = null;
        }
    }
    function _glDeleteProgram(id) {
        if (!id) return;
        var program = GL.programs[id];
        if (!program) {
            GL.recordError(1281);
            return;
        }
        GLctx.deleteProgram(program);
        program.name = 0;
        GL.programs[id] = null;
        GL.programInfos[id] = null;
    }
    function _glDeleteRenderbuffers(n, renderbuffers) {
        for (var i = 0; i < n; i++) {
            var id = HEAP32[(renderbuffers + i * 4) >> 2];
            var renderbuffer = GL.renderbuffers[id];
            if (!renderbuffer) continue;
            GLctx.deleteRenderbuffer(renderbuffer);
            renderbuffer.name = 0;
            GL.renderbuffers[id] = null;
        }
    }
    function _glDeleteSamplers(n, samplers) {
        for (var i = 0; i < n; i++) {
            var id = HEAP32[(samplers + i * 4) >> 2];
            var sampler = GL.samplers[id];
            if (!sampler) continue;
            GLctx["deleteSampler"](sampler);
            sampler.name = 0;
            GL.samplers[id] = null;
        }
    }
    function _glDeleteShader(id) {
        if (!id) return;
        var shader = GL.shaders[id];
        if (!shader) {
            GL.recordError(1281);
            return;
        }
        GLctx.deleteShader(shader);
        GL.shaders[id] = null;
    }
    function _glDeleteSync(id) {
        if (!id) return;
        var sync = GL.syncs[id];
        if (!sync) {
            GL.recordError(1281);
            return;
        }
        GLctx.deleteSync(sync);
        sync.name = 0;
        GL.syncs[id] = null;
    }
    function _glDeleteTextures(n, textures) {
        for (var i = 0; i < n; i++) {
            var id = HEAP32[(textures + i * 4) >> 2];
            var texture = GL.textures[id];
            if (!texture) continue;
            GLctx.deleteTexture(texture);
            texture.name = 0;
            GL.textures[id] = null;
        }
    }
    function _glDeleteVertexArrays(n, vaos) {
        for (var i = 0; i < n; i++) {
            var id = HEAP32[(vaos + i * 4) >> 2];
            GLctx["deleteVertexArray"](GL.vaos[id]);
            GL.vaos[id] = null;
        }
    }
    function _glDepthFunc(x0) {
        GLctx["depthFunc"](x0);
    }
    function _glDepthMask(flag) {
        GLctx.depthMask(!!flag);
    }
    function _glDetachShader(program, shader) {
        GLctx.detachShader(GL.programs[program], GL.shaders[shader]);
    }
    function _glDisable(x0) {
        GLctx["disable"](x0);
    }
    function _glDisableVertexAttribArray(index) {
        GLctx.disableVertexAttribArray(index);
    }
    function _glDrawArrays(mode, first, count) {
        GLctx.drawArrays(mode, first, count);
    }
    function _glDrawRangeElements(mode, start, end, count, type, indices) {
        _glDrawElements(mode, count, type, indices);
    }
    function _glEnable(x0) {
        GLctx["enable"](x0);
    }
    function _glEnableVertexAttribArray(index) {
        GLctx.enableVertexAttribArray(index);
    }
    function _glFenceSync(condition, flags) {
        var sync = GLctx.fenceSync(condition, flags);
        if (sync) {
            var id = GL.getNewId(GL.syncs);
            sync.name = id;
            GL.syncs[id] = sync;
            return id;
        } else {
            return 0;
        }
    }
    function _glFlush() {
        GLctx["flush"]();
    }
    function _glFramebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer) {
        GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget, GL.renderbuffers[renderbuffer]);
    }
    function _glFramebufferTexture2D(target, attachment, textarget, texture, level) {
        GLctx.framebufferTexture2D(target, attachment, textarget, GL.textures[texture], level);
    }
    function _glFramebufferTextureLayer(target, attachment, texture, level, layer) {
        GLctx.framebufferTextureLayer(target, attachment, GL.textures[texture], level, layer);
    }
    function _glFrontFace(x0) {
        GLctx["frontFace"](x0);
    }
    function _glGenBuffers(n, buffers) {
        __glGenObject(n, buffers, "createBuffer", GL.buffers);
    }
    function _glGenFramebuffers(n, ids) {
        __glGenObject(n, ids, "createFramebuffer", GL.framebuffers);
    }
    function _glGenRenderbuffers(n, renderbuffers) {
        __glGenObject(n, renderbuffers, "createRenderbuffer", GL.renderbuffers);
    }
    function _glGenSamplers(n, samplers) {
        __glGenObject(n, samplers, "createSampler", GL.samplers);
    }
    function _glGenTextures(n, textures) {
        __glGenObject(n, textures, "createTexture", GL.textures);
    }
    function _glGenVertexArrays(n, arrays) {
        __glGenObject(n, arrays, "createVertexArray", GL.vaos);
    }
    function _glGenerateMipmap(x0) {
        GLctx["generateMipmap"](x0);
    }
    function _glGetError() {
        if (GL.lastError) {
            var error = GL.lastError;
            GL.lastError = 0;
            return error;
        } else {
            return GLctx.getError();
        }
    }
    function _glGetFloatv(name_, p) {
        emscriptenWebGLGet(name_, p, "Float");
    }
    function _glGetIntegerv(name_, p) {
        emscriptenWebGLGet(name_, p, "Integer");
    }
    function _glGetProgramInfoLog(program, maxLength, length, infoLog) {
        var log = GLctx.getProgramInfoLog(GL.programs[program]);
        if (log === null) log = "(unknown error)";
        if (maxLength > 0 && infoLog) {
            var numBytesWrittenExclNull = stringToUTF8(log, infoLog, maxLength);
            if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
        } else {
            if (length) HEAP32[length >> 2] = 0;
        }
    }
    function _glGetProgramiv(program, pname, p) {
        if (!p) {
            GL.recordError(1281);
            return;
        }
        if (program >= GL.counter) {
            GL.recordError(1281);
            return;
        }
        var ptable = GL.programInfos[program];
        if (!ptable) {
            GL.recordError(1282);
            return;
        }
        if (pname == 35716) {
            var log = GLctx.getProgramInfoLog(GL.programs[program]);
            if (log === null) log = "(unknown error)";
            HEAP32[p >> 2] = log.length + 1;
        } else if (pname == 35719) {
            HEAP32[p >> 2] = ptable.maxUniformLength;
        } else if (pname == 35722) {
            if (ptable.maxAttributeLength == -1) {
                program = GL.programs[program];
                var numAttribs = GLctx.getProgramParameter(program, 35721);
                ptable.maxAttributeLength = 0;
                for (var i = 0; i < numAttribs; ++i) {
                    var activeAttrib = GLctx.getActiveAttrib(program, i);
                    ptable.maxAttributeLength = Math.max(ptable.maxAttributeLength, activeAttrib.name.length + 1);
                }
            }
            HEAP32[p >> 2] = ptable.maxAttributeLength;
        } else if (pname == 35381) {
            if (ptable.maxUniformBlockNameLength == -1) {
                program = GL.programs[program];
                var numBlocks = GLctx.getProgramParameter(program, 35382);
                ptable.maxUniformBlockNameLength = 0;
                for (var i = 0; i < numBlocks; ++i) {
                    var activeBlockName = GLctx.getActiveUniformBlockName(program, i);
                    ptable.maxUniformBlockNameLength = Math.max(
                        ptable.maxUniformBlockNameLength,
                        activeBlockName.length + 1
                    );
                }
            }
            HEAP32[p >> 2] = ptable.maxUniformBlockNameLength;
        } else {
            HEAP32[p >> 2] = GLctx.getProgramParameter(GL.programs[program], pname);
        }
    }
    function _glGetShaderInfoLog(shader, maxLength, length, infoLog) {
        var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
        if (log === null) log = "(unknown error)";
        if (maxLength > 0 && infoLog) {
            var numBytesWrittenExclNull = stringToUTF8(log, infoLog, maxLength);
            if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
        } else {
            if (length) HEAP32[length >> 2] = 0;
        }
    }
    function _glGetShaderiv(shader, pname, p) {
        if (!p) {
            GL.recordError(1281);
            return;
        }
        if (pname == 35716) {
            var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
            if (log === null) log = "(unknown error)";
            HEAP32[p >> 2] = log.length + 1;
        } else if (pname == 35720) {
            var source = GLctx.getShaderSource(GL.shaders[shader]);
            var sourceLength = source === null || source.length == 0 ? 0 : source.length + 1;
            HEAP32[p >> 2] = sourceLength;
        } else {
            HEAP32[p >> 2] = GLctx.getShaderParameter(GL.shaders[shader], pname);
        }
    }
    function _glGetString(name_) {
        if (GL.stringCache[name_]) return GL.stringCache[name_];
        var ret;
        switch (name_) {
            case 7939:
                var exts = GLctx.getSupportedExtensions();
                var gl_exts = [];
                for (var i = 0; i < exts.length; ++i) {
                    gl_exts.push(exts[i]);
                    gl_exts.push("GL_" + exts[i]);
                }
                ret = stringToNewUTF8(gl_exts.join(" "));
                break;
            case 7936:
            case 7937:
            case 37445:
            case 37446:
                var s = GLctx.getParameter(name_);
                if (!s) {
                    GL.recordError(1280);
                }
                ret = stringToNewUTF8(s);
                break;
            case 7938:
                var glVersion = GLctx.getParameter(GLctx.VERSION);
                if (GL.currentContext.version >= 2) glVersion = "OpenGL ES 3.0 (" + glVersion + ")";
                else {
                    glVersion = "OpenGL ES 2.0 (" + glVersion + ")";
                }
                ret = stringToNewUTF8(glVersion);
                break;
            case 35724:
                var glslVersion = GLctx.getParameter(GLctx.SHADING_LANGUAGE_VERSION);
                var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
                var ver_num = glslVersion.match(ver_re);
                if (ver_num !== null) {
                    if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + "0";
                    glslVersion = "OpenGL ES GLSL ES " + ver_num[1] + " (" + glslVersion + ")";
                }
                ret = stringToNewUTF8(glslVersion);
                break;
            default:
                GL.recordError(1280);
                return 0;
        }
        GL.stringCache[name_] = ret;
        return ret;
    }
    function _glGetStringi(name, index) {
        if (GL.currentContext.version < 2) {
            GL.recordError(1282);
            return 0;
        }
        var stringiCache = GL.stringiCache[name];
        if (stringiCache) {
            if (index < 0 || index >= stringiCache.length) {
                GL.recordError(1281);
                return 0;
            }
            return stringiCache[index];
        }
        switch (name) {
            case 7939:
                var exts = GLctx.getSupportedExtensions();
                var gl_exts = [];
                for (var i = 0; i < exts.length; ++i) {
                    gl_exts.push(stringToNewUTF8(exts[i]));
                    gl_exts.push(stringToNewUTF8("GL_" + exts[i]));
                }
                stringiCache = GL.stringiCache[name] = gl_exts;
                if (index < 0 || index >= stringiCache.length) {
                    GL.recordError(1281);
                    return 0;
                }
                return stringiCache[index];
            default:
                GL.recordError(1280);
                return 0;
        }
    }
    function _glGetUniformBlockIndex(program, uniformBlockName) {
        return GLctx["getUniformBlockIndex"](GL.programs[program], UTF8ToString(uniformBlockName));
    }
    function _glGetUniformLocation(program, name) {
        name = UTF8ToString(name);
        var arrayIndex = 0;
        if (name[name.length - 1] == "]") {
            var leftBrace = name.lastIndexOf("[");
            arrayIndex = name[leftBrace + 1] != "]" ? parseInt(name.slice(leftBrace + 1)) : 0;
            name = name.slice(0, leftBrace);
        }
        var uniformInfo = GL.programInfos[program] && GL.programInfos[program].uniforms[name];
        if (uniformInfo && arrayIndex >= 0 && arrayIndex < uniformInfo[0]) {
            return uniformInfo[1] + arrayIndex;
        } else {
            return -1;
        }
    }
    function _glGetVertexAttribiv(index, pname, params) {
        emscriptenWebGLGetVertexAttrib(index, pname, params, "FloatToInteger");
    }
    function _glHint(x0, x1) {
        GLctx["hint"](x0, x1);
    }
    function _glInvalidateFramebuffer(target, numAttachments, attachments) {
        var list = __tempFixedLengthArray[numAttachments];
        for (var i = 0; i < numAttachments; i++) {
            list[i] = HEAP32[(attachments + i * 4) >> 2];
        }
        GLctx["invalidateFramebuffer"](target, list);
    }
    function _glInvalidateSubFramebuffer(target, numAttachments, attachments, x, y, width, height) {
        var list = __tempFixedLengthArray[numAttachments];
        for (var i = 0; i < numAttachments; i++) {
            list[i] = HEAP32[(attachments + i * 4) >> 2];
        }
        GLctx["invalidateSubFramebuffer"](target, list, x, y, width, height);
    }
    function _glIsEnabled(x0) {
        return GLctx["isEnabled"](x0);
    }
    function _glLinkProgram(program) {
        GLctx.linkProgram(GL.programs[program]);
        GL.populateUniformTable(program);
    }
    function _glPixelStorei(pname, param) {
        if (pname == 3317) {
            GL.unpackAlignment = param;
        }
        GLctx.pixelStorei(pname, param);
    }
    function _glPolygonOffset(x0, x1) {
        GLctx["polygonOffset"](x0, x1);
    }
    function _glReadPixels(x, y, width, height, format, type, pixels) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            if (GLctx.currentPixelPackBufferBinding) {
                GLctx.readPixels(x, y, width, height, format, type, pixels);
            } else {
                GLctx.readPixels(
                    x,
                    y,
                    width,
                    height,
                    format,
                    type,
                    __heapObjectForWebGLType(type),
                    pixels >> (__heapAccessShiftForWebGLType[type] | 0)
                );
            }
            return;
        }
        var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, format);
        if (!pixelData) {
            GL.recordError(1280);
            return;
        }
        GLctx.readPixels(x, y, width, height, format, type, pixelData);
    }
    function _glRenderbufferStorage(x0, x1, x2, x3) {
        GLctx["renderbufferStorage"](x0, x1, x2, x3);
    }
    function _glRenderbufferStorageMultisample(x0, x1, x2, x3, x4) {
        GLctx["renderbufferStorageMultisample"](x0, x1, x2, x3, x4);
    }
    function _glSamplerParameteri(sampler, pname, param) {
        GLctx["samplerParameteri"](GL.samplers[sampler], pname, param);
    }
    function _glScissor(x0, x1, x2, x3) {
        GLctx["scissor"](x0, x1, x2, x3);
    }
    function _glShaderSource(shader, count, string, length) {
        var source = GL.getSource(shader, count, string, length);
        GLctx.shaderSource(GL.shaders[shader], source);
    }
    function _glTexParameteri(x0, x1, x2) {
        GLctx["texParameteri"](x0, x1, x2);
    }
    function _glTexStorage2D(x0, x1, x2, x3, x4) {
        GLctx["texStorage2D"](x0, x1, x2, x3, x4);
    }
    function _glTexStorage2DMultisample() {
        err("missing function: glTexStorage2DMultisample");
        abort(-1);
    }
    function _glTexStorage3D(x0, x1, x2, x3, x4, x5) {
        GLctx["texStorage3D"](x0, x1, x2, x3, x4, x5);
    }
    function _glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels) {
        if (GL.currentContext.supportsWebGL2EntryPoints) {
            if (GLctx.currentPixelUnpackBufferBinding) {
                GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels);
            } else if (pixels != 0) {
                GLctx.texSubImage2D(
                    target,
                    level,
                    xoffset,
                    yoffset,
                    width,
                    height,
                    format,
                    type,
                    __heapObjectForWebGLType(type),
                    pixels >> (__heapAccessShiftForWebGLType[type] | 0)
                );
            } else {
                GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, null);
            }
            return;
        }
        var pixelData = null;
        if (pixels) pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, 0);
        GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData);
    }
    function _glTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, pixels) {
        if (GLctx.currentPixelUnpackBufferBinding) {
            GLctx["texSubImage3D"](
                target,
                level,
                xoffset,
                yoffset,
                zoffset,
                width,
                height,
                depth,
                format,
                type,
                pixels
            );
        } else if (pixels != 0) {
            GLctx["texSubImage3D"](
                target,
                level,
                xoffset,
                yoffset,
                zoffset,
                width,
                height,
                depth,
                format,
                type,
                __heapObjectForWebGLType(type),
                pixels >> (__heapAccessShiftForWebGLType[type] | 0)
            );
        } else {
            GLctx["texSubImage3D"](target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, null);
        }
    }
    function _glUniform1f(location, v0) {
        GLctx.uniform1f(GL.uniforms[location], v0);
    }
    function _glUniform1i(location, v0) {
        GLctx.uniform1i(GL.uniforms[location], v0);
    }
    function _glUniform4f(location, v0, v1, v2, v3) {
        GLctx.uniform4f(GL.uniforms[location], v0, v1, v2, v3);
    }
    function _glUniformBlockBinding(program, uniformBlockIndex, uniformBlockBinding) {
        program = GL.programs[program];
        GLctx["uniformBlockBinding"](program, uniformBlockIndex, uniformBlockBinding);
    }
    function _glUseProgram(program) {
        GLctx.useProgram(GL.programs[program]);
    }
    function _glVertexAttribIPointer(index, size, type, stride, ptr) {
        GLctx["vertexAttribIPointer"](index, size, type, stride, ptr);
    }
    function _glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
        GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
    }
    function _glViewport(x0, x1, x2, x3) {
        GLctx["viewport"](x0, x1, x2, x3);
    }
    function _glWaitSync(sync, flags, timeoutLo, timeoutHi) {
        timeoutLo = timeoutLo >>> 0;
        timeoutHi = timeoutHi >>> 0;
        var timeout = timeoutLo == 4294967295 && timeoutHi == 4294967295 ? -1 : makeBigInt(timeoutLo, timeoutHi, true);
        GLctx.waitSync(GL.syncs[sync], flags, timeout);
    }
    function _llvm_exp2_f32(x) {
        return Math.pow(2, x);
    }
    function _llvm_exp2_f64(a0) {
        return _llvm_exp2_f32(a0);
    }
    function _llvm_log2_f32(x) {
        return Math.log(x) / Math.LN2;
    }
    function _llvm_trap() {
        abort("trap!");
    }
    function _emscripten_memcpy_big(dest, src, num) {
        HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
    }
    function _pthread_cond_destroy() {
        return 0;
    }
    function _pthread_cond_signal() {
        return 0;
    }
    function _pthread_cond_timedwait() {
        return 0;
    }
    function _pthread_cond_wait() {
        return 0;
    }
    function _pthread_create() {
        return 11;
    }
    function _pthread_join() {}
    function _sysconf(name) {
        switch (name) {
            case 30:
                return PAGE_SIZE;
            case 85:
                var maxHeapSize = 2 * 1024 * 1024 * 1024 - 65536;
                return maxHeapSize / PAGE_SIZE;
            case 132:
            case 133:
            case 12:
            case 137:
            case 138:
            case 15:
            case 235:
            case 16:
            case 17:
            case 18:
            case 19:
            case 20:
            case 149:
            case 13:
            case 10:
            case 236:
            case 153:
            case 9:
            case 21:
            case 22:
            case 159:
            case 154:
            case 14:
            case 77:
            case 78:
            case 139:
            case 80:
            case 81:
            case 82:
            case 68:
            case 67:
            case 164:
            case 11:
            case 29:
            case 47:
            case 48:
            case 95:
            case 52:
            case 51:
            case 46:
                return 200809;
            case 79:
                return 0;
            case 27:
            case 246:
            case 127:
            case 128:
            case 23:
            case 24:
            case 160:
            case 161:
            case 181:
            case 182:
            case 242:
            case 183:
            case 184:
            case 243:
            case 244:
            case 245:
            case 165:
            case 178:
            case 179:
            case 49:
            case 50:
            case 168:
            case 169:
            case 175:
            case 170:
            case 171:
            case 172:
            case 97:
            case 76:
            case 32:
            case 173:
            case 35:
                return -1;
            case 176:
            case 177:
            case 7:
            case 155:
            case 8:
            case 157:
            case 125:
            case 126:
            case 92:
            case 93:
            case 129:
            case 130:
            case 131:
            case 94:
            case 91:
                return 1;
            case 74:
            case 60:
            case 69:
            case 70:
            case 4:
                return 1024;
            case 31:
            case 42:
            case 72:
                return 32;
            case 87:
            case 26:
            case 33:
                return 2147483647;
            case 34:
            case 1:
                return 47839;
            case 38:
            case 36:
                return 99;
            case 43:
            case 37:
                return 2048;
            case 0:
                return 2097152;
            case 3:
                return 65536;
            case 28:
                return 32768;
            case 44:
                return 32767;
            case 75:
                return 16384;
            case 39:
                return 1e3;
            case 89:
                return 700;
            case 71:
                return 256;
            case 40:
                return 255;
            case 2:
                return 100;
            case 180:
                return 64;
            case 25:
                return 20;
            case 5:
                return 16;
            case 6:
                return 6;
            case 73:
                return 4;
            case 84: {
                if (typeof navigator === "object") return navigator["hardwareConcurrency"] || 1;
                return 1;
            }
        }
        ___setErrNo(22);
        return -1;
    }
    FS.staticInit();
    if (ENVIRONMENT_IS_NODE) {
        var fs = require("fs");
        var NODEJS_PATH = require("path");
        NODEFS.staticInit();
    }
    InternalError = Module["InternalError"] = extendError(Error, "InternalError");
    embind_init_charCodes();
    BindingError = Module["BindingError"] = extendError(Error, "BindingError");
    init_ClassHandle();
    init_RegisteredPointer();
    init_embind();
    UnboundTypeError = Module["UnboundTypeError"] = extendError(Error, "UnboundTypeError");
    init_emval();
    if (ENVIRONMENT_IS_NODE) {
        _emscripten_get_now = function _emscripten_get_now_actual() {
            var t = process["hrtime"]();
            return t[0] * 1e3 + t[1] / 1e6;
        };
    } else if (typeof dateNow !== "undefined") {
        _emscripten_get_now = dateNow;
    } else if (typeof self === "object" && self["performance"] && typeof self["performance"]["now"] === "function") {
        _emscripten_get_now = function() {
            return self["performance"]["now"]();
        };
    } else if (typeof performance === "object" && typeof performance["now"] === "function") {
        _emscripten_get_now = function() {
            return performance["now"]();
        };
    } else {
        _emscripten_get_now = Date.now;
    }
    var GLctx;
    GL.init();
    for (var i = 0; i < 32; i++) __tempFixedLengthArray.push(new Array(i));
    var ASSERTIONS = false;
    function intArrayFromString(stringy, dontAddNull, length) {
        var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
        var u8array = new Array(len);
        var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
        if (dontAddNull) u8array.length = numBytesWritten;
        return u8array;
    }
    var asmGlobalArg = {};
    var asmLibraryArg = {
        abort: abort,
        setTempRet0: setTempRet0,
        getTempRet0: getTempRet0,
        ClassHandle: ClassHandle,
        ClassHandle_clone: ClassHandle_clone,
        ClassHandle_delete: ClassHandle_delete,
        ClassHandle_deleteLater: ClassHandle_deleteLater,
        ClassHandle_isAliasOf: ClassHandle_isAliasOf,
        ClassHandle_isDeleted: ClassHandle_isDeleted,
        RegisteredClass: RegisteredClass,
        RegisteredPointer: RegisteredPointer,
        RegisteredPointer_deleteObject: RegisteredPointer_deleteObject,
        RegisteredPointer_destructor: RegisteredPointer_destructor,
        RegisteredPointer_fromWireType: RegisteredPointer_fromWireType,
        RegisteredPointer_getPointee: RegisteredPointer_getPointee,
        __ZSt18uncaught_exceptionv: __ZSt18uncaught_exceptionv,
        ___atomic_compare_exchange_8: ___atomic_compare_exchange_8,
        ___atomic_fetch_sub_8: ___atomic_fetch_sub_8,
        ___cxa_begin_catch: ___cxa_begin_catch,
        ___cxa_find_matching_catch: ___cxa_find_matching_catch,
        ___cxa_free_exception: ___cxa_free_exception,
        ___cxa_pure_virtual: ___cxa_pure_virtual,
        ___gxx_personality_v0: ___gxx_personality_v0,
        ___resumeException: ___resumeException,
        ___setErrNo: ___setErrNo,
        ___syscall140: ___syscall140,
        ___syscall146: ___syscall146,
        ___syscall221: ___syscall221,
        ___syscall3: ___syscall3,
        ___syscall5: ___syscall5,
        ___syscall54: ___syscall54,
        ___syscall6: ___syscall6,
        __computeUnpackAlignedImageSize: __computeUnpackAlignedImageSize,
        __embind_finalize_value_array: __embind_finalize_value_array,
        __embind_finalize_value_object: __embind_finalize_value_object,
        __embind_register_bool: __embind_register_bool,
        __embind_register_class: __embind_register_class,
        __embind_register_class_class_function: __embind_register_class_class_function,
        __embind_register_class_constructor: __embind_register_class_constructor,
        __embind_register_class_function: __embind_register_class_function,
        __embind_register_class_property: __embind_register_class_property,
        __embind_register_emval: __embind_register_emval,
        __embind_register_enum: __embind_register_enum,
        __embind_register_enum_value: __embind_register_enum_value,
        __embind_register_float: __embind_register_float,
        __embind_register_function: __embind_register_function,
        __embind_register_integer: __embind_register_integer,
        __embind_register_memory_view: __embind_register_memory_view,
        __embind_register_std_string: __embind_register_std_string,
        __embind_register_std_wstring: __embind_register_std_wstring,
        __embind_register_value_array: __embind_register_value_array,
        __embind_register_value_array_element: __embind_register_value_array_element,
        __embind_register_value_object: __embind_register_value_object,
        __embind_register_value_object_field: __embind_register_value_object_field,
        __embind_register_void: __embind_register_void,
        __emval_as: __emval_as,
        __emval_decref: __emval_decref,
        __emval_get_property: __emval_get_property,
        __emval_incref: __emval_incref,
        __emval_new_cstring: __emval_new_cstring,
        __emval_register: __emval_register,
        __emval_run_destructors: __emval_run_destructors,
        __emval_take_value: __emval_take_value,
        __glGenObject: __glGenObject,
        __heapObjectForWebGLType: __heapObjectForWebGLType,
        _abort: _abort,
        _clock_gettime: _clock_gettime,
        _embind_repr: _embind_repr,
        _emscripten_get_heap_size: _emscripten_get_heap_size,
        _emscripten_get_now: _emscripten_get_now,
        _emscripten_get_now_is_monotonic: _emscripten_get_now_is_monotonic,
        _emscripten_glActiveTexture: _emscripten_glActiveTexture,
        _emscripten_glAttachShader: _emscripten_glAttachShader,
        _emscripten_glBeginQuery: _emscripten_glBeginQuery,
        _emscripten_glBeginQueryEXT: _emscripten_glBeginQueryEXT,
        _emscripten_glBeginTransformFeedback: _emscripten_glBeginTransformFeedback,
        _emscripten_glBindAttribLocation: _emscripten_glBindAttribLocation,
        _emscripten_glBindBuffer: _emscripten_glBindBuffer,
        _emscripten_glBindBufferBase: _emscripten_glBindBufferBase,
        _emscripten_glBindBufferRange: _emscripten_glBindBufferRange,
        _emscripten_glBindFramebuffer: _emscripten_glBindFramebuffer,
        _emscripten_glBindRenderbuffer: _emscripten_glBindRenderbuffer,
        _emscripten_glBindSampler: _emscripten_glBindSampler,
        _emscripten_glBindTexture: _emscripten_glBindTexture,
        _emscripten_glBindTransformFeedback: _emscripten_glBindTransformFeedback,
        _emscripten_glBindVertexArray: _emscripten_glBindVertexArray,
        _emscripten_glBindVertexArrayOES: _emscripten_glBindVertexArrayOES,
        _emscripten_glBlendColor: _emscripten_glBlendColor,
        _emscripten_glBlendEquation: _emscripten_glBlendEquation,
        _emscripten_glBlendEquationSeparate: _emscripten_glBlendEquationSeparate,
        _emscripten_glBlendFunc: _emscripten_glBlendFunc,
        _emscripten_glBlendFuncSeparate: _emscripten_glBlendFuncSeparate,
        _emscripten_glBlitFramebuffer: _emscripten_glBlitFramebuffer,
        _emscripten_glBufferData: _emscripten_glBufferData,
        _emscripten_glBufferSubData: _emscripten_glBufferSubData,
        _emscripten_glCheckFramebufferStatus: _emscripten_glCheckFramebufferStatus,
        _emscripten_glClear: _emscripten_glClear,
        _emscripten_glClearBufferfi: _emscripten_glClearBufferfi,
        _emscripten_glClearBufferfv: _emscripten_glClearBufferfv,
        _emscripten_glClearBufferiv: _emscripten_glClearBufferiv,
        _emscripten_glClearBufferuiv: _emscripten_glClearBufferuiv,
        _emscripten_glClearColor: _emscripten_glClearColor,
        _emscripten_glClearDepthf: _emscripten_glClearDepthf,
        _emscripten_glClearStencil: _emscripten_glClearStencil,
        _emscripten_glClientWaitSync: _emscripten_glClientWaitSync,
        _emscripten_glColorMask: _emscripten_glColorMask,
        _emscripten_glCompileShader: _emscripten_glCompileShader,
        _emscripten_glCompressedTexImage2D: _emscripten_glCompressedTexImage2D,
        _emscripten_glCompressedTexImage3D: _emscripten_glCompressedTexImage3D,
        _emscripten_glCompressedTexSubImage2D: _emscripten_glCompressedTexSubImage2D,
        _emscripten_glCompressedTexSubImage3D: _emscripten_glCompressedTexSubImage3D,
        _emscripten_glCopyBufferSubData: _emscripten_glCopyBufferSubData,
        _emscripten_glCopyTexImage2D: _emscripten_glCopyTexImage2D,
        _emscripten_glCopyTexSubImage2D: _emscripten_glCopyTexSubImage2D,
        _emscripten_glCopyTexSubImage3D: _emscripten_glCopyTexSubImage3D,
        _emscripten_glCreateProgram: _emscripten_glCreateProgram,
        _emscripten_glCreateShader: _emscripten_glCreateShader,
        _emscripten_glCullFace: _emscripten_glCullFace,
        _emscripten_glDeleteBuffers: _emscripten_glDeleteBuffers,
        _emscripten_glDeleteFramebuffers: _emscripten_glDeleteFramebuffers,
        _emscripten_glDeleteProgram: _emscripten_glDeleteProgram,
        _emscripten_glDeleteQueries: _emscripten_glDeleteQueries,
        _emscripten_glDeleteQueriesEXT: _emscripten_glDeleteQueriesEXT,
        _emscripten_glDeleteRenderbuffers: _emscripten_glDeleteRenderbuffers,
        _emscripten_glDeleteSamplers: _emscripten_glDeleteSamplers,
        _emscripten_glDeleteShader: _emscripten_glDeleteShader,
        _emscripten_glDeleteSync: _emscripten_glDeleteSync,
        _emscripten_glDeleteTextures: _emscripten_glDeleteTextures,
        _emscripten_glDeleteTransformFeedbacks: _emscripten_glDeleteTransformFeedbacks,
        _emscripten_glDeleteVertexArrays: _emscripten_glDeleteVertexArrays,
        _emscripten_glDeleteVertexArraysOES: _emscripten_glDeleteVertexArraysOES,
        _emscripten_glDepthFunc: _emscripten_glDepthFunc,
        _emscripten_glDepthMask: _emscripten_glDepthMask,
        _emscripten_glDepthRangef: _emscripten_glDepthRangef,
        _emscripten_glDetachShader: _emscripten_glDetachShader,
        _emscripten_glDisable: _emscripten_glDisable,
        _emscripten_glDisableVertexAttribArray: _emscripten_glDisableVertexAttribArray,
        _emscripten_glDrawArrays: _emscripten_glDrawArrays,
        _emscripten_glDrawArraysInstanced: _emscripten_glDrawArraysInstanced,
        _emscripten_glDrawArraysInstancedANGLE: _emscripten_glDrawArraysInstancedANGLE,
        _emscripten_glDrawArraysInstancedARB: _emscripten_glDrawArraysInstancedARB,
        _emscripten_glDrawArraysInstancedEXT: _emscripten_glDrawArraysInstancedEXT,
        _emscripten_glDrawArraysInstancedNV: _emscripten_glDrawArraysInstancedNV,
        _emscripten_glDrawBuffers: _emscripten_glDrawBuffers,
        _emscripten_glDrawBuffersEXT: _emscripten_glDrawBuffersEXT,
        _emscripten_glDrawBuffersWEBGL: _emscripten_glDrawBuffersWEBGL,
        _emscripten_glDrawElements: _emscripten_glDrawElements,
        _emscripten_glDrawElementsInstanced: _emscripten_glDrawElementsInstanced,
        _emscripten_glDrawElementsInstancedANGLE: _emscripten_glDrawElementsInstancedANGLE,
        _emscripten_glDrawElementsInstancedARB: _emscripten_glDrawElementsInstancedARB,
        _emscripten_glDrawElementsInstancedEXT: _emscripten_glDrawElementsInstancedEXT,
        _emscripten_glDrawElementsInstancedNV: _emscripten_glDrawElementsInstancedNV,
        _emscripten_glDrawRangeElements: _emscripten_glDrawRangeElements,
        _emscripten_glEnable: _emscripten_glEnable,
        _emscripten_glEnableVertexAttribArray: _emscripten_glEnableVertexAttribArray,
        _emscripten_glEndQuery: _emscripten_glEndQuery,
        _emscripten_glEndQueryEXT: _emscripten_glEndQueryEXT,
        _emscripten_glEndTransformFeedback: _emscripten_glEndTransformFeedback,
        _emscripten_glFenceSync: _emscripten_glFenceSync,
        _emscripten_glFinish: _emscripten_glFinish,
        _emscripten_glFlush: _emscripten_glFlush,
        _emscripten_glFlushMappedBufferRange: _emscripten_glFlushMappedBufferRange,
        _emscripten_glFramebufferRenderbuffer: _emscripten_glFramebufferRenderbuffer,
        _emscripten_glFramebufferTexture2D: _emscripten_glFramebufferTexture2D,
        _emscripten_glFramebufferTextureLayer: _emscripten_glFramebufferTextureLayer,
        _emscripten_glFrontFace: _emscripten_glFrontFace,
        _emscripten_glGenBuffers: _emscripten_glGenBuffers,
        _emscripten_glGenFramebuffers: _emscripten_glGenFramebuffers,
        _emscripten_glGenQueries: _emscripten_glGenQueries,
        _emscripten_glGenQueriesEXT: _emscripten_glGenQueriesEXT,
        _emscripten_glGenRenderbuffers: _emscripten_glGenRenderbuffers,
        _emscripten_glGenSamplers: _emscripten_glGenSamplers,
        _emscripten_glGenTextures: _emscripten_glGenTextures,
        _emscripten_glGenTransformFeedbacks: _emscripten_glGenTransformFeedbacks,
        _emscripten_glGenVertexArrays: _emscripten_glGenVertexArrays,
        _emscripten_glGenVertexArraysOES: _emscripten_glGenVertexArraysOES,
        _emscripten_glGenerateMipmap: _emscripten_glGenerateMipmap,
        _emscripten_glGetActiveAttrib: _emscripten_glGetActiveAttrib,
        _emscripten_glGetActiveUniform: _emscripten_glGetActiveUniform,
        _emscripten_glGetActiveUniformBlockName: _emscripten_glGetActiveUniformBlockName,
        _emscripten_glGetActiveUniformBlockiv: _emscripten_glGetActiveUniformBlockiv,
        _emscripten_glGetActiveUniformsiv: _emscripten_glGetActiveUniformsiv,
        _emscripten_glGetAttachedShaders: _emscripten_glGetAttachedShaders,
        _emscripten_glGetAttribLocation: _emscripten_glGetAttribLocation,
        _emscripten_glGetBooleanv: _emscripten_glGetBooleanv,
        _emscripten_glGetBufferParameteri64v: _emscripten_glGetBufferParameteri64v,
        _emscripten_glGetBufferParameteriv: _emscripten_glGetBufferParameteriv,
        _emscripten_glGetBufferPointerv: _emscripten_glGetBufferPointerv,
        _emscripten_glGetError: _emscripten_glGetError,
        _emscripten_glGetFloatv: _emscripten_glGetFloatv,
        _emscripten_glGetFragDataLocation: _emscripten_glGetFragDataLocation,
        _emscripten_glGetFramebufferAttachmentParameteriv: _emscripten_glGetFramebufferAttachmentParameteriv,
        _emscripten_glGetInteger64i_v: _emscripten_glGetInteger64i_v,
        _emscripten_glGetInteger64v: _emscripten_glGetInteger64v,
        _emscripten_glGetIntegeri_v: _emscripten_glGetIntegeri_v,
        _emscripten_glGetIntegerv: _emscripten_glGetIntegerv,
        _emscripten_glGetInternalformativ: _emscripten_glGetInternalformativ,
        _emscripten_glGetProgramBinary: _emscripten_glGetProgramBinary,
        _emscripten_glGetProgramInfoLog: _emscripten_glGetProgramInfoLog,
        _emscripten_glGetProgramiv: _emscripten_glGetProgramiv,
        _emscripten_glGetQueryObjecti64vEXT: _emscripten_glGetQueryObjecti64vEXT,
        _emscripten_glGetQueryObjectivEXT: _emscripten_glGetQueryObjectivEXT,
        _emscripten_glGetQueryObjectui64vEXT: _emscripten_glGetQueryObjectui64vEXT,
        _emscripten_glGetQueryObjectuiv: _emscripten_glGetQueryObjectuiv,
        _emscripten_glGetQueryObjectuivEXT: _emscripten_glGetQueryObjectuivEXT,
        _emscripten_glGetQueryiv: _emscripten_glGetQueryiv,
        _emscripten_glGetQueryivEXT: _emscripten_glGetQueryivEXT,
        _emscripten_glGetRenderbufferParameteriv: _emscripten_glGetRenderbufferParameteriv,
        _emscripten_glGetSamplerParameterfv: _emscripten_glGetSamplerParameterfv,
        _emscripten_glGetSamplerParameteriv: _emscripten_glGetSamplerParameteriv,
        _emscripten_glGetShaderInfoLog: _emscripten_glGetShaderInfoLog,
        _emscripten_glGetShaderPrecisionFormat: _emscripten_glGetShaderPrecisionFormat,
        _emscripten_glGetShaderSource: _emscripten_glGetShaderSource,
        _emscripten_glGetShaderiv: _emscripten_glGetShaderiv,
        _emscripten_glGetString: _emscripten_glGetString,
        _emscripten_glGetStringi: _emscripten_glGetStringi,
        _emscripten_glGetSynciv: _emscripten_glGetSynciv,
        _emscripten_glGetTexParameterfv: _emscripten_glGetTexParameterfv,
        _emscripten_glGetTexParameteriv: _emscripten_glGetTexParameteriv,
        _emscripten_glGetTransformFeedbackVarying: _emscripten_glGetTransformFeedbackVarying,
        _emscripten_glGetUniformBlockIndex: _emscripten_glGetUniformBlockIndex,
        _emscripten_glGetUniformIndices: _emscripten_glGetUniformIndices,
        _emscripten_glGetUniformLocation: _emscripten_glGetUniformLocation,
        _emscripten_glGetUniformfv: _emscripten_glGetUniformfv,
        _emscripten_glGetUniformiv: _emscripten_glGetUniformiv,
        _emscripten_glGetUniformuiv: _emscripten_glGetUniformuiv,
        _emscripten_glGetVertexAttribIiv: _emscripten_glGetVertexAttribIiv,
        _emscripten_glGetVertexAttribIuiv: _emscripten_glGetVertexAttribIuiv,
        _emscripten_glGetVertexAttribPointerv: _emscripten_glGetVertexAttribPointerv,
        _emscripten_glGetVertexAttribfv: _emscripten_glGetVertexAttribfv,
        _emscripten_glGetVertexAttribiv: _emscripten_glGetVertexAttribiv,
        _emscripten_glHint: _emscripten_glHint,
        _emscripten_glInvalidateFramebuffer: _emscripten_glInvalidateFramebuffer,
        _emscripten_glInvalidateSubFramebuffer: _emscripten_glInvalidateSubFramebuffer,
        _emscripten_glIsBuffer: _emscripten_glIsBuffer,
        _emscripten_glIsEnabled: _emscripten_glIsEnabled,
        _emscripten_glIsFramebuffer: _emscripten_glIsFramebuffer,
        _emscripten_glIsProgram: _emscripten_glIsProgram,
        _emscripten_glIsQuery: _emscripten_glIsQuery,
        _emscripten_glIsQueryEXT: _emscripten_glIsQueryEXT,
        _emscripten_glIsRenderbuffer: _emscripten_glIsRenderbuffer,
        _emscripten_glIsSampler: _emscripten_glIsSampler,
        _emscripten_glIsShader: _emscripten_glIsShader,
        _emscripten_glIsSync: _emscripten_glIsSync,
        _emscripten_glIsTexture: _emscripten_glIsTexture,
        _emscripten_glIsTransformFeedback: _emscripten_glIsTransformFeedback,
        _emscripten_glIsVertexArray: _emscripten_glIsVertexArray,
        _emscripten_glIsVertexArrayOES: _emscripten_glIsVertexArrayOES,
        _emscripten_glLineWidth: _emscripten_glLineWidth,
        _emscripten_glLinkProgram: _emscripten_glLinkProgram,
        _emscripten_glMapBufferRange: _emscripten_glMapBufferRange,
        _emscripten_glPauseTransformFeedback: _emscripten_glPauseTransformFeedback,
        _emscripten_glPixelStorei: _emscripten_glPixelStorei,
        _emscripten_glPolygonOffset: _emscripten_glPolygonOffset,
        _emscripten_glProgramBinary: _emscripten_glProgramBinary,
        _emscripten_glProgramParameteri: _emscripten_glProgramParameteri,
        _emscripten_glQueryCounterEXT: _emscripten_glQueryCounterEXT,
        _emscripten_glReadBuffer: _emscripten_glReadBuffer,
        _emscripten_glReadPixels: _emscripten_glReadPixels,
        _emscripten_glReleaseShaderCompiler: _emscripten_glReleaseShaderCompiler,
        _emscripten_glRenderbufferStorage: _emscripten_glRenderbufferStorage,
        _emscripten_glRenderbufferStorageMultisample: _emscripten_glRenderbufferStorageMultisample,
        _emscripten_glResumeTransformFeedback: _emscripten_glResumeTransformFeedback,
        _emscripten_glSampleCoverage: _emscripten_glSampleCoverage,
        _emscripten_glSamplerParameterf: _emscripten_glSamplerParameterf,
        _emscripten_glSamplerParameterfv: _emscripten_glSamplerParameterfv,
        _emscripten_glSamplerParameteri: _emscripten_glSamplerParameteri,
        _emscripten_glSamplerParameteriv: _emscripten_glSamplerParameteriv,
        _emscripten_glScissor: _emscripten_glScissor,
        _emscripten_glShaderBinary: _emscripten_glShaderBinary,
        _emscripten_glShaderSource: _emscripten_glShaderSource,
        _emscripten_glStencilFunc: _emscripten_glStencilFunc,
        _emscripten_glStencilFuncSeparate: _emscripten_glStencilFuncSeparate,
        _emscripten_glStencilMask: _emscripten_glStencilMask,
        _emscripten_glStencilMaskSeparate: _emscripten_glStencilMaskSeparate,
        _emscripten_glStencilOp: _emscripten_glStencilOp,
        _emscripten_glStencilOpSeparate: _emscripten_glStencilOpSeparate,
        _emscripten_glTexImage2D: _emscripten_glTexImage2D,
        _emscripten_glTexImage3D: _emscripten_glTexImage3D,
        _emscripten_glTexParameterf: _emscripten_glTexParameterf,
        _emscripten_glTexParameterfv: _emscripten_glTexParameterfv,
        _emscripten_glTexParameteri: _emscripten_glTexParameteri,
        _emscripten_glTexParameteriv: _emscripten_glTexParameteriv,
        _emscripten_glTexStorage2D: _emscripten_glTexStorage2D,
        _emscripten_glTexStorage3D: _emscripten_glTexStorage3D,
        _emscripten_glTexSubImage2D: _emscripten_glTexSubImage2D,
        _emscripten_glTexSubImage3D: _emscripten_glTexSubImage3D,
        _emscripten_glTransformFeedbackVaryings: _emscripten_glTransformFeedbackVaryings,
        _emscripten_glUniform1f: _emscripten_glUniform1f,
        _emscripten_glUniform1fv: _emscripten_glUniform1fv,
        _emscripten_glUniform1i: _emscripten_glUniform1i,
        _emscripten_glUniform1iv: _emscripten_glUniform1iv,
        _emscripten_glUniform1ui: _emscripten_glUniform1ui,
        _emscripten_glUniform1uiv: _emscripten_glUniform1uiv,
        _emscripten_glUniform2f: _emscripten_glUniform2f,
        _emscripten_glUniform2fv: _emscripten_glUniform2fv,
        _emscripten_glUniform2i: _emscripten_glUniform2i,
        _emscripten_glUniform2iv: _emscripten_glUniform2iv,
        _emscripten_glUniform2ui: _emscripten_glUniform2ui,
        _emscripten_glUniform2uiv: _emscripten_glUniform2uiv,
        _emscripten_glUniform3f: _emscripten_glUniform3f,
        _emscripten_glUniform3fv: _emscripten_glUniform3fv,
        _emscripten_glUniform3i: _emscripten_glUniform3i,
        _emscripten_glUniform3iv: _emscripten_glUniform3iv,
        _emscripten_glUniform3ui: _emscripten_glUniform3ui,
        _emscripten_glUniform3uiv: _emscripten_glUniform3uiv,
        _emscripten_glUniform4f: _emscripten_glUniform4f,
        _emscripten_glUniform4fv: _emscripten_glUniform4fv,
        _emscripten_glUniform4i: _emscripten_glUniform4i,
        _emscripten_glUniform4iv: _emscripten_glUniform4iv,
        _emscripten_glUniform4ui: _emscripten_glUniform4ui,
        _emscripten_glUniform4uiv: _emscripten_glUniform4uiv,
        _emscripten_glUniformBlockBinding: _emscripten_glUniformBlockBinding,
        _emscripten_glUniformMatrix2fv: _emscripten_glUniformMatrix2fv,
        _emscripten_glUniformMatrix2x3fv: _emscripten_glUniformMatrix2x3fv,
        _emscripten_glUniformMatrix2x4fv: _emscripten_glUniformMatrix2x4fv,
        _emscripten_glUniformMatrix3fv: _emscripten_glUniformMatrix3fv,
        _emscripten_glUniformMatrix3x2fv: _emscripten_glUniformMatrix3x2fv,
        _emscripten_glUniformMatrix3x4fv: _emscripten_glUniformMatrix3x4fv,
        _emscripten_glUniformMatrix4fv: _emscripten_glUniformMatrix4fv,
        _emscripten_glUniformMatrix4x2fv: _emscripten_glUniformMatrix4x2fv,
        _emscripten_glUniformMatrix4x3fv: _emscripten_glUniformMatrix4x3fv,
        _emscripten_glUnmapBuffer: _emscripten_glUnmapBuffer,
        _emscripten_glUseProgram: _emscripten_glUseProgram,
        _emscripten_glValidateProgram: _emscripten_glValidateProgram,
        _emscripten_glVertexAttrib1f: _emscripten_glVertexAttrib1f,
        _emscripten_glVertexAttrib1fv: _emscripten_glVertexAttrib1fv,
        _emscripten_glVertexAttrib2f: _emscripten_glVertexAttrib2f,
        _emscripten_glVertexAttrib2fv: _emscripten_glVertexAttrib2fv,
        _emscripten_glVertexAttrib3f: _emscripten_glVertexAttrib3f,
        _emscripten_glVertexAttrib3fv: _emscripten_glVertexAttrib3fv,
        _emscripten_glVertexAttrib4f: _emscripten_glVertexAttrib4f,
        _emscripten_glVertexAttrib4fv: _emscripten_glVertexAttrib4fv,
        _emscripten_glVertexAttribDivisor: _emscripten_glVertexAttribDivisor,
        _emscripten_glVertexAttribDivisorANGLE: _emscripten_glVertexAttribDivisorANGLE,
        _emscripten_glVertexAttribDivisorARB: _emscripten_glVertexAttribDivisorARB,
        _emscripten_glVertexAttribDivisorEXT: _emscripten_glVertexAttribDivisorEXT,
        _emscripten_glVertexAttribDivisorNV: _emscripten_glVertexAttribDivisorNV,
        _emscripten_glVertexAttribI4i: _emscripten_glVertexAttribI4i,
        _emscripten_glVertexAttribI4iv: _emscripten_glVertexAttribI4iv,
        _emscripten_glVertexAttribI4ui: _emscripten_glVertexAttribI4ui,
        _emscripten_glVertexAttribI4uiv: _emscripten_glVertexAttribI4uiv,
        _emscripten_glVertexAttribIPointer: _emscripten_glVertexAttribIPointer,
        _emscripten_glVertexAttribPointer: _emscripten_glVertexAttribPointer,
        _emscripten_glViewport: _emscripten_glViewport,
        _emscripten_glWaitSync: _emscripten_glWaitSync,
        _emscripten_memcpy_big: _emscripten_memcpy_big,
        _emscripten_resize_heap: _emscripten_resize_heap,
        _glActiveTexture: _glActiveTexture,
        _glAttachShader: _glAttachShader,
        _glBindBuffer: _glBindBuffer,
        _glBindBufferRange: _glBindBufferRange,
        _glBindFramebuffer: _glBindFramebuffer,
        _glBindRenderbuffer: _glBindRenderbuffer,
        _glBindSampler: _glBindSampler,
        _glBindTexture: _glBindTexture,
        _glBindVertexArray: _glBindVertexArray,
        _glBlendEquationSeparate: _glBlendEquationSeparate,
        _glBlendFuncSeparate: _glBlendFuncSeparate,
        _glBlitFramebuffer: _glBlitFramebuffer,
        _glBufferData: _glBufferData,
        _glBufferSubData: _glBufferSubData,
        _glClear: _glClear,
        _glClearColor: _glClearColor,
        _glClearDepthf: _glClearDepthf,
        _glClearStencil: _glClearStencil,
        _glColorMask: _glColorMask,
        _glCompileShader: _glCompileShader,
        _glCompressedTexSubImage2D: _glCompressedTexSubImage2D,
        _glCompressedTexSubImage3D: _glCompressedTexSubImage3D,
        _glCreateProgram: _glCreateProgram,
        _glCreateShader: _glCreateShader,
        _glCullFace: _glCullFace,
        _glDeleteBuffers: _glDeleteBuffers,
        _glDeleteFramebuffers: _glDeleteFramebuffers,
        _glDeleteProgram: _glDeleteProgram,
        _glDeleteRenderbuffers: _glDeleteRenderbuffers,
        _glDeleteSamplers: _glDeleteSamplers,
        _glDeleteShader: _glDeleteShader,
        _glDeleteSync: _glDeleteSync,
        _glDeleteTextures: _glDeleteTextures,
        _glDeleteVertexArrays: _glDeleteVertexArrays,
        _glDepthFunc: _glDepthFunc,
        _glDepthMask: _glDepthMask,
        _glDetachShader: _glDetachShader,
        _glDisable: _glDisable,
        _glDisableVertexAttribArray: _glDisableVertexAttribArray,
        _glDrawArrays: _glDrawArrays,
        _glDrawElements: _glDrawElements,
        _glDrawRangeElements: _glDrawRangeElements,
        _glEnable: _glEnable,
        _glEnableVertexAttribArray: _glEnableVertexAttribArray,
        _glFenceSync: _glFenceSync,
        _glFlush: _glFlush,
        _glFramebufferRenderbuffer: _glFramebufferRenderbuffer,
        _glFramebufferTexture2D: _glFramebufferTexture2D,
        _glFramebufferTextureLayer: _glFramebufferTextureLayer,
        _glFrontFace: _glFrontFace,
        _glGenBuffers: _glGenBuffers,
        _glGenFramebuffers: _glGenFramebuffers,
        _glGenRenderbuffers: _glGenRenderbuffers,
        _glGenSamplers: _glGenSamplers,
        _glGenTextures: _glGenTextures,
        _glGenVertexArrays: _glGenVertexArrays,
        _glGenerateMipmap: _glGenerateMipmap,
        _glGetError: _glGetError,
        _glGetFloatv: _glGetFloatv,
        _glGetIntegerv: _glGetIntegerv,
        _glGetProgramInfoLog: _glGetProgramInfoLog,
        _glGetProgramiv: _glGetProgramiv,
        _glGetShaderInfoLog: _glGetShaderInfoLog,
        _glGetShaderiv: _glGetShaderiv,
        _glGetString: _glGetString,
        _glGetStringi: _glGetStringi,
        _glGetUniformBlockIndex: _glGetUniformBlockIndex,
        _glGetUniformLocation: _glGetUniformLocation,
        _glGetVertexAttribiv: _glGetVertexAttribiv,
        _glHint: _glHint,
        _glInvalidateFramebuffer: _glInvalidateFramebuffer,
        _glInvalidateSubFramebuffer: _glInvalidateSubFramebuffer,
        _glIsEnabled: _glIsEnabled,
        _glLinkProgram: _glLinkProgram,
        _glPixelStorei: _glPixelStorei,
        _glPolygonOffset: _glPolygonOffset,
        _glReadPixels: _glReadPixels,
        _glRenderbufferStorage: _glRenderbufferStorage,
        _glRenderbufferStorageMultisample: _glRenderbufferStorageMultisample,
        _glSamplerParameteri: _glSamplerParameteri,
        _glScissor: _glScissor,
        _glShaderSource: _glShaderSource,
        _glTexParameteri: _glTexParameteri,
        _glTexStorage2D: _glTexStorage2D,
        _glTexStorage2DMultisample: _glTexStorage2DMultisample,
        _glTexStorage3D: _glTexStorage3D,
        _glTexSubImage2D: _glTexSubImage2D,
        _glTexSubImage3D: _glTexSubImage3D,
        _glUniform1f: _glUniform1f,
        _glUniform1i: _glUniform1i,
        _glUniform4f: _glUniform4f,
        _glUniformBlockBinding: _glUniformBlockBinding,
        _glUseProgram: _glUseProgram,
        _glVertexAttribIPointer: _glVertexAttribIPointer,
        _glVertexAttribPointer: _glVertexAttribPointer,
        _glViewport: _glViewport,
        _glWaitSync: _glWaitSync,
        _llvm_exp2_f32: _llvm_exp2_f32,
        _llvm_exp2_f64: _llvm_exp2_f64,
        _llvm_log2_f32: _llvm_log2_f32,
        _llvm_trap: _llvm_trap,
        _pthread_cond_destroy: _pthread_cond_destroy,
        _pthread_cond_signal: _pthread_cond_signal,
        _pthread_cond_timedwait: _pthread_cond_timedwait,
        _pthread_cond_wait: _pthread_cond_wait,
        _pthread_create: _pthread_create,
        _pthread_join: _pthread_join,
        _sysconf: _sysconf,
        abortOnCannotGrowMemory: abortOnCannotGrowMemory,
        constNoSmartPtrRawPointerToWireType: constNoSmartPtrRawPointerToWireType,
        count_emval_handles: count_emval_handles,
        craftInvokerFunction: craftInvokerFunction,
        createNamedFunction: createNamedFunction,
        downcastPointer: downcastPointer,
        embind__requireFunction: embind__requireFunction,
        embind_init_charCodes: embind_init_charCodes,
        emscriptenWebGLGet: emscriptenWebGLGet,
        emscriptenWebGLGetIndexed: emscriptenWebGLGetIndexed,
        emscriptenWebGLGetTexPixelData: emscriptenWebGLGetTexPixelData,
        emscriptenWebGLGetUniform: emscriptenWebGLGetUniform,
        emscriptenWebGLGetVertexAttrib: emscriptenWebGLGetVertexAttrib,
        emscripten_realloc_buffer: emscripten_realloc_buffer,
        ensureOverloadTable: ensureOverloadTable,
        enumReadValueFromPointer: enumReadValueFromPointer,
        exposePublicSymbol: exposePublicSymbol,
        extendError: extendError,
        floatReadValueFromPointer: floatReadValueFromPointer,
        flushPendingDeletes: flushPendingDeletes,
        genericPointerToWireType: genericPointerToWireType,
        getBasestPointer: getBasestPointer,
        getInheritedInstance: getInheritedInstance,
        getInheritedInstanceCount: getInheritedInstanceCount,
        getLiveInheritedInstances: getLiveInheritedInstances,
        getShiftFromSize: getShiftFromSize,
        getStringOrSymbol: getStringOrSymbol,
        getTypeName: getTypeName,
        get_first_emval: get_first_emval,
        heap32VectorToArray: heap32VectorToArray,
        init_ClassHandle: init_ClassHandle,
        init_RegisteredPointer: init_RegisteredPointer,
        init_embind: init_embind,
        init_emval: init_emval,
        integerReadValueFromPointer: integerReadValueFromPointer,
        makeClassHandle: makeClassHandle,
        makeLegalFunctionName: makeLegalFunctionName,
        new_: new_,
        nonConstNoSmartPtrRawPointerToWireType: nonConstNoSmartPtrRawPointerToWireType,
        readLatin1String: readLatin1String,
        registerType: registerType,
        replacePublicSymbol: replacePublicSymbol,
        requireHandle: requireHandle,
        requireRegisteredType: requireRegisteredType,
        runDestructor: runDestructor,
        runDestructors: runDestructors,
        setDelayFunction: setDelayFunction,
        shallowCopyInternalPointer: shallowCopyInternalPointer,
        simpleReadValueFromPointer: simpleReadValueFromPointer,
        stringToNewUTF8: stringToNewUTF8,
        throwBindingError: throwBindingError,
        throwInstanceAlreadyDeleted: throwInstanceAlreadyDeleted,
        throwInternalError: throwInternalError,
        throwUnboundTypeError: throwUnboundTypeError,
        upcastPointer: upcastPointer,
        validateThis: validateThis,
        whenDependentTypesAreResolved: whenDependentTypesAreResolved,
        tempDoublePtr: tempDoublePtr,
        DYNAMICTOP_PTR: DYNAMICTOP_PTR
    };
    var asm = Module["asm"](asmGlobalArg, asmLibraryArg, buffer);
    Module["asm"] = asm;
    var ___errno_location = (Module["___errno_location"] = function() {
        return Module["asm"]["___errno_location"].apply(null, arguments);
    });
    var ___getTypeName = (Module["___getTypeName"] = function() {
        return Module["asm"]["___getTypeName"].apply(null, arguments);
    });
    var _emscripten_GetProcAddress = (Module["_emscripten_GetProcAddress"] = function() {
        return Module["asm"]["_emscripten_GetProcAddress"].apply(null, arguments);
    });
    var _emscripten_replace_memory = (Module["_emscripten_replace_memory"] = function() {
        return Module["asm"]["_emscripten_replace_memory"].apply(null, arguments);
    });
    var _free = (Module["_free"] = function() {
        return Module["asm"]["_free"].apply(null, arguments);
    });
    var _i64Subtract = (Module["_i64Subtract"] = function() {
        return Module["asm"]["_i64Subtract"].apply(null, arguments);
    });
    var _llvm_round_f32 = (Module["_llvm_round_f32"] = function() {
        return Module["asm"]["_llvm_round_f32"].apply(null, arguments);
    });
    var _malloc = (Module["_malloc"] = function() {
        return Module["asm"]["_malloc"].apply(null, arguments);
    });
    var _memcpy = (Module["_memcpy"] = function() {
        return Module["asm"]["_memcpy"].apply(null, arguments);
    });
    var _memmove = (Module["_memmove"] = function() {
        return Module["asm"]["_memmove"].apply(null, arguments);
    });
    var _memset = (Module["_memset"] = function() {
        return Module["asm"]["_memset"].apply(null, arguments);
    });
    var _pthread_cond_broadcast = (Module["_pthread_cond_broadcast"] = function() {
        return Module["asm"]["_pthread_cond_broadcast"].apply(null, arguments);
    });
    var _sbrk = (Module["_sbrk"] = function() {
        return Module["asm"]["_sbrk"].apply(null, arguments);
    });
    var _strstr = (Module["_strstr"] = function() {
        return Module["asm"]["_strstr"].apply(null, arguments);
    });
    var establishStackSpace = (Module["establishStackSpace"] = function() {
        return Module["asm"]["establishStackSpace"].apply(null, arguments);
    });
    var globalCtors = (Module["globalCtors"] = function() {
        return Module["asm"]["globalCtors"].apply(null, arguments);
    });
    var stackAlloc = (Module["stackAlloc"] = function() {
        return Module["asm"]["stackAlloc"].apply(null, arguments);
    });
    var stackRestore = (Module["stackRestore"] = function() {
        return Module["asm"]["stackRestore"].apply(null, arguments);
    });
    var stackSave = (Module["stackSave"] = function() {
        return Module["asm"]["stackSave"].apply(null, arguments);
    });
    var dynCall_dii = (Module["dynCall_dii"] = function() {
        return Module["asm"]["dynCall_dii"].apply(null, arguments);
    });
    var dynCall_fi = (Module["dynCall_fi"] = function() {
        return Module["asm"]["dynCall_fi"].apply(null, arguments);
    });
    var dynCall_fii = (Module["dynCall_fii"] = function() {
        return Module["asm"]["dynCall_fii"].apply(null, arguments);
    });
    var dynCall_fiii = (Module["dynCall_fiii"] = function() {
        return Module["asm"]["dynCall_fiii"].apply(null, arguments);
    });
    var dynCall_i = (Module["dynCall_i"] = function() {
        return Module["asm"]["dynCall_i"].apply(null, arguments);
    });
    var dynCall_ii = (Module["dynCall_ii"] = function() {
        return Module["asm"]["dynCall_ii"].apply(null, arguments);
    });
    var dynCall_iif = (Module["dynCall_iif"] = function() {
        return Module["asm"]["dynCall_iif"].apply(null, arguments);
    });
    var dynCall_iiff = (Module["dynCall_iiff"] = function() {
        return Module["asm"]["dynCall_iiff"].apply(null, arguments);
    });
    var dynCall_iii = (Module["dynCall_iii"] = function() {
        return Module["asm"]["dynCall_iii"].apply(null, arguments);
    });
    var dynCall_iiif = (Module["dynCall_iiif"] = function() {
        return Module["asm"]["dynCall_iiif"].apply(null, arguments);
    });
    var dynCall_iiiff = (Module["dynCall_iiiff"] = function() {
        return Module["asm"]["dynCall_iiiff"].apply(null, arguments);
    });
    var dynCall_iiii = (Module["dynCall_iiii"] = function() {
        return Module["asm"]["dynCall_iiii"].apply(null, arguments);
    });
    var dynCall_iiiii = (Module["dynCall_iiiii"] = function() {
        return Module["asm"]["dynCall_iiiii"].apply(null, arguments);
    });
    var dynCall_iiiiii = (Module["dynCall_iiiiii"] = function() {
        return Module["asm"]["dynCall_iiiiii"].apply(null, arguments);
    });
    var dynCall_iiiiiii = (Module["dynCall_iiiiiii"] = function() {
        return Module["asm"]["dynCall_iiiiiii"].apply(null, arguments);
    });
    var dynCall_iiiiiiii = (Module["dynCall_iiiiiiii"] = function() {
        return Module["asm"]["dynCall_iiiiiiii"].apply(null, arguments);
    });
    var dynCall_iiij = (Module["dynCall_iiij"] = function() {
        return Module["asm"]["dynCall_iiij"].apply(null, arguments);
    });
    var dynCall_jii = (Module["dynCall_jii"] = function() {
        return Module["asm"]["dynCall_jii"].apply(null, arguments);
    });
    var dynCall_v = (Module["dynCall_v"] = function() {
        return Module["asm"]["dynCall_v"].apply(null, arguments);
    });
    var dynCall_vf = (Module["dynCall_vf"] = function() {
        return Module["asm"]["dynCall_vf"].apply(null, arguments);
    });
    var dynCall_vff = (Module["dynCall_vff"] = function() {
        return Module["asm"]["dynCall_vff"].apply(null, arguments);
    });
    var dynCall_vffff = (Module["dynCall_vffff"] = function() {
        return Module["asm"]["dynCall_vffff"].apply(null, arguments);
    });
    var dynCall_vfi = (Module["dynCall_vfi"] = function() {
        return Module["asm"]["dynCall_vfi"].apply(null, arguments);
    });
    var dynCall_vi = (Module["dynCall_vi"] = function() {
        return Module["asm"]["dynCall_vi"].apply(null, arguments);
    });
    var dynCall_viddd = (Module["dynCall_viddd"] = function() {
        return Module["asm"]["dynCall_viddd"].apply(null, arguments);
    });
    var dynCall_viddddi = (Module["dynCall_viddddi"] = function() {
        return Module["asm"]["dynCall_viddddi"].apply(null, arguments);
    });
    var dynCall_vif = (Module["dynCall_vif"] = function() {
        return Module["asm"]["dynCall_vif"].apply(null, arguments);
    });
    var dynCall_viff = (Module["dynCall_viff"] = function() {
        return Module["asm"]["dynCall_viff"].apply(null, arguments);
    });
    var dynCall_vifff = (Module["dynCall_vifff"] = function() {
        return Module["asm"]["dynCall_vifff"].apply(null, arguments);
    });
    var dynCall_viffff = (Module["dynCall_viffff"] = function() {
        return Module["asm"]["dynCall_viffff"].apply(null, arguments);
    });
    var dynCall_vii = (Module["dynCall_vii"] = function() {
        return Module["asm"]["dynCall_vii"].apply(null, arguments);
    });
    var dynCall_viid = (Module["dynCall_viid"] = function() {
        return Module["asm"]["dynCall_viid"].apply(null, arguments);
    });
    var dynCall_viidd = (Module["dynCall_viidd"] = function() {
        return Module["asm"]["dynCall_viidd"].apply(null, arguments);
    });
    var dynCall_viiddd = (Module["dynCall_viiddd"] = function() {
        return Module["asm"]["dynCall_viiddd"].apply(null, arguments);
    });
    var dynCall_viidddddd = (Module["dynCall_viidddddd"] = function() {
        return Module["asm"]["dynCall_viidddddd"].apply(null, arguments);
    });
    var dynCall_viiddddi = (Module["dynCall_viiddddi"] = function() {
        return Module["asm"]["dynCall_viiddddi"].apply(null, arguments);
    });
    var dynCall_viif = (Module["dynCall_viif"] = function() {
        return Module["asm"]["dynCall_viif"].apply(null, arguments);
    });
    var dynCall_viiff = (Module["dynCall_viiff"] = function() {
        return Module["asm"]["dynCall_viiff"].apply(null, arguments);
    });
    var dynCall_viifff = (Module["dynCall_viifff"] = function() {
        return Module["asm"]["dynCall_viifff"].apply(null, arguments);
    });
    var dynCall_viifi = (Module["dynCall_viifi"] = function() {
        return Module["asm"]["dynCall_viifi"].apply(null, arguments);
    });
    var dynCall_viii = (Module["dynCall_viii"] = function() {
        return Module["asm"]["dynCall_viii"].apply(null, arguments);
    });
    var dynCall_viiidd = (Module["dynCall_viiidd"] = function() {
        return Module["asm"]["dynCall_viiidd"].apply(null, arguments);
    });
    var dynCall_viiidddddd = (Module["dynCall_viiidddddd"] = function() {
        return Module["asm"]["dynCall_viiidddddd"].apply(null, arguments);
    });
    var dynCall_viiif = (Module["dynCall_viiif"] = function() {
        return Module["asm"]["dynCall_viiif"].apply(null, arguments);
    });
    var dynCall_viiii = (Module["dynCall_viiii"] = function() {
        return Module["asm"]["dynCall_viiii"].apply(null, arguments);
    });
    var dynCall_viiiii = (Module["dynCall_viiiii"] = function() {
        return Module["asm"]["dynCall_viiiii"].apply(null, arguments);
    });
    var dynCall_viiiiii = (Module["dynCall_viiiiii"] = function() {
        return Module["asm"]["dynCall_viiiiii"].apply(null, arguments);
    });
    var dynCall_viiiiiii = (Module["dynCall_viiiiiii"] = function() {
        return Module["asm"]["dynCall_viiiiiii"].apply(null, arguments);
    });
    var dynCall_viiiiiiii = (Module["dynCall_viiiiiiii"] = function() {
        return Module["asm"]["dynCall_viiiiiiii"].apply(null, arguments);
    });
    var dynCall_viiiiiiiii = (Module["dynCall_viiiiiiiii"] = function() {
        return Module["asm"]["dynCall_viiiiiiiii"].apply(null, arguments);
    });
    var dynCall_viiiiiiiiii = (Module["dynCall_viiiiiiiiii"] = function() {
        return Module["asm"]["dynCall_viiiiiiiiii"].apply(null, arguments);
    });
    var dynCall_viiiiiiiiiii = (Module["dynCall_viiiiiiiiiii"] = function() {
        return Module["asm"]["dynCall_viiiiiiiiiii"].apply(null, arguments);
    });
    var dynCall_viij = (Module["dynCall_viij"] = function() {
        return Module["asm"]["dynCall_viij"].apply(null, arguments);
    });
    var dynCall_vij = (Module["dynCall_vij"] = function() {
        return Module["asm"]["dynCall_vij"].apply(null, arguments);
    });
    Module["asm"] = asm;
    function ExitStatus(status) {
        this.name = "ExitStatus";
        this.message = "Program terminated with exit(" + status + ")";
        this.status = status;
    }
    ExitStatus.prototype = new Error();
    ExitStatus.prototype.constructor = ExitStatus;
    dependenciesFulfilled = function runCaller() {
        if (!Module["calledRun"]) run();
        if (!Module["calledRun"]) dependenciesFulfilled = runCaller;
    };
    function run(args) {
        args = args || Module["arguments"];
        if (runDependencies > 0) {
            return;
        }
        preRun();
        if (runDependencies > 0) return;
        if (Module["calledRun"]) return;
        function doRun() {
            if (Module["calledRun"]) return;
            Module["calledRun"] = true;
            if (ABORT) return;
            ensureInitRuntime();
            preMain();
            if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
            postRun();
        }
        if (Module["setStatus"]) {
            Module["setStatus"]("Running...");
            setTimeout(function() {
                setTimeout(function() {
                    Module["setStatus"]("");
                }, 1);
                doRun();
            }, 1);
        } else {
            doRun();
        }
    }
    Module["run"] = run;
    function abort(what) {
        if (Module["onAbort"]) {
            Module["onAbort"](what);
        }
        if (what !== undefined) {
            out(what);
            err(what);
            what = JSON.stringify(what);
        } else {
            what = "";
        }
        ABORT = true;
        EXITSTATUS = 1;
        throw "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
    }
    Module["abort"] = abort;
    if (Module["preInit"]) {
        if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
        while (Module["preInit"].length > 0) {
            Module["preInit"].pop()();
        }
    }
    Module["noExitRuntime"] = true;
    run();
    Filament.remainingInitializationTasks = 1;
    Filament.init = function(assets, onready) {
        Filament.onReady = onready;
        Filament.remainingInitializationTasks += assets.length;
        Filament.assets = {};
        if (typeof glMatrix !== "undefined") {
            Filament.loadMathExtensions();
        }
        Filament.fetch(assets, null, function(name) {
            if (--Filament.remainingInitializationTasks == 0 && Filament.onReady) {
                Filament.onReady();
            }
        });
    };
    Filament.postRun = function() {
        Filament.loadClassExtensions();
        if (--Filament.remainingInitializationTasks == 0 && Filament.onReady) {
            Filament.onReady();
        }
    };
    Filament.fetch = function(assets, onDone, onFetched) {
        var remainingAssets = assets.length;
        assets.forEach(function(name) {
            const lower = name.toLowerCase();
            if (lower.endsWith(".jpeg") || lower.endsWith(".jpg")) {
                var img = new Image();
                img.src = name;
                img.decoding = "async";
                img.onload = function() {
                    Filament.assets[name] = img;
                    if (onFetched) {
                        onFetched(name);
                    }
                    if (--remainingAssets === 0 && onDone) {
                        onDone();
                    }
                };
                return;
            }
            fetch(name)
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error(name);
                    }
                    return response.arrayBuffer();
                })
                .then(function(arrayBuffer) {
                    Filament.assets[name] = new Uint8Array(arrayBuffer);
                    if (onFetched) {
                        onFetched(name);
                    }
                    if (--remainingAssets === 0 && onDone) {
                        onDone();
                    }
                });
        });
    };
    function getBufferDescriptor(buffer) {
        if ("string" == typeof buffer || buffer instanceof String) {
            buffer = Filament.assets[buffer];
        }
        if (buffer.buffer instanceof ArrayBuffer) {
            buffer = Filament.Buffer(buffer);
        }
        return buffer;
    }
    Filament.loadClassExtensions = function() {
        Filament.Engine.create = function(canvas, options) {
            const defaults = { majorVersion: 2, minorVersion: 0, antialias: false, depth: false, alpha: false };
            options = Object.assign(defaults, options);
            const ctx = canvas.getContext("webgl2", options);
            const handle = GL.registerContext(ctx, options);
            GL.makeContextCurrent(handle);
            ctx.getExtension("WEBGL_compressed_texture_s3tc");
            ctx.getExtension("WEBGL_compressed_texture_astc");
            ctx.getExtension("WEBGL_compressed_texture_etc");
            return Filament.Engine._create();
        };
        Filament.Engine.prototype.createMaterial = function(buffer) {
            buffer = getBufferDescriptor(buffer);
            const result = this._createMaterial(buffer);
            buffer.delete();
            return result;
        };
        Filament.Engine.prototype.createTextureFromKtx = function(buffer, options) {
            buffer = getBufferDescriptor(buffer);
            const result = Filament._createTextureFromKtx(buffer, this, options);
            buffer.delete();
            return result;
        };
        Filament.Engine.prototype.createIblFromKtx = function(buffer, options) {
            buffer = getBufferDescriptor(buffer);
            const result = Filament._createIblFromKtx(buffer, this, options);
            buffer.delete();
            return result;
        };
        Filament.Engine.prototype.createSkyFromKtx = function(buffer, options) {
            const skytex = this.createTextureFromKtx(buffer, options);
            return Filament.Skybox.Builder()
                .environment(skytex)
                .build(this);
        };
        Filament.Engine.prototype.createTextureFromPng = function(buffer, options) {
            buffer = getBufferDescriptor(buffer);
            const result = Filament._createTextureFromPng(buffer, this, options);
            buffer.delete();
            return result;
        };
        Filament.Engine.prototype.createTextureFromJpeg = function(image, options) {
            options = options || {};
            if ("string" == typeof image || image instanceof String) {
                image = Filament.assets[image];
            }
            return Filament._createTextureFromJpeg(image, this, options);
        };
        Filament.Engine.prototype.loadFilamesh = function(buffer, definstance, matinstances) {
            buffer = getBufferDescriptor(buffer);
            const result = Filament._loadFilamesh(this, buffer, definstance, matinstances);
            buffer.delete();
            return result;
        };
        Filament.Engine.prototype.createAssetLoader = function() {
            const materials = new Filament.gltfio$UbershaderLoader(this);
            return new Filament.gltfio$AssetLoader(this, materials);
        };
        Filament.VertexBuffer.prototype.setBufferAt = function(engine, bufferIndex, buffer) {
            buffer = getBufferDescriptor(buffer);
            this._setBufferAt(engine, bufferIndex, buffer);
            buffer.delete();
        };
        Filament.IndexBuffer.prototype.setBuffer = function(engine, buffer) {
            buffer = getBufferDescriptor(buffer);
            this._setBuffer(engine, buffer);
            buffer.delete();
        };
        Filament.RenderableManager$Builder.prototype.build = Filament.LightManager$Builder.prototype.build = function(
            engine,
            entity
        ) {
            const result = this._build(engine, entity);
            this.delete();
            return result;
        };
        Filament.RenderTarget$Builder.prototype.build = Filament.VertexBuffer$Builder.prototype.build = Filament.IndexBuffer$Builder.prototype.build = Filament.Texture$Builder.prototype.build = Filament.IndirectLight$Builder.prototype.build = Filament.Skybox$Builder.prototype.build = function(
            engine
        ) {
            const result = this._build(engine);
            this.delete();
            return result;
        };
        Filament.KtxBundle.prototype.getBlob = function(index) {
            const blob = this._getBlob(index);
            const result = blob.getBytes();
            blob.delete();
            return result;
        };
        Filament.KtxBundle.prototype.getCubeBlob = function(miplevel) {
            const blob = this._getCubeBlob(miplevel);
            const result = blob.getBytes();
            blob.delete();
            return result;
        };
        Filament.Texture.prototype.setImage = function(engine, level, pbd) {
            this._setImage(engine, level, pbd);
            pbd.delete();
        };
        Filament.Texture.prototype.setImageCube = function(engine, level, pbd) {
            this._setImageCube(engine, level, pbd);
            pbd.delete();
        };
        Filament.SurfaceOrientation$Builder.prototype.build = function() {
            const result = this._build();
            this.delete();
            return result;
        };
        Filament.gltfio$AssetLoader.prototype.createAssetFromJson = function(buffer) {
            if ("string" == typeof buffer && buffer.endsWith(".glb")) {
                console.error("Please use createAssetFromBinary for glb files.");
            }
            buffer = getBufferDescriptor(buffer);
            const result = this._createAssetFromJson(buffer);
            buffer.delete();
            return result;
        };
        Filament.gltfio$AssetLoader.prototype.createAssetFromBinary = function(buffer) {
            if ("string" == typeof buffer && buffer.endsWith(".gltf")) {
                console.error("Please use createAssetFromJson for gltf files.");
            }
            buffer = getBufferDescriptor(buffer);
            const result = this._createAssetFromBinary(buffer);
            buffer.delete();
            return result;
        };
        Filament.gltfio$FilamentAsset.prototype.loadResources = function(onDone, onFetched) {
            const asset = this;
            const engine = this.getEngine();
            const urlkeys = this.getResourceUrls();
            const urlset = new Set();
            for (var i = 0; i < urlkeys.size(); i++) {
                const url = urlkeys.get(i);
                if (url) {
                    urlset.add(url);
                }
            }
            const resourceLoader = new Filament.gltfio$ResourceLoader(engine);
            const onComplete = function() {
                const finalize = function() {
                    resourceLoader.loadResources(asset);
                    window.requestAnimationFrame(function() {
                        window.requestAnimationFrame(function() {
                            resourceLoader.delete();
                        });
                    });
                };
                if (onDone) {
                    onDone(finalize);
                } else {
                    finalize();
                }
            };
            if (urlset.size == 0) {
                onComplete();
                return;
            }
            Filament.fetch(Array.from(urlset), onComplete, function(name) {
                var buffer = getBufferDescriptor(name);
                resourceLoader.addResourceData(name, buffer);
                buffer.delete();
                if (onFetched) {
                    onFetched(name);
                }
            });
        };
    };
    Filament.Buffer = function(typedarray) {
        console.assert(typedarray.buffer instanceof ArrayBuffer);
        console.assert(typedarray.byteLength > 0);
        if (Filament.HEAPU32.buffer == typedarray.buffer) {
            typedarray = new Uint8Array(typedarray);
        }
        const ta = typedarray;
        const bd = new Filament.driver$BufferDescriptor(ta);
        const uint8array = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
        bd.getBytes().set(uint8array);
        return bd;
    };
    Filament.PixelBuffer = function(typedarray, format, datatype) {
        console.assert(typedarray.buffer instanceof ArrayBuffer);
        console.assert(typedarray.byteLength > 0);
        if (Filament.HEAPU32.buffer == typedarray.buffer) {
            typedarray = new Uint8Array(typedarray);
        }
        const ta = typedarray;
        const bd = new Filament.driver$PixelBufferDescriptor(ta, format, datatype);
        const uint8array = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
        bd.getBytes().set(uint8array);
        return bd;
    };
    Filament.CompressedPixelBuffer = function(typedarray, cdatatype, faceSize) {
        console.assert(typedarray.buffer instanceof ArrayBuffer);
        console.assert(typedarray.byteLength > 0);
        faceSize = faceSize || typedarray.byteLength;
        if (Filament.HEAPU32.buffer == typedarray.buffer) {
            typedarray = new Uint8Array(typedarray);
        }
        const ta = typedarray;
        const bd = new Filament.driver$PixelBufferDescriptor(ta, cdatatype, faceSize, true);
        const uint8array = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
        bd.getBytes().set(uint8array);
        return bd;
    };
    Filament._loadFilamesh = function(engine, buffer, definstance, matinstances) {
        matinstances = matinstances || {};
        const registry = new Filament.MeshReader$MaterialRegistry();
        for (var key in matinstances) {
            registry.set(key, matinstances[key]);
        }
        if (definstance) {
            registry.set("DefaultMaterial", definstance);
        }
        const mesh = Filament.MeshReader.loadMeshFromBuffer(engine, buffer, registry);
        const keys = registry.keys();
        for (var i = 0; i < keys.size(); i++) {
            const key = keys.get(i);
            const minstance = registry.get(key);
            matinstances[key] = minstance;
        }
        return { renderable: mesh.renderable(), vertexBuffer: mesh.vertexBuffer(), indexBuffer: mesh.indexBuffer() };
    };
    Filament.IcoSphere = function(nsubdivs) {
        const X = 0.5257311121191336;
        const Z = 0.8506508083520399;
        const N = 0;
        this.vertices = new Float32Array([
            -X,
            +N,
            +Z,
            +X,
            +N,
            +Z,
            -X,
            +N,
            -Z,
            +X,
            +N,
            -Z,
            +N,
            +Z,
            +X,
            +N,
            +Z,
            -X,
            +N,
            -Z,
            +X,
            +N,
            -Z,
            -X,
            +Z,
            +X,
            +N,
            -Z,
            +X,
            +N,
            +Z,
            -X,
            +N,
            -Z,
            -X,
            +N
        ]);
        this.triangles = new Uint16Array([
            1,
            4,
            0,
            4,
            9,
            0,
            4,
            5,
            9,
            8,
            5,
            4,
            1,
            8,
            4,
            1,
            10,
            8,
            10,
            3,
            8,
            8,
            3,
            5,
            3,
            2,
            5,
            3,
            7,
            2,
            3,
            10,
            7,
            10,
            6,
            7,
            6,
            11,
            7,
            6,
            0,
            11,
            6,
            1,
            0,
            10,
            1,
            6,
            11,
            0,
            9,
            2,
            11,
            9,
            5,
            2,
            9,
            11,
            2,
            7
        ]);
        if (nsubdivs) {
            while (nsubdivs-- > 0) {
                this.subdivide();
            }
        }
        const nverts = this.vertices.length / 3;
        const normals = Filament._malloc(this.vertices.length * this.vertices.BYTES_PER_ELEMENT);
        Module.HEAPU8.set(new Uint8Array(this.vertices.buffer), normals);
        const sob = new Filament.SurfaceOrientation$Builder();
        sob.vertexCount(nverts);
        sob.normals(normals, 0);
        const orientation = sob.build();
        Filament._free(normals);
        const quatsBufferSize = 8 * nverts;
        const quatsBuffer = Filament._malloc(quatsBufferSize);
        orientation.getQuats(quatsBuffer, nverts, Filament.VertexBuffer$AttributeType.SHORT4);
        const tangentsMemory = Module.HEAPU8.subarray(quatsBuffer, quatsBuffer + quatsBufferSize).slice().buffer;
        Filament._free(quatsBuffer);
        this.tangents = new Int16Array(tangentsMemory);
        orientation.delete();
    };
    Filament.IcoSphere.prototype.subdivide = function() {
        const srctris = this.triangles;
        const srcverts = this.vertices;
        const nsrctris = srctris.length / 3;
        const ndsttris = nsrctris * 4;
        const nsrcverts = srcverts.length / 3;
        const ndstverts = nsrcverts + nsrctris * 3;
        const dsttris = new Uint16Array(ndsttris * 3);
        const dstverts = new Float32Array(ndstverts * 3);
        dstverts.set(srcverts);
        var srcind = 0,
            dstind = 0,
            i3 = nsrcverts * 3,
            i4 = i3 + 3,
            i5 = i4 + 3;
        for (var tri = 0; tri < nsrctris; tri++, i3 += 9, i4 += 9, i5 += 9) {
            const i0 = srctris[srcind++] * 3;
            const i1 = srctris[srcind++] * 3;
            const i2 = srctris[srcind++] * 3;
            const v0 = srcverts.subarray(i0, i0 + 3);
            const v1 = srcverts.subarray(i1, i1 + 3);
            const v2 = srcverts.subarray(i2, i2 + 3);
            const v3 = dstverts.subarray(i3, i3 + 3);
            const v4 = dstverts.subarray(i4, i4 + 3);
            const v5 = dstverts.subarray(i5, i5 + 3);
            vec3.normalize(v3, vec3.add(v3, v0, v1));
            vec3.normalize(v4, vec3.add(v4, v1, v2));
            vec3.normalize(v5, vec3.add(v5, v2, v0));
            dsttris[dstind++] = i0 / 3;
            dsttris[dstind++] = i3 / 3;
            dsttris[dstind++] = i5 / 3;
            dsttris[dstind++] = i3 / 3;
            dsttris[dstind++] = i1 / 3;
            dsttris[dstind++] = i4 / 3;
            dsttris[dstind++] = i5 / 3;
            dsttris[dstind++] = i3 / 3;
            dsttris[dstind++] = i4 / 3;
            dsttris[dstind++] = i2 / 3;
            dsttris[dstind++] = i5 / 3;
            dsttris[dstind++] = i4 / 3;
        }
        this.triangles = dsttris;
        this.vertices = dstverts;
    };
    function clamp(v, least, most) {
        return Math.max(Math.min(most, v), least);
    }
    Filament.packSnorm16 = function(value) {
        return Math.round(clamp(value, -1, 1) * 32767);
    };
    Filament.loadMathExtensions = function() {
        vec4.packSnorm16 = function(out, src) {
            out[0] = Filament.packSnorm16(src[0]);
            out[1] = Filament.packSnorm16(src[1]);
            out[2] = Filament.packSnorm16(src[2]);
            out[3] = Filament.packSnorm16(src[3]);
            return out;
        };
        const fromRotationZ = mat3.fromRotation;
        mat3.fromRotation = function(out, radians, axis) {
            if (axis) {
                return mat3.fromMat4(out, mat4.fromRotation(mat4.create(), radians, axis));
            }
            return fromRotationZ(out, radians);
        };
    };
    Filament._createTextureFromKtx = function(ktxdata, engine, options) {
        options = options || {};
        const ktx = options["ktx"] || new Filament.KtxBundle(ktxdata);
        const srgb = !!options["srgb"];
        return Filament.KtxUtility$createTexture(engine, ktx, srgb);
    };
    Filament._createIblFromKtx = function(ktxdata, engine, options) {
        options = options || {};
        const iblktx = (options["ktx"] = new Filament.KtxBundle(ktxdata));
        const format = iblktx.info().glInternalFormat;
        if (format != this.ctx.R11F_G11F_B10F && format != this.ctx.RGB16F && format != this.ctx.RGB32F) {
            console.warn(
                "IBL texture format is 0x" +
                    format.toString(16) +
                    " which is not an expected floating-point format. Please use cmgen to generate IBL."
            );
        }
        const ibltex = Filament._createTextureFromKtx(ktxdata, engine, options);
        const shstring = iblktx.getMetadata("sh");
        const shfloats = shstring.split(/\s/, 9 * 3).map(parseFloat);
        return Filament.IndirectLight.Builder()
            .reflections(ibltex)
            .irradianceSh(3, shfloats)
            .build(engine);
    };
    Filament._createTextureFromPng = function(pngdata, engine, options) {
        const Sampler = Filament.Texture$Sampler;
        const TextureFormat = Filament.Texture$InternalFormat;
        const PixelDataFormat = Filament.PixelDataFormat;
        options = options || {};
        const srgb = !!options["srgb"];
        const noalpha = !!options["noalpha"];
        const nomips = !!options["nomips"];
        const decodedpng = Filament.decodePng(pngdata, noalpha ? 3 : 4);
        var texformat, pbformat, pbtype;
        if (noalpha) {
            texformat = srgb ? TextureFormat.SRGB8 : TextureFormat.RGB8;
            pbformat = PixelDataFormat.RGB;
            pbtype = Filament.PixelDataType.UBYTE;
        } else {
            texformat = srgb ? TextureFormat.SRGB8_A8 : TextureFormat.RGBA8;
            pbformat = PixelDataFormat.RGBA;
            pbtype = Filament.PixelDataType.UBYTE;
        }
        const tex = Filament.Texture.Builder()
            .width(decodedpng.width)
            .height(decodedpng.height)
            .levels(nomips ? 1 : 255)
            .sampler(Sampler.SAMPLER_2D)
            .format(texformat)
            .build(engine);
        const pixelbuffer = Filament.PixelBuffer(decodedpng.data.getBytes(), pbformat, pbtype);
        tex.setImage(engine, 0, pixelbuffer);
        if (!nomips) {
            tex.generateMipmaps(engine);
        }
        return tex;
    };
    Filament._createTextureFromJpeg = function(image, engine, options) {
        options = options || {};
        const srgb = !!options["srgb"];
        const nomips = !!options["nomips"];
        var context2d = document.createElement("canvas").getContext("2d");
        context2d.canvas.width = image.width;
        context2d.canvas.height = image.height;
        context2d.width = image.width;
        context2d.height = image.height;
        context2d.globalCompositeOperation = "copy";
        context2d.drawImage(image, 0, 0);
        var imgdata = context2d.getImageData(0, 0, image.width, image.height).data.buffer;
        var decodedjpeg = new Uint8Array(imgdata);
        const TF = Filament.Texture$InternalFormat;
        const texformat = srgb ? TF.SRGB8_A8 : TF.RGBA8;
        const pbformat = Filament.PixelDataFormat.RGBA;
        const pbtype = Filament.PixelDataType.UBYTE;
        const tex = Filament.Texture.Builder()
            .width(image.width)
            .height(image.height)
            .levels(nomips ? 1 : 255)
            .sampler(Filament.Texture$Sampler.SAMPLER_2D)
            .format(texformat)
            .build(engine);
        const pixelbuffer = Filament.PixelBuffer(decodedjpeg, pbformat, pbtype);
        tex.setImage(engine, 0, pixelbuffer);
        if (!nomips) {
            tex.generateMipmaps(engine);
        }
        return tex;
    };
    Filament.getSupportedFormats = function() {
        if (Filament.supportedFormats) {
            return Filament.supportedFormats;
        }
        const options = { majorVersion: 2, minorVersion: 0 };
        var ctx = document.createElement("canvas").getContext("webgl2", options);
        const result = { s3tc: false, astc: false, etc: false };
        var exts = ctx.getSupportedExtensions(),
            nexts = exts.length,
            i;
        for (i = 0; i < nexts; i++) {
            var ext = exts[i];
            if (ext == "WEBGL_compressed_texture_s3tc") {
                result.s3tc = true;
            } else if (ext == "WEBGL_compressed_texture_astc") {
                result.astc = true;
            } else if (ext == "WEBGL_compressed_texture_etc") {
                result.etc = true;
            }
        }
        return (Filament.supportedFormats = result);
    };
    Filament.getSupportedFormatSuffix = function(desiredFormats) {
        desiredFormats = desiredFormats.split(" ");
        var exts = Filament.getSupportedFormats();
        for (var key in exts) {
            if (exts[key] && desiredFormats.includes(key)) {
                return "_" + key;
            }
        }
        return "";
    };

    return Filament;
})(typeof Filament === "object" ? Filament : {});
if (typeof exports === "object" && typeof module === "object") module.exports = Filament;
else if (typeof define === "function" && define["amd"])
    define([], function() {
        return Filament;
    });
else if (typeof exports === "object") exports["Filament"] = Filament;
