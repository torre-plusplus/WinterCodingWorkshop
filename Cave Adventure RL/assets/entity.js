Game.Entity = function(properties) {
  properties = properties || {};
  Game.DynamicGlyph.call(this, properties);

  this._x = properties['x'] || 0;
  this._y = properties['y'] || 0;
  this._z = properties['z'] || 0;
  this._map = null;


  this._alive = true;
  
  this._attachedMixins = {};
  this._attachedMixinGroups = {};

  var mixins = properties['mixins'] || [];
  for (var i = 0; i < mixins.length; i++) {
    for (var key  in mixins[i]) {
      if (key != 'init' && key != 'name' && !this.hasOwnProperty(key)) {
        this[key] = mixins[i][key];
      }
    }
    this._attachedMixins[mixins[i].name] = true;
    if (mixins[i].groupName) {
      this._attachedMixinGroups[mixins[i].groupName] = true;
    }
    if (mixins[i].init) {
      mixins[i].init.call(this, properties);
    }
  }

  this._speed = properties['speed'] || 1000;
}

//Inherit all methods from Glyph class.
Game.Entity.extend(Game.DynamicGlyph);

//Setters
Game.Entity.prototype.setX = function(x) {
  this._x = x;
}
Game.Entity.prototype.setY = function(y) {
  this._y = y;
}
Game.Entity.prototype.setZ = function(z) {
  this._z =z;
}
Game.Entity.prototype.setMap = function(map) {
  this._map = map;
}
Game.Entity.prototype.setSpeed = function(speed) {
  this._speed = speed;
}
Game.Entity.prototype.setPosition = function(x, y, z) {
  var oldX = this._x;
  var oldY = this._y;
  var oldZ = this._z;

  this._x = x;
  this._y = y;
  this._z = z;

  if(this._map) {
    this._map.updateEntityPosition(this, oldX, oldY, oldZ);
  }
}

//Getters
Game.Entity.prototype.getX = function() {
  return this._x;
}
Game.Entity.prototype.getY = function() {
  return this._y;
}
Game.Entity.prototype.getZ = function() {
  return this._z;
}
Game.Entity.prototype.getMap = function() {
  return this._map;
}
Game.Entity.prototype.getSpeed = function() {
  return this._speed;
}
Game.Entity.prototype.isAlive = function() {
  return this._alive;
}


Game.Entity.prototype.tryMove = function(x, y, z, map) {
  var map = this.getMap();
  var tile = map.getTile(x, y, this.getZ());
  var target = map.getEntityAt(x, y, this.getZ());
  //If z level changed, check for stairs tile.
  if (z < this.getZ()) {
    if (tile != Game.Tile.stairsUpTile) {
      Game.sendMessage(this, "You can't go up here!");
    } else {
      Game.sendMessage(this, "You ascend to level %d!", [z + 1]);
      this.setPosition(x, y, z);
    }
  } else if (z > this.getZ()) {
    if (tile === Game.Tile.holeToCavernTile && this.hasMixin(Game.EntityMixins.PlayerActor)) {
      this.switchMap(new Game.Map.BossCavern());
    } else if (tile != Game.Tile.stairsDownTile) {
      Game.sendMessage(this, "You can't go down here!");
    } else {
      Game.sendMessage(this, "You descend to level %d!", [z + 1]);
      this.setPosition(x, y, z);
    }
  } else if (target) {
    if (this.hasMixin('Attacker') && (this.hasMixin(Game.EntityMixins.PlayerActor) || target.hasMixin(Game.EntityMixins.PlayerActor))) {
      this.attack(target);
      return true;
    } else {
      return false;
    }
  } else if (tile.isWalkable()) {
    this.setPosition(x, y, z);
    var items = this.getMap().getItemsAt(x, y, z);
    if (items) {
      if (items.length === 1) {
        Game.sendMessage(this, "You see %s.", [items[0].describeA()]);
      } else {
        Game.sendMessage(this, "There are several items here.")
      }
    }
    return true;
  } else if (tile.isDiggable() && this.hasMixin(Game.EntityMixins.PlayerActor)) {
    map.dig(x, y, z);
    return true;
  }
  return false;
}

Game.Entity.prototype.kill = function(message) {
  if (!this._alive) {
    //Can't kill the already dead.
    return;
  }
  this._alive = false;
  if(message) {
    Game.sendMessage(this, message);
  } else {
    Game.sendMessage(this, 'You have died.')
  }

  if (this.hasMixin(Game.EntityMixins.PlayerActor)) {
    this.act();
  } else {
    this.getMap().removeEntity(this);
  }
}

Game.Entity.prototype.switchMap = function(newMap) {
  if (newMap === this.getMap()) {
    return;
  }
  this.getMap().removeEntity(this);
  this._x = 0;
  this._y = 0;
  this._z = 0;

  newMap.addEntity(this);
}