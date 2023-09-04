type Options =
    {
        scheduler?: (fn: EffectFn) => any,
        lazy?: boolean,//惰性执行 副作用函数
    }

type EffectFn = {
    (): void,
    deps: Set<EffectFn>[],
    options: Options
}
let activeEffect: EffectFn;
const effectStack: EffectFn[] = []//用于嵌套的副作用函数栈

type keyType = string | Symbol

// 存储副作用函数的桶
const bucket = new WeakMap<Object, Map<keyType, Set<EffectFn>>>()

function cleanup(effectFn: EffectFn) {
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i]
        deps.delete(effectFn)
    }
    effectFn.deps.length = 0
}

//effect() 副作用函数注册机
function effect(fn: Function, option: Options = {}) {
    const effectFn: EffectFn = () => {// 原始副作用函数的包装,每次trigger要执行,,每调用一次注册函数，会新生成一个 effectFn 闭包
        cleanup(effectFn)
        //effectFn执行时，将其设置成当前激活的副作用函数
        activeEffect = effectFn
        effectStack.push(effectFn)
        // 原始副作用函数的返回值
        const res = fn()
        effectStack.pop()//当前副作用函数执行完弹出
        activeEffect = effectStack[effectStack.length - 1]
        return res
    }
    effectFn.deps = [] //再函数上添加属性，该属性会一直存在，相当于 ”类的静态属性“
    effectFn.options = option //可选项，包含调度器
    if (!effectFn.options.lazy) {// lazy false 时立即执行
        effectFn()
    }
    return effectFn //将副作用函数返回，交由用户控制执行时机
}

function computed(getter: Function) {
    let value: any//用于缓存上一次的值
    let dirty: boolean = true //是否需要重新计算，true，代表脏数据，需要重新计算
    const effectFn = effect(getter, {
        lazy: true,
        scheduler: () => {
            dirty = true
            trigger(obj, 'value') //手动触发 trigger 响应
        }
    })
    const obj = {
        get value() {
            if (dirty) {
                value = effectFn()
                dirty = false
            }
            track(obj, 'value')//手动收集依赖
            return value
        },
    }

    return obj
}


// 递归读取value
function traverse(value: unknown, seen = new Set()) {
    if (typeof value !== 'object' || value === null || seen.has(value)) {
        return
    }
    seen.add(value)
    for (const k in value) {
        traverse(value[k], seen)
    }
    return value;
}

function watch(source: any, cb: (newValue: any, oldValue: any) => void, options = {immediate: false}) {
    let getter: Function
    if (typeof source === "function") {
        getter = source
    } else {
        getter = () => traverse(source)
    }
    let newValue: any, oldValue: any
    const job = () => {
        newValue = effectFn()
        cb(newValue, oldValue)
        // 更新旧值
        oldValue = newValue
    }
    const effectFn = effect(() => getter(), {
        lazy: true,
        scheduler() {
            job()
        }
    })
    if (options.immediate) {
        job()
    } else {
        oldValue = effectFn() //手动触发副作用函数，才可以触发依赖收集，拿到的时旧值，
    }
}

// 收集依赖
function track(target: Object, key: keyType) {
    if (!activeEffect) {
        return
    }
    let depsMap = bucket.get(target)
    if (!depsMap) {
        bucket.set(target, (depsMap = new Map()))
    }
    let deps = depsMap.get(key)//获取对象属性上的 依赖
    if (!deps) {
        depsMap.set(key, (deps = new Set()))
    }
    deps.add(activeEffect)
    activeEffect.deps.push(deps)
    // activeEffect.
}

function trigger(target: Object, key: keyType) {
    const depsMap = bucket.get(target)
    if (!depsMap) return
    const effects = depsMap.get(key)

    const effectsToRun = new Set<EffectFn>()
    effects && effects.forEach(effectFn => {
        // 如果trigger出发的副作用与当前正在执行的相同则 不出发，避免 无限递归循环
        if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
        }
    })
    effectsToRun.forEach(effectFn => {
        if (effectFn.options.scheduler) {//如果存在调度器 则在调度器里执行 副作用函数
            effectFn.options.scheduler(effectFn)
        } else {
            effectFn()
        }
    })

}


const data = {ok: true, text: 'hello', num: 1}
const obj = new Proxy(data, {
    get(target, key, receiver) {
        track(target, key)
        return Reflect.get(target, key, receiver)
    },
    set(target, key, newValue, receiver) {
        let res = Reflect.set(target, key, newValue, receiver)
        trigger(target, key)
        return res
    }
})


watch(() => obj.num, (newValue, oldValue) => {
    console.log('watch', newValue, oldValue)
}, {
    immediate: true
})
// obj.num = 8
obj.num = 9

export {
    effect
}

async function aa() {
    console.log(1)
}

aa().then(()=>{
    console.log(3)
})
console.log(2)