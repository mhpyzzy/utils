var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
var IDB = function (option) {
    /**
     * cache 缓存结构 
     * @type {tableName1: ['表主键'，{数据}...], tableName2: ['表主键'，{数据}...]}
     */
    this.cache = {
        table1:['id'],
        table1:['id']
    };
    var _default = {
        name: 'indexDB',
        version: 1,
        stores: [  //数组格式创建，建议创建时都设置主键(keyPath)
            {
                name:'table1',
                param:{keyPath:'id',autoIncrement:false},  //keyPath:主键，[,autoIncrement:是否自增默认false；]
                index:{} //索引 建立索引可以增加所搜速度
            },
            {
                name:'table2',
                param:{keyPath:'id',autoIncrement:true},
                index:{} 
            }
        ] 
    };
    this.setting = Object.assign({}, _default, option)
}
//----------------------------------------------------------------------------
//挂载原型方法
IDB.prototype = {
    constructor: IDB,
    openDB:function(callback) {
        var opt=this.setting;
        if (!indexedDB) {
            console.log('你的浏览器不支持IndexedDB!')
            return;
        }
        //打开一个indexDB(只有两个参数：名字和版本号)
        var request = indexedDB.open(opt.name, opt.version);
        request.onsuccess = function (e) {
            var db = request.result;
            if (isFunction(callback)) {
                callback(db);
            }
        };
        //错误处理
        request.onerror = errorHandler;
        //更新、删除、创建时的接口
        request.onupgradeneeded = function (e) {
            var db = e.target.result,
                dbnames = db.objectStoreNames;
            if (Array.isArray(opt.stores)) {
                for (var i = 0; i < opt.stores.length; i++) {
                    //判断原始db中是否已存在新stroe的名字,不存在则创建
                    if (!dbnames.contains(opt.stores[i].name)) {
                        var storeItem = opt.stores[i];
                        var indexs = storeItem.index || '';
                        //createObjectStore（）方法创建一个对象存储。 此方法接受两个参数： - 存储的名称和参数对象
                        // 参数：{keyPath:'xx'} 数据库表中的主键,或者设置为自增ID{autoIncrement:true(默认为false)}
                        var store = db.createObjectStore(storeItem.name, storeItem.param || {});
                        //createIndex(name,value,unique)方法创建索引unique 默认false
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
    },
    /**
     * 保存数据，无则保存，有责更新(表结构有主键，则根据主键来搜索和更新,这种情况下若传入数据无主键，则会报错)
     * @param data格式：[{},{}...]或者单条数据{};
     * @param storeName 存储的表名【type:string】
     * @param callback 保存成功后的回调 传入的参数为主键值；
     */
    saveToDB:function(data,storeName, callback){
        this.openDB(_put);
        function _put(db){
            var store = getStore(db, storeName, 'readwrite');
            var keyPath=store.keyPath; //获取表的主键
            var autoIncrement=store.autoIncrement; //获取表的自增
            if(Array.isArray(data)){
                for(var i = 0 ; i < data.length;i++){
                    if(!!keyPath && !(data[i][keyPath]) && !autoIncrement){
                        console.log(data[i],'本条数据格式错误，不会保存到数据库！')
                        continue
                    };
                    request = store.put(data[i]);
                    request.onerror = errorHandler;
                    request.onsuccess = function(e){
                        console.log('数据已存入数据库')
                        if(isFunction(callback)){callback(e)}
                    };
                };
            }else if(isObject(data)){
                     if(!!keyPath && !(data[i][keyPath]) && !autoIncrement){
                        console.log(data[i],'本条数据格式错误，不会保存到数据库！')
                        return
                    };
                    request = store.put(data);
                    request.onerror = errorHandler;
                    request.onsuccess = function(e){
                        console.log('数据已存入数据库')
                        if(isFunction(callback)){callback(e)}
                    };
            }else{
                console.log('数据格式不符！')
                return
            }
        }
    },
    save: function (data,storeName, callback) {
        var oldCache=this.cache[storeName]; //原始的缓存
        if(!oldCache){
            console.log('表名不存在！');
            return;
        }

        var cacheKeyPath=oldCache[0]; //缓存的键值
        var autoId=oldCache.length;
        var target={};
            target[cacheKeyPath]=autoId;
        if(Array.isArray(data)){
            for(var j=0;j<data.length;j++){
                pushCache();
            }
        }else if(isObject(data)){
            pushCache();
        }else{
            console.log('数据格式不符！')
            return
        }
        //同时保存到indexDB
        this.saveToDB(data,storeName, callback); 
        //处理单条记录插入缓存
        function pushCache(){
            var exist=false; //记录数据的键值在原始数据中是否存在
            if(!data[cacheKeyPath]){  //无键值的数据自增处理
                oldCache.push(Object.assign(target,data));
            }else{
                for(var i=1;i<oldCache.length;i++){ //0是主键名  
                    if(data[index]==oldCache[i][index]){ //如果有相同的，就合并
                        Object.assign(oldCache[i],data);
                        exist=true;
                        break;
                    }
                }
                if(!exist){  //如果没有就直接push
                   oldCache.push(Object.assign(target,data));
                }
            }
        }
    },
    resolveParam:function(param){
        var resolve={
            select:[], //['fid','name',...]
            where:[],  //['fid=0','status>0','age<=18']
            limit:[0],  //[0,20] 默认[0]
            direction:'next', //方向 默认next, [,prev]
            orderBy:'',  //默认不排序
            update:{}  //要更新的数据{key1:value1,key2:value2,...}
        }
        if(!param){resolve=resolve};
        resolve=Object.assign({},resolve,param);

        if(!resolve.where){  //确定游标的类型 默认store[,index]
            resolve.cursorType='store' //根据主键创建游标
        }else{
            resolve.cursorType='index'  //根据索引创建游标
        }

        //正则处理resolve.where
            //         switch (bound){
            //     case 'only':
            //         range=IDBKeyRange.only(values[0]);
            //         break;
            //     case 'lowerBound':
            //         range=IDBKeyRange.lowerBound(values[0],values[1]||false);
            //         break;
            //     case 'upperBound':
            //         range=IDBKeyRange.upperBound(values[0],values[1]||false);
            //         break;
            //     case 'bound':
            //         range=IDBKeyRange.bound(values[0],values[1],values[2]||false,values[3]||false);
            //         break;
            //     default:
            //         range=null;
            // };



        return resolve;
    },
    getFromDB: function (param,storeName,callback) {




        this.openDB(_get);
        function _get(db){
            var store = getStore(db, storeName, 'readwrite');
            var cursor=null; //游标或者索引的指针

        };
    },
    get: function () {

    },
    updateDB: function () {},
    updata: function () {},
    delDB: function () {},
    del: function () {},
    //清除数据库和缓存全部记录
    clear:function(storeName){
        this.openDB(_clear);
        function _clear(db){
            var store = getStore(db, storeName, 'readwrite');
            store.clear();
            console.log('已删除存储空间'+storeName+'全部记录');
        }
        this.cache[storeName].length=1;
    },
    //删除整个数据库同时清空缓存
    delDB:function(dbName){
       indexedDB.deleteDatabase(dbName);
       this.cache={};
       console.log(dbName+'数据库已删除');
    }
}


// 私有函数
//-------------------------------------------------
/**
 * 打开数据库
 * return:打开成功时返回db作为callback的参数传入；
 * @param callback
 */
function openDB(opt, callback) {
    if (!indexedDB) {
        console.log('你的浏览器不支持IndexedDB!')
        return;
    }
    //打开一个indexDB(只有两个参数：名字和版本号)
    var request = indexedDB.open(opt.name, opt.version);
    request.onsuccess = function (e) {
        var db = request.result;
        if (callback) {
            callback(db);
        }
    };
    //错误处理
    request.onerror = errorHandler;
    //更新、删除、创建时的接口
    request.onupgradeneeded = function (e) {
        var db = e.target.result,
            dbnames = db.objectStoreNames;
        if (Array.isArray(opt.stores)) {
            for (var i = 0; i < opt.stores.length; i++) {
                //判断原始db中是否已存在新stroe的名字,不存在则创建
                if (!dbnames.contains(opt.stores[i].name)) {
                    var storeItem = opt.stores[i];
                    var indexs = storeItem.index || '';
                    //createObjectStore（）方法创建一个对象存储。 此方法接受两个参数： - 存储的名称和参数对象
                    // 参数：{keyPath:'xx'} 数据库表中的主键,或者设置为自增ID{autoIncrement:true(默认为false)}
                    var store = db.createObjectStore(storeItem.name, storeItem.param || {});
                    //createIndex(name,value,unique)方法创建索引unique 默认false
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
};
/**
 * 通用错误处理函数，冒泡机制；
 */
function errorHandler(e) {
    console.log("error:" + e.target.code);
    debugger;
};
/**
 * 获取DB事物
 * db :要获取事物的DB
 * objectStoreName: store的名称 type:string
 * mode :操作的类型(默认'readonly'只读/'readwrite'可写) type:string
 *  transaction(param1[,param2,param3])方法是用来指定我们想要进行事务处理的对象存储。
 *      改方法接受3个参数（第二个和第三个是可选的）。
 *      第一个是我们要处理的对象存储的列表，
 *      第二个指定我们是否要只读/读写，第三个是版本变化。
 */
function getStore(db, storeName, mode) {
    var mode = mode || 'readonly';
    var transaction = db.transaction([storeName], mode);
    var store = transaction.objectStore(storeName);
    return store;
};
//判断是否Function
function isFunction(fn){
    return Object.prototype.toString.call(fn)=='[object Function]'?true:false;
}
//判断是否{}
function isObject(obj){
    return Object.prototype.toString.call(obj)=='[object Object]'?true:false;
}