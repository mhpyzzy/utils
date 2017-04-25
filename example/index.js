var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
var IDB = function (option) {
    /**
     * cache 缓存结构 
     * @type {tableName1: ['表主键'，{数据}...], tableName2: ['表主键'，{数据}...]}
     */
    this.cache = {
        table1:['id'],
        table2:['id']
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
    /**
     * 保存数据到缓存同时更新indexDB,参数同saveToDB
     */
    save: function (data,storeName, callback) {
        var oldCache=this.cache[storeName]; //原始的缓存
        if(!oldCache){
            console.log('表名不存在！');
            return;
        }
        var cacheKeyPath=oldCache[0]; //缓存的键值
        var autoId=oldCache.length;
        // var target={};
        //     target[cacheKeyPath]=autoId;
        if(Array.isArray(data)){
            for(var j=0;j<data.length;j++){
                pushCache(data[j]);
            }
        }else if(isObject(data)){
            pushCache(data);
        }else{
            console.log('数据格式不符！')
            return
        }
        //同时保存到indexDB
        this.saveToDB(data,storeName, callback); 
        //处理单条记录插入缓存
        function pushCache(data){
            var exist=false; //记录数据的键值在原始数据中是否存在
            var target = {};
            target[cacheKeyPath] = autoId;
            if(!data[cacheKeyPath]){  //无键值的数据自增处理
                oldCache.push(Object.assign(target,data));
                autoId++;
            }else{
                for(var i=1;i<oldCache.length;i++){ //0是主键名  
                    if(data[index]==oldCache[i][index]){ //如果有相同的，就合并
                        Object.assign(oldCache[i],data);
                        exist=true;
                        break;
                    }
                }
                if(!exist){  //如果没有就直接push
                   oldCache.push(data);
                }
            }
        }
    },
    /**
     * 处理获取数据时的参数
     * param的格式详见 resolveParam的默认值
     */
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

        //如果没有指定索引的情况下，就是用默认值store主键的方式遍历数据库查找
        if(resolve.where.length<1){  //确定游标的类型 默认store[,index]
            resolve.cursorType='store' //根据主键创建游标
            resolve.range=null;
            return resolve
        }else{
            resolve.cursorType='index'  //根据索引创建游标
        }

        //正则处理resolve.where
        var reg=/=|>=|<=|>|</g; //检索操作符opers用

        //循环分解 where 转化为数组处理
        resolve.where=resolve.where.map(function(v){
            var tempWhere=[];
            var opers=v.match(reg); // 获取操作符集合,如：['<','>']

            //拆分where字符串
            if(opers.length<2){ //如果是单条件类似：['>','id',5]
                tempWhere.push(opers[0]); //把操作符放入数组第一个
                tempWhere=tempWhere.concat(v.split(opers[0]));
                tempWhere[0]=tempWhere[0]=='='?'==':tempWhere[0];
                
            }else{   //如果是多条件类似：[['<','>'],'id',[5,1]]
                var value=[];
                tempWhere.push(opers); //把操作符集合放入数组第一个
                value.push(v.split(opers[0])[0]);
                value.push(v.split(opers[0])[1].split(opers[1])[1]);
                tempWhere.push(v.split(opers[0])[1].split(opers[1])[0]); //获取key
                tempWhere.push(value);
                for(var i=0;i<tempWhere.length;i++){
                    tempWhere[i]=tempWhere[i]=='='?'==':tempWhere[i];
                }

            }
            return tempWhere;
        })

        //转化resolve.where 到Range格式,,只把第一个条件给到下面switch转化，其余条件在后续处理；
        switch (resolve.where[0][0]) {
            case '=':
                //该方法保证在查询时，只查询特定键，相当于直接访问存储空间并调用get(key)
                resolve.range = IDBKeyRange.only(resolve.where[0][2]);
                break;
            case '>':
                //该方法指定结果集的下界，即从该key(包括key)开始查找，直到结束。第二个参数默认为false(即不排除边界值)
                resolve.range = IDBKeyRange.lowerBound(resolve.where[0][2], true);
                break;
            case '>=':
                //该方法指定结果集的下界，即从该key(包括key)开始查找，直到结束。第二个参数默认为false(即不排除边界值)
                resolve.range = IDBKeyRange.lowerBound(resolve.where[0][2], false);
                break;
            case '<':
                //该方法指定结果集的上界，游标从头查找到该key(包括该key所在对象)。第二个参数默认为false(即不排除边界值)
                resolve.range = IDBKeyRange.upperBound(resolve.where[0][2], true);
                break;
            case '<=':
                //该方法指定结果集的上界，游标从头查找到该key(包括该key所在对象)。第二个参数默认为false(即不排除边界值)
                resolve.range = IDBKeyRange.upperBound(resolve.where[0][2], false);
                break;
            case ['<','>']:
                //该方法同时指定上下界，4个参数含义分别为下界的键，上界的键，是否跳过下界，是否跳过上界。
                resolve.range = IDBKeyRange.bound(resolve.where[0][2][0], resolve.where[0][2][1], true,true);
                break;
            case ['<=','>=']:
                //该方法同时指定上下界，4个参数含义分别为下界的键，上界的键，是否跳过下界，是否跳过上界。
                resolve.range = IDBKeyRange.bound(resolve.where[0][2][0], resolve.where[0][2][1], false,false);
                break;
            case ['<','>=']:
                //该方法同时指定上下界，4个参数含义分别为下界的键，上界的键，是否跳过下界，是否跳过上界。
                resolve.range = IDBKeyRange.bound(resolve.where[0][2][0], resolve.where[0][2][1], true,false);
                break;
            case ['<=','>']:
                //该方法同时指定上下界，4个参数含义分别为下界的键，上界的键，是否跳过下界，是否跳过上界。
                resolve.range = IDBKeyRange.bound(resolve.where[0][2][0], resolve.where[0][2][1], false,true);
                break;
            default:
                resolve.range = null;
        };

        return resolve;
    },

    /**
     * 获取indexDB数据
     * storeName  表名
     * param 传入的参数 为空时获取全部数据
     * param格式：
     * param={
            select:[], //['fid','name',...]
            where:[],  //['fid=0','status>0','age<=18']
            limit:[0],  //[0,20] 默认[0]
            direction:'next', //方向 默认next, [,prev]
            orderBy:'',  //默认不排序
            update:{}  //要更新的数据{key1:value1,key2:value2,...}
        }
     */
    getFromDB: function (param, storeName, callback) {
        if(!storeName) {
            console.log('请指定表名！')
            return
        }
        var param = this.resolveParam(param);

        this.openDB(_get);
        var that=this;
        function _get(db) {
            var store = getStore(db, storeName, 'readwrite');
            var cursor = null; //游标或者索引的指针
            var data=[]; //用来存放获取的数据结果

            if (param.cursorType == 'store') { //没有制定where时就用主键做游标指针
                cursor = store.openCursor(param.range, param.direction);
            } else {  //有where时就用 索引index做游标指针 经转化后的where格式:[['<','id',5],...],有索引是只取第一个；
                cursor = store.index(param.where[0][1]).openCursor(result.range, result.direction)
            }

            cursor.onsuccess=function(e){

                var result = e.target.result; //获取当前游标指向的结果
                if(!!result){
                    if(param.select.length==0){
                        data.push(result.value)
                    }else{
                        var tempVal={};
                        for(var i=0;i<param.select.length;i++){
                            tempVal[param.select[i]]=result.value[param.select[i]];
                        }

                        data.push()
                    }
                    result.continue();  //指针指向结果集的下一项

                }else{  //结果集遍历完成

                    //处理排序 (升序)
                    if (!!param.orderby) {
                        data.sort(function (cur, next) {
                            return cur[param.orderby] >= next[param.orderby] ? 1 : -1;
                        });
                    }

                    //处理返回数据长度
                    data=data.slice(param.limit[0],param.limit[1]);

                    if(isFunction(callback)){
                         callback(data)
                    }
                }

            };

            cursor.onerror=that.errorHandler;
        };
    },

    /**
     * 获取缓存数据
     * 参数同 getFromDB
     */
    get: function (param, storeName, callback) {
        if (!storeName) {
            console.log('请指定表名！')
            return
        }
        var data = this.cache[storeName].slice(1);  //获取所有缓存数据

        if(!!param){
            var param = this.resolveParam(param);
            var keyPath = this.cache[storeName][0];  //获取当前表的主键

            if (param.where.length > 0) {  //where条件存在时筛选
                var tempDatas = [];
                for (var i = 1; i < data.length; i++) {
                    handleWhere(param.where, data[i], function () {
                        tempDatas.push(data[i]);
                    }, true);
                }
                data = tempDatas;
            }
      
            if(param.select.length>0){ //select 存在是 进行过滤
                var tempDatas = [];
                for (var i = 0; i < data.length; i++) {
                    var tempData = {};
                    for (var j = 0; j < param.select.length; j++) {
                        tempData[param.select[j]] = data[i][param.select[j]];
                    };
                    tempDatas.push(tempData);
                }
                data = tempDatas;
            }

            //处理排序 (升序)
            if (!!param.orderby) {
                data.sort(function (cur, next) {
                    return cur[param.orderby] >= next[param.orderby] ? 1 : -1;
                });
            }

            //处理返回数据长度
            data = data.slice(param.limit[0], param.limit[1]);
        }

        if(isFunction(callback)){
            callback(data);
        }
    },

    /**
     * 更新indexDB数据
     * 参数同 getFromDB 其中(select,limit,direction,orderBy) 不用传
     */
    updateDB: function (param, storeName, callback) {
        if (!storeName||param=='') {
            console.log('表名或 参数为空！')
            return
        }

        var param = this.resolveParam(param);
        if(Object.keys(param.updata).length==0){
            console.log('没有传入要更新的数据！');
            return
        }

        this.openDB(_update);
        var that=this;
        function _update() {
            var store = getStore(db, storeName, 'readwrite');
            var cursor = null; //游标或者索引的指针
            var data = []; //用来存放获取的数据结果

            if (param.cursorType == 'store') { //没有制定where时就用主键做游标指针
                cursor = store.openCursor(param.range, param.direction);
            } else {  //有where时就用 索引index做游标指针 经转化后的where格式:[['<','id',5],...],有索引是只取第一个；
                cursor = store.index(param.where[0][1]).openCursor(result.range, result.direction)
            }

            cursor.onsuccess=function(e){
                var result = e.target.result;
                var updateRequest;
                 if(!!result){
                     data.push(result.value);
                     var value = result.value || {};
                    //  此处还需循环 where的其余条件
                     if (param.where.length >= 2) {
                            handleWhere(param.where,value,function () { cursorUpdate(result) });
                     } else {
                        cursorUpdate(result);  //更新
                     }
                     
                     result.continue();
                 }else{
                     if(isFunction(callback)){
                         callback(data)
                     }
                 }
            };
            cursor.onerror=that.errorHandler;
            
            function cursorUpdate(result) {
                Object.assign(value, param.updata || {});
                updateRequest = result.update(value);  //更新
                updateRequest.onerror = that.errorHandler;
                updateRequest.onsuccess = function () { };
            }
        };

    },

    /**
     * 更新缓存数据 同时更新 indexDB数据
     * 参数同  updateDB
     */
    updata: function (param, storeName, callback) {
        if (!storeName||param=='') {
            console.log('表名或 参数为空！')
            return
        }

        var param = this.resolveParam(param);
        if (Object.keys(param.updata).length == 0) {
            console.log('没有传入要更新的数据！');
            return
        }

        var data=this.cache[storeName];
        for(var i=1;i<data.length;i++){
            if(param.where.length>0){
                 handleWhere(param.where,data[i],function () {
                     Object.assign(data,param.updata);
                 },true);
            }else{
                Object.assign(data,param.updata);
            }
        }

        //同时更新indexDB
        this.updateDB(param, storeName, callback);
    },
    delDBData: function (param, storeName, callback) {
        if (!storeName) {
            console.log('表名不能为空！')
            return
        }
        if (param == '') {
            this.clear(storeName);
            return
        }
        var param = this.resolveParam(param);
        if (param.where.length == 0) {
            this.clear(storeName);
            return
        }

        this.openDB(_update);
        var that = this;
        function _update() {
            var store = getStore(db, storeName, 'readwrite');
            var cursor = null; //游标或者索引的指针
            var data = []; //用来存放获取的数据结果

            //索引index做游标指针 经转化后的where格式:[['<','id',5],...],有索引是只取第一个；
            cursor = store.index(param.where[0][1]).openCursor(result.range, result.direction)

            cursor.onsuccess = function (e) {
                var result = e.target.result;
                var deleteRequest;
                if (!!result) {
                    data.push(result.value);
                    var value = result.value || {};
                    //  此处还需循环 where的其余条件
                    if (param.where.length >= 2) {
                        handleWhere(param.where, value, function () { cursorDelete(result) });
                    } else {
                        cursorDelete(result);  //更新
                    }

                    result.continue();
                } else {
                    if (isFunction(callback)) {
                        callback(data)
                    }
                }
            };
            cursor.onerror = that.errorHandler;

            function cursorDelete(result) {
                deleteRequest = result.delete();  //更新
                deleteRequest.onerror = that.errorHandler;
                deleteRequest.onsuccess = function () {console.log('删除该记录成功')};
            }
        };
    },
    delData: function (param, storeName, callback) {
        if (!storeName) {
            console.log('表名不能为空！')
            return
        }
        if (param == '') {
            this.clear(storeName);
            return
        }
        var param = this.resolveParam(param);
        if (param.where.length == 0) {
            this.clear(storeName);
            return
        }


        var data = this.cache[storeName];
        for (var i = 1; i < data.length; i++) {
            handleWhere(param.where, data[i], function () {
                data.splice(i, 1)
            }, true);
        }

        //同时更新indexDB
        this.delDBData(param, storeName, callback);
    },
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

/**
 * 处理索引情况下，剩余where条件的判断和筛选
 * where param里面的条件数组
 * curVal 对比的当前数据
 * boolen 确定是从where 第几个条件开始；默认为false(第一个)，true(第二个)
 */
function handleWhere(where,curVal,callback,boolen) {
    var _index=boolen?0:1;
    for (var i = _index; i < where.length; i++) {
        var oper = where[i][0],
            key = where[i][1],
            val = where[i][2];
        if (Array.isArray(oper)) {  //如果为多条件，如'5<id>=0'
            if (eval(val[0] + oper[0] + 'curVal[key]' + oper[1] + val[1])) {
                if (isFunction(callback)) {
                    callback()
                }
            }
        } else { //如果为单条件，如：'if>10'
            if (eval('curVal[key]' + oper + val)) {
                if (isFunction(callback)) {
                    callback()
                }
            }
        }
    }
};
//判断是否Function
function isFunction(fn){
    return Object.prototype.toString.call(fn)=='[object Function]'?true:false;
}
//判断是否{}
function isObject(obj){
    return Object.prototype.toString.call(obj)=='[object Object]'?true:false;
}