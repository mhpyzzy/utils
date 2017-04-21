var gulp=require('gulp'),
    clean=require('gulp-clean'),
     notify=require('gulp-notify'),
     rename=require('gulp-rename'),
     webpack=require('gulp-webpack'),
     path=require('path'),
     concat=require('gulp-concat'),
     uglify=require("gulp-uglify");

var _={
    entyrJs:path.resolve(__dirname,'_i.js'),
    js:path.resolve(__dirname,'src/*.js'),
    build:path.resolve(__dirname,'build/')
}
gulp.task('clean',function(){
   return gulp.src(_.build,{read:false})
        .pipe(clean())
        .pipe(notify({message:'清除完成！'}))
});
gulp.task('js',['clean'],function(){
       return gulp.src(_.entyrJs)
            // .pipe.(concat())
            .pipe(webpack())
            // .pipe(uglify())
            .pipe(rename('_i.min.js'))
            .pipe(gulp.dest(_.build))
            .pipe(notify({message:'js压缩完成！'}))
});

gulp.task('watchJs', function () {
  gulp.watch(_.js, ['uglify']);
});

gulp.task('default',['js']);