var Game = {
  display: null,
  player: null,
  engine: null,
  map: {},
  bananas: null,

  init: function() {
    this.display = new ROT.Display();
    document.body.appendChild(this.display.getContainer());

    this._generateMap();

    var scheduler = new ROT.Scheduler.Simple();
    scheduler.add(this.player, true);
    scheduler.add(this.michael, true);    

    this.engine = new ROT.Engine(scheduler);
    this.engine.start();
  }
}

var Player = function(x, y) {
  this._x = x;
  this._y = y;
  this._draw();
}

Player.prototype.getX = function() { return this._x; }
Player.prototype.getY = function() { return this._y; }


var Michael = function(x, y) {
  this._x = x;
  this._y = y;
  this._draw();
}

Michael.prototype.act = function() {
  var x = Game.player.getX();
  var y = Game.player.getY();
  var passableCallback = function(x, y) {
    return (x+","+y in Game.map);
  }
  var astar = new ROT.Path.AStar(x, y, passableCallback, {topology:4});

  var path = [];
  var pathCallback = function(x, y) {
    path.push([x, y]);
  }
  astar.compute(this._x, this._y, pathCallback);

  path.shift(); //discard current position
  if (path.length == 1) {
    Game.engine.lock();
    alert("Game over - you were captured by an angry Michael!");
  } else {
    x = path[0][0];
    y = path[0][1];
    Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
    this._x = x;
    this._y = y;
    this._draw();
  }
}

Player.prototype.act = function() {
  Game.engine.lock();
  //await key press
  window.addEventListener("keydown", this);
}

Player.prototype.handleEvent = function(e) {
  var keyMap = {};
  keyMap[38] = 0;
  keyMap[33] = 1;
  keyMap[39] = 2;
  keyMap[34] = 3;
  keyMap[40] = 4;
  keyMap[35] = 5;
  keyMap[37] = 6;
  keyMap[36] = 7;

  var code = e.keyCode;

  if(code == 13 || code == 32) {
    this._checkBox();
    return;
  }

  if(!(code in keyMap)) { return; }

  var diff = ROT.DIRS[8][keyMap[code]];
  var newX = this._x + diff[0];
  var newY = this._y + diff[1];

  var newKey = newX + "," + newY;
  if (!(newKey in Game.map)) { return; } //prevent move into wall

  Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
  this._x = newX;
  this._y = newY;
  this._draw();
  window.removeEventListener("keydown", this);
  Game.engine.unlock();
}

Player.prototype._draw = function() {
  Game.display.draw(this._x, this._y, "@", "#ff0");
}

Michael.prototype._draw = function() {
  Game.display.draw(this._x, this._y, "M", "red");
}

Player.prototype._checkBox = function() {
  var key = this._x + "," + this._y;
  if (Game.map[key] != "*") {
    alert("There is no box here!");
  } else if(key == Game.bananas) {
    alert("You found the bananas and won!")
    Game.engine.lock();
    window.removeEventListener("keydown", this);
  } else {
    alert("Empty box! Keep looking for the bananas!")
  }
}

Game._generateMap = function() {
  var digger = new ROT.Map.Digger();
  var freeCells = [];

  var digCallback = function(x, y, value) {
    if (value) { return; } //don't store walls

    var key = x+","+y;
    freeCells.push(key);
    this.map[key] = ".";
  }
  digger.create(digCallback.bind(this));
  this._generateBoxes(freeCells);
  this._drawWholeMap();
  this.player = this._createBeing(Player, freeCells);
  this.michael = this._createBeing(Michael, freeCells);
  
}

Game._createBeing = function(being, freeCells) {
  var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
  var key = freeCells.splice(index, 1)[0];
  var parts = key.split(",");
  var x = parseInt(parts[0]);
  var y = parseInt(parts[1]);
  return new being(x, y);
}

Game._generateBoxes = function(freeCells) {
  for (var i=0;i<10;i++) {
    var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
    var key = freeCells.splice(index, 1)[0];
    this.map[key] = "*";
    if (!i) { this.bananas = key; }
  }
}

Game._drawWholeMap = function() {
  for (var key in this.map) {
    var parts = key.split(",");
    var x = parseInt(parts[0]);
    var y = parseInt(parts[1]);
    this.display.draw(x, y, this.map[key]);
  }
}