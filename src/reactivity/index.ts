import './reactive'
import {isReactive, reactive, readonly, shallowReadonly} from "./reactive";
import {effect, stop} from "./effect";

const obj = shallowReadonly({name: 'text', num: 0, obj: {a: 'a'}})

effect(() => {
    console.log(obj.name)
})
const run = effect(() => {
    console.log(obj.obj.a)
})
obj.obj.a='op'
console.log(obj)
// effect(()=>{
//     console.log('--')
// })
// obj.num+=1
//
// stop(run)
//
// obj.num++
