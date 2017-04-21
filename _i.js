var copy=require('./src/copy.js');
var date=require('./src/date.js');

;(function(window,document,undfeined){
    var _i={
        //字符串处理


        //数组处理


        //日期处理
        Date:date,

        // 对象处理


        //其它
        copy:copy

    }
    window._i=_i;
})(window,document)