import {track, trigger,} from "./effect";
import {isObject} from "./handler";

const enum ReactiveFlags {
    IS_REACTIVE = "__v_isReactive",
    IS_READONLY = "__v_isReadonly",
    RAW = "__v_raw",
}

function createGetter(isReadonly = false, shallow = false) {
    return function get<T extends Object>(target: T, key: symbol | string, receiver: any): any {
        if (key === ReactiveFlags.IS_REACTIVE) {//判断是否是reactive类型
            return !isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        }
        const res = Reflect.get(target, key, receiver)
        if (shallow) {
            return res
        }
        if (isObject(res)) { // 嵌套 递归的执行Reactive
            return isReadonly ? readonly(res as Object) : reactive(res as Object)
        }
        if (!isReadonly) { //如果是只读类型就不收集
            // 依赖收集
            track(target, key)
        }
        return res
    }
}

function createSetter() {
    return function set<T extends Object>(target: T, key: symbol | string, newValue: any, receiver: any) {

        let res = Reflect.set(target, key, newValue, receiver)
        // 触发依赖
        trigger(target, key)
        return res
    }
}

export function reactive<T extends Object>(raw: T) {
    return new Proxy<T>(raw, {
        get: createGetter(),
        set(target, key, newValue, receiver) {
            let res = Reflect.set(target, key, newValue, receiver)
            // 触发依赖
            trigger(target, key)
            return res
        }
    })
}

export function readonly<T extends Object>(raw: T) {
    return new Proxy<T>(raw, {
        get: createGetter(true),
        set(target, key, newValue, receiver) {
            console.warn(`Object是readonly类型，${key.toString()}不可以set`)
            return true
        }
    })
}

export function shallowReadonly<T extends Object>(raw: T) {
    return new Proxy<T>(raw, {
        get: createGetter(true, true),
        set(target, key, newValue, receiver) {
            console.warn(`Object是readonly类型，${key.toString()}不可以set`)
            return true
        }
    })
}

export function isReactive(obj: any) {
    return !!obj[ReactiveFlags.IS_REACTIVE]
}

export function isReadonly(obj: any) {
    return !!obj[ReactiveFlags.IS_READONLY]
}

export function isProxy(val: any) {
    return isReadonly(val) || isReactive(val)
}