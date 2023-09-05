import {effect} from "./effect";

function traverse(value: any, seen = new Set) {
    if (typeof value !== 'object' || value === null || seen.has(value))
        return
    seen.add(value)
    for (const k in value) {
        traverse(value[k], seen)
    }
    return value
}

export function watch(source: any, cb: (newValue: any, oldValue: any) => void, options?: { immediate?: boolean }) {
    let getter
    if (typeof source === 'function') {
        getter = source
    } else {
        getter = () => traverse(source)
    }

    let newValue: any, oldValue: any
    const job = () => {
        newValue = runner()
        cb(newValue, oldValue)
        oldValue = newValue
    }
    const runner = effect(getter, {
        lazy: true,
        scheduler() {//在触发依赖时 执行
            job()
        }
    })
    if (options?.immediate) {
        job()
    } else {
        oldValue = runner()
    }

}