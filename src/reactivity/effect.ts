type Options =
    {
        scheduler?: (fn: EffectFn) => any,
        lazy?: boolean,//惰性执行 副作用函数,
        onStop?: Function
    }

type EffectFn = {
    (): void,
    deps: Set<EffectFn>[],
    options: Options
}
let shouldTrack = false; //控制是否要收集依赖 解决 obj.key++问题
let activeEffect: ReactiveEffect;
const effectStack: EffectFn[] = []//用于嵌套的副作用函数栈

type keyType = string | Symbol

export class ReactiveEffect {
    private _fn: Function //真正的副作用函数，
    deps: Set<ReactiveEffect>[]  //(同一个属性的)，副作用函数依赖
    private active// 是否stop标志，如果stop 就不收集依赖
    onStop?: Function

    constructor(fn: Function, public scheduler?: Function) {
        this._fn = fn
        this.deps = []
        this.active = true
    }

    run(): any { //副作用函数执行时会触发 track函数，track将 activeEffect 作为依赖进行收集

        if (!this.active) {
            return this._fn()
        }
        shouldTrack = true
        activeEffect = this
        const result = this._fn()
        shouldTrack = false
        return result
    }

    stop() {
        if (this.active) {
            cleanup(this)
            if (this.onStop) {
                this.onStop()
            }
            this.active = false
        }

    }
}


function cleanup(effectFn: ReactiveEffect) {
    effectFn.deps.forEach(dep => {
        dep.delete(effectFn)
    })
    effectFn.deps.splice(0)
}

type Runner = {
    (): any;
    effect: ReactiveEffect
}

//effect() 副作用函数注册,将注册的函数作为依赖 收集，（多个对象可以依赖同一个函数）
export function effect(fn: Function, option: Options = {}) {
    // 获取调度器
    const scheduler = option.scheduler

    const _effect = new ReactiveEffect(fn, scheduler)
    _effect.onStop = option.onStop
    if (!option.lazy) {
        _effect.run()
    }
    const runner: Runner = () => _effect.run.bind(_effect)() //将要运行的副作用函数返回，让用户决定副作用函数的执行时机
    runner.effect = _effect
    return runner

}

export function stop(runner: Runner) {
    runner.effect.stop()
}

const targetMap = new WeakMap<Object, Map<keyType, Set<ReactiveEffect>>>()//存储对象中属性依赖的副作用函数的桶
// 收集依赖
export function track(target: Object, key: keyType) {
    if (!isTracking()) {
        return
    }
    // target -> key -> deps
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    let deps = depsMap.get(key)//获取对象属性上的副作用函数 依赖
    if (!deps) {
        depsMap.set(key, (deps = new Set()))
    }
    trackEffects(deps)
    // activeEffect.
    // console.log('track',key,deps)
}

export function isTracking() {
    return shouldTrack && activeEffect !== undefined
}

export function trackEffects(deps: Set<ReactiveEffect>) {
    if (deps.has(activeEffect)) //如果已经存在就不收集了
        return;
    deps.add(activeEffect)
    activeEffect.deps.push(deps)
}

// 触发依赖
export function trigger(target: Object, key: keyType) {
    const depsMap = targetMap.get(target)
    if (!depsMap) return
    const deps = depsMap.get(key)
    triggerEffects(deps)
}

export function triggerEffects(deps: Set<ReactiveEffect> | undefined) {
    deps && deps.forEach(effectFn => {
        if (effectFn.scheduler) {//如果存在调度器 则在调度器里执行 副作用函数
            effectFn.scheduler(effectFn)
        } else {
            effectFn.run()
        }
    })
}

