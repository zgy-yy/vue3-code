// 计算属性


import {effect, ReactiveEffect} from "./effect";

class ComputedRefImpl {

    private _dirty
    private _value: any
    private _effect: ReactiveEffect;

    constructor(getter: Function) {
        this._dirty = true
        this._effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true
            }
        })
    }

    get value() {
        if (this._dirty) {
            this._dirty = false
            this._value = this._effect.run()
        }
        return this._value
    }
}

export function computed(getter: Function) {

    return new ComputedRefImpl(getter)
}