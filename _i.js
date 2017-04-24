var copy=require('./src/copy.js');
var Date=require('./src/date.js');
var typeOf=require('./src/typeOf.js');
var indexDB=require('./src/indexDB.js');

;(function(window,document,undfeined){
    var _i={
        //字符串处理


        //数组处理


        //日期处理
        Date:Date,

        // 对象处理

        //IndexDB
        indexDB:indexDB,
        //其它
        copy:copy,
        typeOf:typeOf

    }
    window._i=_i;
})(window,document)