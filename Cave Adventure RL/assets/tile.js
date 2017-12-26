Game.Tile = function(properties) {
  properties = properties || {};
  Game.Glyph.call(this, properties);
  this._walkable = properties['walkable'] || false;
  this._diggable = properties['diggable'] || false;
  this._blocksLight = (properties['blocksLight'] !== undefined) ? properties['blocksLight'] : true;
  this._description = properties['description'] || '';
};

Game.Tile.extend(Game.Glyph);

Game.Tile.prototype.isWalkable = function() {
  return this._walkable;
}

Game.Tile.prototype.isDiggable = function() {
  return this._diggable;
}

Game.Tile.prototype.isBlockingLight = function() {
  return this._blocksLight;
}
Game.Tile.prototype.getDescription = function() {
  return this._description;
}

Game.Tile.nullTile = new Game.Tile({description: 'unknown'});
Game.Tile.floorTile = new Game.Tile({
  character: '.',
  walkable: true,
  blocksLight: false,
  description: 'A cave floor'
});
Game.Tile.wallTile = new Game.Tile({
  character: '#',
  foreground: 'goldenrod',
  diggable: true,
  description: 'A cave wall'
});
Game.Tile.stairsUpTile = new Game.Tile({
  character: '<',
  foreground: 'white',
  walkable: true,
  blocksLight: false,
  description: 'Rock staircase leading up'
});
Game.Tile.stairsDownTile = new Game.Tile({
  character: '>',
  foreground: 'white',
  walkable: true,
  blocksLight: false,
  description: 'Rock staircase leading down'
});
Game.Tile.holeToCavernTile = new Game.Tile({
  character: 'O',
  foreground: 'white',
  walkable: true,
  blocksLight: false,
  description: 'An ominous hole in the ground'
});
Game.Tile.waterTile = new Game.Tile({
  character: '~',
  foreground: 'blue',
  walkable: false,
  blocksLight: false,
  description: 'Murky water'
});

Game.getNeighborPositions = function(x, y) {
  var tiles = [];
  for (var dX = -1; dX < 2; dX++) {
    for (var dY = -1; dY < 2; dY++) {
      if (dX == 0 && dY == 0) {
        continue;
      }
      tiles.push({x: x + dX, y: y + dY});
    }
  }
  return tiles.randomize();
}