var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
var IDB = function (option) {
    this.cache = [];
    var _default = {
        name: 'indexDB',
        version: 1,
        objectStore: []
    };
    var setting = assgin({}, _default, option)
}
IDB.prototype={
    constructor:IDB,
    /**
     * 保存/更新表数据：
     * @param data 要保存的数据【type:{}】
     * @param objectStoreName 存储的表名【type:string】
     * @param callback 保存成功后的回调 传入的参数为主键值；
     */
    save:function(){
        
    },
    saveCache:function(){},
    get:function(){},
    getFromCache:function(){},
    update:function(){},
    updataCache:function(){}
}

module.exports = new IDB(option);

// 私有函数
//-------------------------------------------------
/**
 * 打开数据库
 * return:打开成功时返回db作为callback的参数传入；
 * @param callback
 */
function openDB(callback) {
    if (!indexedDB) {
        console.log('你的浏览器不支持IndexedDB!')
        return;
    }
    var request = indexedDB.open(opt.name, opt.version);
    request.onsuccess = function (e) {
        var db = request.result;
        if ($.isFunction(callback)) {
            callback(db);
        }
    };
    request.onerror = errorHandler;
    request.onupgradeneeded = upgrade;
};
/**
 * 更新数据库（创建，删除或修改数据库）时自动调用；
 */
function upgrade(e) {
    var db = e.target.result,
        dbnames = db.objectStoreNames;
    if ($.isArray(opt.objectStore)) {
        for (var i = 0; i < opt.objectStore.length; i++) {
            if (!dbnames.contains(opt.objectStore[i].name)) {
                var store = opt.objectStore[i];
                var indexs = store.index || '';
                var store = db.createObjectStore(store.name, store.param || {});
                //创建索引
                if (!!indexs) {
                    for (var indexName in indexs) {
                        store.createIndex(indexName, indexs[indexName][0], {
                            unique: indexs[indexName][1] || false
                        });
                    }
                }
            }
        }
    };
    console.log("初始化成功:", db);
};
/**
 * 通用错误处理函数，冒泡机制；
 */
function errorHandler(e) {
    console.log("error:" + e.target.code);
    debugger;
};