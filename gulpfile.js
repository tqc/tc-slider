var gulp = require("gulp");

gulp.task("default", function() {
    var builder = require("directive-builder");
    builder.build({
        moduleName: "tc-slider",
    });
});
