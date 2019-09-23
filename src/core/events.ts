const _listener: any = {};
const _hooks: any = {};

interface Listener {
    scope: any;
    callback: Function;
    [propName: string]: any;
}

interface _Listener {
    [propName: string]: any;
}

interface _Hooks {
    [propName: string]: any;
}

export default class Events {
    public _listener: _Listener;
    public _hooks: _Hooks;

    public attach(target: any) {
        const ev = this;
        target.on = ev.on;
        target.fire = ev.fire;
        target.remove = ev.remove;
        target.method = ev.method;
        target.callcall = ev.call;
        target._listener = {};
        target._hooks = {};
        return target;
    }

    // 监听事件
    public on(type: string, fn: Function, scope = this) {
        const listener = this._listener || _listener;
        if (typeof listener[type] === "undefined") {
            listener[type] = [
                {
                    scope: scope,
                    callback: fn,
                },
            ];
        } else {
            // 对应scope下只能有一次监听fn
            if (
                listener[type].filter(
                    (listen: Listener) =>
                        listen.scope === scope && listen.callback === fn,
                ).length === 0
            ) {
                listener[type].push({
                    scope: scope,
                    callback: fn,
                });
            }
        }
        return this;
    }
    // 发送事件
    public fire(type: string) {
        const listener = this._listener || _listener;
        if (type && listener[type]) {
            const events = [];
            if (arguments.length > 1) {
                for (let index = 1; index < arguments.length; index++) {
                    events.push(arguments[index]);
                }
            }
            for (
                let length = listener[type].length, start = 0;
                start < length;
                start += 1
            ) {
                const listen = listener[type][start];
                listen.callback.apply(listen.scope, events);
            }
        }
        return this;
    }
    // 删除事件
    public remove(type: string, key: any, scope = this) {
        const listener = this._listener || _listener;
        const listeners = listener[type];
        if (listeners instanceof Array) {
            if (typeof key === "function") {
                for (let i = 0, length = listeners.length; i < length; i += 1) {
                    if (
                        listeners[i].callback === key &&
                        listeners[i].scope === this
                    ) {
                        listeners.splice(i, 1);
                        break;
                    }
                }
            } else if (key instanceof Array) {
                for (let lis = 0, lenkey = key.length; lis < lenkey; lis += 1) {
                    this.remove(type, key[lenkey], scope);
                }
            } else {
                delete listener[type];
            }
        }
        return this;
    }
    // 监听一个方法
    public method(name: string, fn: Function) {
        const hooks = this._hooks || _hooks;
        if (hooks[name] !== undefined) {
            throw new Error("can't override hook: " + name);
        }
        hooks[name] = fn;
    }
    // 移除一个方法
    public methodRemove(name: string) {
        const hooks = this._hooks || _hooks;
        delete hooks[name];
    }
    // 执行一个方法
    public call(name: string) {
        const hooks = this._hooks || _hooks;
        if (hooks[name]) {
            const args = Array.prototype.slice.call(arguments, 1);
            try {
                return hooks[name].apply(null, args);
            } catch (ex) {
                console.info(
                    "%c%s %c(method error)",
                    "color: #06f",
                    name,
                    "color: #f00",
                );
                console.log(ex.stack);
            }
        }
        return null;
    }
}
