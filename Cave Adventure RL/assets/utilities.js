Game.extend = function(src, dest) {
  var result = {};
  for (var key in src) {
    result[key] = src[key];
  }
  for (var key in dest) {
    result[key] = dest[key];
  }
  return result;
}