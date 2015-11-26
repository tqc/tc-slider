angular.module("tc-slider", []).directive("tcSlider", ["$parse"].concat([function ($parse) {
      return {
        template: "<div class=\"innersliderwrapper\">\n    <div class='slider'>\n        <div class=\"sliderprogress\" ng-style=\"{width:(currentPercent+'%')}\"></div>\n        <div class=\"sliderhandle\" ng-style=\"{left:(currentPercent+'%')}\"></div>\n        <div class=\"slidervaluepopup\" ng-show=\"mayShowPopup\" ng-style=\"{left:(popupPosition+'%')}\">\n            <div class=\"arrow\" ng-show=\"activeMarker\"></div>\n            <div class=\"popupbody\" ng-class=\"{markerpopup:activeMarker, defaultpopup:!activeMarker}\" bind-text-template=\"popupTemplate\"></div>\n        </div>\n    </div>    \n    <div class=\"slidermarkers\" ng-if=\"markers\">\n        <div class=\"slidermarker {{marker.class}}\" markerindex=\"{{$index}}\" ng-style=\"{left:(getMarkerPosition(marker)+'%')}\" ng-repeat=\"marker in markers\" ng-if=\"marker.value <= max && marker.showLabel\">\n            <div class=\"markerarrow\" ng-style=\"{height: ((20+marker.layer*25)+'px')}\"></div>\n            <div class=\"markerlabel\" ng-style=\"{'margin-top': ((marker.layer*25)+'px')}\">\n                {{marker.name}}\n            </div>\n        </div>\n    </div>\n</div>\n",
        replace: true,
        scope: true,
        link: function(scope, element, attrs) {
          var $element = $(element);
          var $bar = $('.sliderprogress', $element);
          var width = $element.width();
          var offset = $bar.offset().left;
          var mouseDown = false;
          var mvVal = attrs.ngModelVal || attrs.ngModel || "sliderVal";
          var min = parseFloat(attrs.min) || 0;
          var max = parseFloat(attrs.max) || 1000;
          var rangeMin = min;
          var rangeMax = max;
          var logarithmic = attrs.logarithmic && true || false;
          var valueGetter = $parse(mvVal);
          var minGetter = $parse(attrs.ngModelMin);
          var maxGetter = $parse(attrs.ngModelMax);
          var base = parseFloat(attrs.base) || 1000;
          var pcToVal = function(percent) {
            var pc = percent;
            var result,
                step;
            if (scope.valueArray) {
              result = (Math.round(pc * max));
              console.log(result);
              console.log(scope.valueArray[result]);
              return scope.valueArray[result];
            } else if (logarithmic) {
              pc = (Math.pow(base, percent) - 1) / (base - 1);
              var rawresult = (rangeMin + (pc * (rangeMax - rangeMin)));
              var pc2 = (Math.pow(base, percent + 0.01) - 1) / (base - 1);
              var rawresult2 = (rangeMin + (pc2 * (rangeMax - rangeMin)));
              var d = Math.abs(rawresult - rawresult2);
              var minStep = scope.$eval(attrs.ngModelStep || ("" + attrs.step)) || 1;
              step = Math.max(minStep, Math.round(Math.pow(10, Math.floor(Math.log(d) / Math.log(10))) / minStep) * minStep);
              result = (rangeMin + Math.round(pc * (rangeMax - rangeMin) / step) * step);
              return result;
            } else {
              pc = percent;
              step = scope.$eval(attrs.ngModelStep || ("" + attrs.step)) || 1;
              result = (rangeMin + Math.round(pc * (rangeMax - rangeMin) / step) * step);
              return result;
            }
          };
          var valToPc = function(val) {
            var result;
            if (scope.valueArray) {
              if (max === 0)
                return 0;
              var v2 = scope.valueArray.indexOf(val);
              result = v2 / (max);
              return Math.min(Math.max(0, result), 1);
            } else if (rangeMax == rangeMin) {
              return 0;
            } else {
              if (logarithmic) {
                var pc = (val - rangeMin) / (rangeMax - rangeMin);
                pc = Math.min(Math.max(0, pc), 1);
                result = Math.log(1 + (pc * (base - 1))) / Math.log(base);
                return result;
              } else {
                result = (val - rangeMin) / (rangeMax - rangeMin);
                return Math.min(Math.max(0, result), 1);
              }
            }
          };
          function updateMarkerPopup(val) {
            console.log("update popup " + val + " " + mouseDown + " " + scope.mayShowPopup);
            var selectedMarker = null;
            if (scope.markers) {
              for (var i = 0; i < scope.markers.length; i++) {
                var m = scope.markers[i];
                if (m.value == val) {
                  selectedMarker = m;
                  break;
                }
              }
            }
            if (selectedMarker && (selectedMarker.data || selectedMarker.template || selectedMarker.templateKey)) {
              scope.activeMarker = selectedMarker;
              scope.activeMarkerData = selectedMarker.data;
              if (selectedMarker.templateKey) {
                scope.popupTemplate = scope.text.page.misc[selectedMarker.templateKey];
              } else {
                scope.popupTemplate = selectedMarker.template;
              }
              scope.popupPosition = valToPc(selectedMarker.value) * 100;
            } else {
              scope.activeMarker = null;
              scope.activeMarkerData = null;
              scope.popupTemplate = "{{currentValue}}";
              scope.popupPosition = scope.currentPercent;
            }
          }
          function update(diff) {
            width = $element.width();
            offset = $bar.offset().left;
            var val,
                pc;
            if (diff < 0) {
              pc = 0;
            } else if (diff > width) {
              pc = 1;
            } else {
              pc = diff / width;
            }
            val = pcToVal(pc);
            valueGetter.assign(scope.$parent, val);
            scope.currentValue = val;
            scope.currentPercent = pc * 100;
            updateMarkerPopup(val);
            scope.$apply();
          }
          function updateWithVal(val) {
            var pc = valToPc(val);
            valueGetter.assign(scope.$parent, val);
            scope.currentValue = val;
            scope.currentPercent = pc * 100;
          }
          var onMouseMove = function(evt) {
            evt.preventDefault();
            if (!mouseDown) {
              return ;
            }
            var target = $(evt.originalEvent.target);
            if (target.hasClass("markerlabel")) {
              return ;
            }
            var diff;
            if (evt.pageX) {
              diff = evt.pageX - offset;
            } else {
              diff = evt.originalEvent.touches[0].pageX - offset;
            }
            update(diff);
            scope.$apply();
            return ;
          };
          var onMouseUp = function(evt) {
            var target = $(evt.originalEvent.target);
            scope.mayShowPopup = false;
            if (target.hasClass("markerlabel")) {
              var ind = parseInt(target.parent().attr("markerindex"), 10);
              updateWithVal(scope.markers[ind].value);
              updateMarkerPopup(scope.markers[ind].value);
            } else {
              updateWithVal(scope.currentValue);
            }
            scope.$apply();
            if (mouseDown) {
              mouseDown = false;
              $(document).off('mousemove touchmove', onMouseMove);
              $(document).off('mouseup touchend', onMouseUp);
            }
            return false;
          };
          element.on('mousedown touchstart', function(evt) {
            scope.mayShowPopup = true;
            if (!mouseDown) {
              offset = $bar.offset().left;
              mouseDown = true;
              var target = $(evt.originalEvent.target);
              if (target.hasClass("markerlabel")) {
                var ind = parseInt(target.parent().attr("markerindex"), 10);
                updateWithVal(scope.markers[ind].value);
                updateMarkerPopup(scope.markers[ind].value);
              } else {
                var diff;
                if (evt.pageX) {
                  diff = evt.pageX - offset;
                } else {
                  diff = evt.originalEvent.touches[0].pageX - offset;
                }
                update(diff);
              }
              scope.$apply();
              $(document).on('mousemove touchmove', onMouseMove);
              $(document).on('mouseup touchend', onMouseUp);
            }
            return false;
          });
          element.on('mousemove', function(evt) {
            var target = $(evt.originalEvent.target);
            if (mouseDown)
              return ;
            if (target.hasClass("markerlabel")) {
              scope.mayShowPopup = true;
              var ind = parseInt(target.parent().attr("markerindex"), 10);
              updateMarkerPopup(scope.markers[ind].value);
            } else if (!mouseDown) {
              scope.mayShowPopup = false;
            }
            scope.$apply();
          });
          element.on('mouseout', function(evt) {
            var target = $(evt.originalEvent.target);
            if (mouseDown)
              return ;
            if (target.hasClass("markerlabel")) {
              scope.mayShowPopup = false;
              scope.$apply();
            }
          });
          if (attrs.ngModelMin) {
            min = minGetter(scope);
            if (attrs.adjustMin !== undefined)
              rangeMin = min;
            scope.$watch(attrs.ngModelMin, function(newMin) {
              var val = valueGetter(scope);
              if (val < newMin) {
                scope[mvVal] = newMin;
              }
              min = newMin;
              if (attrs.adjustMin !== undefined)
                rangeMin = min;
              updateWithVal(val);
            });
          }
          if (attrs.ngModelMax) {
            scope.max = max = maxGetter(scope);
            if (attrs.adjustMax !== undefined)
              rangeMax = max;
            scope.$watch(attrs.ngModelMax, function(newMax) {
              var val = valueGetter(scope);
              if (val > newMax) {
                scope[mvVal] = newMax;
              }
              scope.max = max = newMax;
              if (attrs.adjustMax !== undefined)
                rangeMax = max;
              updateWithVal(val);
            });
          }
          scope.getMarkerPosition = function(marker) {
            return valToPc(marker.value) * 100;
          };
          scope.$watch(attrs.markers, function(val) {
            if (!val) {
              scope.markers = null;
              return ;
            }
            scope.markers = val;
          });
          scope.$watch(attrs.valueArray, function(val) {
            if (!val || !val.length) {
              scope.valueArray = null;
              return ;
            }
            console.log(val);
            scope.valueArray = [];
            for (var i = 0; i < val.length; i++) {
              scope.valueArray.push(val[i].value);
            }
            min = 0;
            scope.max = max = val.length - 1;
          });
          scope.$watch(mvVal, function(sliderVal) {
            updateWithVal(sliderVal);
          });
        }
      };
    }]))