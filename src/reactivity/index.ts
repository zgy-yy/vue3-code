import './reactive'
import {isReactive, reactive, readonly, shallowReadonly} from "./reactive";
import {effect, stop} from "./effect";
import {ref} from "./ref";
import {computed} from "./computed";
import {watch} from "./watch";


const obj = reactive({name: 'hello', num: 0})
// const com = computed(()=>obj.name)
// obj.name = "hai"
// console.log(com.value)
// console.log(com.value)
// obj.name = 'hello'
// console.log(com.value)
watch(() => obj.num, (newValue, oldValue) => {
    console.log('watch', newValue, oldValue)
}, {immediate: true})

obj.num = 9
// const obj = ref(1)
// console.log(obj)
// effect(() => {
//     console.log(obj.value)
// })
// obj.value = 2
// obj.value += 3