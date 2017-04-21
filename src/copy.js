var copy= function (data,boolean) {
    var t = Object.prototype.toString.call(data).replace(/\[object\s|\]/g,'');
    var o;

    if (t === 'array') {
        o = [];
    } else if ( t === 'object') {
        o = {};
    } else {
        return data;
    }

    if (t === 'array') {
        for (var i = 0; i < data.length; i++) {
            o.push(deepCopy(data[i]));
        }
    } else if ( t === 'object') {
        for (var j in data) {
            o[j] = deepCopy(data[j]);
        }
    }
    return o;
}

module.exports=copy