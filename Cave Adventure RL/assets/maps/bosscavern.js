Game.Map.BossCavern = function() {
  Game.Map.call(this, this._generateTiles(80, 24));
  this.addEntityAtRandomPosition(Game.EntityRepository.create('giant zombie'), 0);
}
Game.Map.BossCavern.extend(Game.Map);

//algorithm for quickly drawing filled circles
Game.Map.BossCavern.prototype._fillCircle = function(tiles, centerX, centerY, radius, tile) {
  var x = radius;
  var y = 0;
  var xChange = 1 - (radius << 1);
  var yChange = 0;
  var radiusError = 0;

  while (x >= y) {
    for (var i =  centerX - x; i <= centerX + x; i++) {
      tiles[i][centerY + y] = tile;
      tiles[i][centerY - y] = tile;
    }
    for (var i =  centerX - y; i <= centerX + y; i++) {
      tiles[i][centerY + x] = tile;
      tiles[i][centerY - x] = tile;
    }

    y++;
    radiusError += yChange;
    yChange =+ 2;
    if (((radiusError << 1) + xChange) > 0) {
      x--;
      radiusError += xChange;
      xChange += 2;
    }
  }
}

Game.Map.BossCavern.prototype._generateTiles = function(width, height) {
  var tiles = new Array(width);
  //fill with wall tiles
  for (var x = 0; x < width; x++) {
    tiles[x] = new Array(height);
    for (var y = 0; y < height; y++) {
      tiles[x][y] = Game.Tile.wallTile;
    }
  }

  var radius = (Math.min(width, height) - 2)/2;
  this._fillCircle(tiles, width / 2, height / 2, radius, Game.Tile.floorTile);

  var lakes = Math.round(Math.random() * 3) + 3;
  var maxRadius = 2;
  for (var i = 0; i < lakes; i++) {
    var centerX = Math.floor(Math.random() * (width - (maxRadius * 2)));
    var centerY = Math.floor(Math.random() * (height - (maxRadius * 2)));
    centerX += maxRadius;
    centerY += maxRadius;

    var radius = Math.floor(Math.random() * maxRadius) + 1;
    this._fillCircle(tiles, centerX, centerY, radius, Game.Tile.waterTile);
  }

  return [tiles];
}

Game.Map.BossCavern.prototype.addEntity = function(entity) {
  Game.Map.prototype.addEntity.call(this, entity);
  if (this.getPlayer() === entity) {
    var position = this.getRandomFloorPosition(0);
    entity.setPosition(position.x, position.y, 0);
    this.getEngine().start();
  }
}