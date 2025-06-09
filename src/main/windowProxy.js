const windowManage = {}

const savaWindow = (id, window) =>{
    windowManage[id] = window
}

const getWindow = (id)=>{
    return windowManage[id]
}

const delWindow = (id)=>{
    delete windowManage[id]
}

export {
    savaWindow,
    getWindow,
    delWindow
}