Game.Map.Cave = function(tiles, player) {
  Game.Map.call(this, tiles);
  this.addEntityAtRandomPosition(player, 0);
  //add random enemies and enemies to each floor
  for(var z = 0; z < this._depth; z++) {
    for (var i = 0; i < 15; i++) {
      var entity = Game.EntityRepository.createRandom();
      this.addEntityAtRandomPosition(entity, z);
      //Level up entity for level of depth it resides
      if (entity.hasMixin('ExperienceGainer')) {
        for (var level = 0; level < z; level++) {
          entity.giveExperience(entity.getNextLevelExperience() - entity.getExperience());
        }
      }
    }
    for (var i = 0; i < 15; i++) {
      this.addItemAtRandomPosition(Game.ItemRepository.createRandom(), z);
    }
  }
  //Add 1 of each equippable item to random location
  var templates = ['dagger', 'sword', 'staff', 'tunic', 'chainmail', 'platemail'];
  for (var i = 0; i < templates.length; i++) {
    this.addItemAtRandomPosition(Game.ItemRepository.create(templates[i]), Math.floor(this._depth * Math.random()));
  }
  //Add hole to final dungeon at bottom of cave.
  var holePosition = this.getRandomFloorPosition(this._depth - 1);
  this._tiles[this._depth - 1][holePosition.x][holePosition.y] = Game.Tile.holeToCavernTile;
}
Game.Map.Cave.extend(Game.Map);