const microJobQueue = new Set<Function>() //存储函数，如果添加的是同一个函数，队列里只会添加一次，所以只会执行一次

const p = Promise.resolve() // .then 里的回调会加到微任务队列里

let isFlushing = false//队列是否在刷新

function flushJob() {
    if (isFlushing) {
        return
    }
    isFlushing = true
    p.then(() => {
        microJobQueue.forEach(job => {
            job()
        })
    }).finally(() => [
        isFlushing = false
    ])
}