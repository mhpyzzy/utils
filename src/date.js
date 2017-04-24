/**
 * 格式化日期
 * @param {* 原始值的时间} date 
 * @param {*yyyy-MM-dd/C hh:mm:ss} format 默认：'yyyy-MM-dd',C表示格式化为：今天/昨天/更久
 */

var date = function (date, format) {
    if (!date) return;
    var fmt = format ? format : 'yyyy-MM-dd';
    var date = new Date(date);
    var time = {
        y: date.getFullYear(),
        M: date.getMonth() + 1,
        d: date.getDate(),
        h: date.getHours(),
        m: date.getMinutes(),
        s: date.getSeconds()
    }
    //格式化：今天/昨天/更久
    fmt = fmt.replace(/C/g, function (v) {
        var c = '更久';
        if ((v.length > 0) && (time.y == new Date().getFullYear()) && (time.M == new Date().getMonth() + 1)) {
            if (time.d == new Date().getDate()) {
                c = '今天'
            } else if (time.d == new Date().getDate() - 1) {
                c = '昨天'
            }
        }
        return c;
    })
    // 格式化
    fmt = fmt.replace(/M+|d+|h+|m+|s+/g, function (v) {
        return ((v.length > 1 ? '0' : '') + time[v.slice(-1)]).slice(-2);
    });
    // 格式化年
    fmt = fmt.replace(/y+/g, function (v) {
        return time.y.toString().slice(-(v.length))
    });
    fmt = fmt.replace(/C/g, function (v) {
        var c = '更久';
        if ((y == new Date().getFullYear()) && (M = new Date().getMonth() + 1)) {
            if (d == new Date().getDate()) {
                c = '今天'
            } else if (d == new Date().getDate() - 1) {
                c = '昨天'
            }
        }
        return c;
    })
    return fmt
}

module.exports = date;