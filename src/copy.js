/**
 * copy
 * @param {*} data type:[]/{}
 * @param {*} boolean type:boolean,默认false,true(深度copy)
 */

var copy= function (data,boolean) {
    var t = Object.prototype.toString.call(data).replace(/\[object\s|\]/g,'');
    var o;
    var boolean=boolean||false;

    if (t === 'array') {
        o = [];
        if(!boolean){
            for (var i = 0; i < data.length; i++) {
                o.push(data[i]);
            }
        }else{
            for (var i = 0; i < data.length; i++) {
                o.push(copy(data[i]));
            }
        }
    } else if ( t === 'object') {
         o = {};
         if(!boolean){
            for (var j in data) {
                o[j] = data[j];
            }
         }else{
            for (var j in data) {
                o[j] = copy(data[j]);
            }
         }
    }else{
        return data;
    }
    return o;
}

module.exports=copy