import {isTracking, ReactiveEffect, trackEffects, triggerEffects} from "./effect";
import {isObject} from "./handler";
import {reactive} from "./reactive";

class RefImpl {
    private _value: any;
    // 只有一个 value,所以只会有一个deps
    private readonly deps: Set<ReactiveEffect>

    constructor(val: any) {
        // 如果val 是对象类型 需要将其转换成reactive类型
        this._value = isObject(val) ? reactive(val) : val
        this.deps = new Set()
    }

    get value() {
        if (isTracking()) {
            trackEffects(this.deps)
        }
        return this._value
    }

    set value(val) {
        this._value = val
        triggerEffects(this.deps)
    }
}

export function ref(val: any) {
    return new RefImpl(val)
}