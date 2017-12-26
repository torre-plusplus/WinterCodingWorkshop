Game.Screen = {};

Game.Screen.startScreen = {
  enter: function() { console.log("Entered start screen."); },
  exit: function() { console.log("Exited start screen"); },
  render: function(display) {
    display.drawText(1,1, "%c{yellow}Rougelike #2");
    display.drawText(1,2, "Press [Enter] to start.");
  },
  handleInput: function(inputType, inputData) {
    if (inputType === 'keydown') {
      if (inputData.keyCode === ROT.VK_RETURN) {
        Game.switchScreen(Game.Screen.playScreen);
      }
    }
  }
}

Game.Screen.playScreen = {
  _player: null,
  _gameEnded: false,
  _subScreen: null,
  getPlayerDepth: function() {
    return this._player.getZ();
  },
  enter: function() { 
    //Use even numbers for map size!
    var width = 100;
    var height = 48;
    var depth = 6;
    var tiles = new Game.Builder(width, height, depth).getTiles();
    this._player = new Game.Entity(Game.PlayerTemplate);
    var map = new Game.Map.Cave(tiles, this._player);
    map.getEngine().start();
  },
  move: function(dX, dY, dZ) {
    var newX = this._player.getX() + dX;
    var newY = this._player.getY() + dY;
    var newZ = this._player.getZ() + dZ;
    this._player.tryMove(newX, newY, newZ, this._player.getMap());
  },
  exit: function() { console.log("Exited play screen"); },
  render: function(display) {
    //if subscreen present, render that instead
    if(this._subScreen) {
      this._subScreen.render(display);
      return;
    }

    var screenWidth = Game.getScreenWidth();
    var screenHeight = Game.getScreenHeight();

    this.renderTiles(display);

    //Render Messages
    var messages = this._player.getMessages();
    var messageY = 0;
    for (var i = 0; i < messages.length; i++) {
      messageY += display.drawText(0, messageY, '%c{white}%b{black}' + messages[i]);
    }

    //Render player stats
    var stats = '%c{white}%b{black}';
    stats += vsprintf('HP: %d/%d Lvl: %d Exp: %d', [this._player.getHp(), this._player.getMaxHp(), this._player.getLevel(), this._player.getExperience()]);
    display.drawText(0, screenHeight, stats);
    var hungerState = this._player.getHungerState();
    display.drawText(screenWidth - hungerState.length, screenHeight, hungerState);
  },
  getScreenOffsets: function() {
    //Check rendering for out-of-bounds (corners)
    var topLeftX = Math.max(0, this._player.getX() - (Game.getScreenWidth() / 2));
    topLeftX = Math.min(topLeftX, this._player.getMap().getWidth() - Game.getScreenWidth());
    var topLeftY = Math.max(0, this._player.getY() - (Game.getScreenHeight() / 2));
    topLeftY = Math.min(topLeftY, this._player.getMap().getHeight() - Game.getScreenHeight());

    return { x: topLeftX, y: topLeftY };
  },
  renderTiles: function(display) {
    var screenWidth = Game.getScreenWidth();
    var screenHeight = Game.getScreenHeight();
    var offsets = this.getScreenOffsets();
    var topLeftX = offsets.x;
    var topLeftY = offsets.y;

    //Find visible cells in field of view
    var visibleCells = {};
    var map = this._player.getMap();
    var currentDepth = this._player.getZ();
    map.getFov(currentDepth).compute(
      this._player.getX(), this._player.getY(), this._player.getSightRadius(), function(x, y, radius, visibility){
        visibleCells[x + "," + y] = true;
        map.setExplored(x, y, currentDepth, true);
      });

    //Render visible map, overriding with items or entities if within range.
    for (var x = topLeftX; x < topLeftX + screenWidth; x++) {
      for (var y = topLeftY; y < topLeftY + screenHeight; y++) {
        if (map.isExplored(x, y, currentDepth)) {
          var glyph = map.getTile(x, y, currentDepth);
            var foreground = glyph.getForeground();
            if (visibleCells[x+ ',' + y]) {
              var items = map.getItemsAt(x, y, currentDepth);
              if (items) {
                glyph = items[items.length - 1];
              }
              if (map.getEntityAt(x, y, currentDepth)) {
                glyph = map.getEntityAt(x, y, currentDepth);
              }
              foreground = glyph.getForeground();
            } else {
              foreground = 'darkGray';
            }
          display.draw(x - topLeftX, y - topLeftY, glyph.getChar(), foreground, glyph.getBackground());
        }
      }
    }
  },
  handleInput: function(inputType, inputData) {
    //lock input if game over
    if (this._gameEnded) {
      if (inputType === 'keydown' && inputData.keyCode === ROT.VK_RETURN) {
        Game.switchScreen(Game.Screen.loseScreen);
      }
      return;
    }
    //forward handling to subscreen, if present
    if (this._subScreen) {
      this._subScreen.handleInput(inputType, inputData);
      return;
    }
    //handle inputs for main screen
    if (inputType === 'keydown') {
      //Movement
      if (inputData.keyCode === ROT.VK_LEFT) {
        this.move(-1, 0, 0);
      } else if (inputData.keyCode === ROT.VK_RIGHT) {
        this.move(1, 0, 0);
      } else if (inputData.keyCode === ROT.VK_UP) {
        this.move(0, -1, 0);
      } else if (inputData.keyCode === ROT.VK_DOWN) {
        this.move(0, 1, 0);
      } else if (inputData.keyCode === ROT.VK_I) {
        this.showItemsSubScreen(Game.Screen.inventoryScreen, this._player.getItems(), 'You are not carrying anything.');
        return;
      } else if (inputData.keyCode === ROT.VK_D) {
        this.showItemsSubScreen(Game.Screen.dropScreen, this._player.getItems(), 'You have nothing to drop.');
        return;
      } else if (inputData.keyCode === ROT.VK_E) {
        this.showItemsSubScreen(Game.Screen.eatScreen, this._player.getItems(), 'You have nothing to eat.');
        return;
      } else if (inputData.keyCode === ROT.VK_W) {
        if (inputData.shiftKey) {
          this.showItemsSubScreen(Game.Screen.wearScreen, this._player.getItems(), 'You have nothing to wear.');
          return;  
        } else {
          this.showItemsSubScreen(Game.Screen.wieldScreen, this._player.getItems(), 'You have nothing to wield.');
          return;
        }
      } else if (inputData.keyCode === ROT.VK_X) {
        this.showItemsSubScreen(Game.Screen.examineScreen, this._player.getItems(), "You have nothing to examine!");
        return;
      } else if (inputData.keyCode === ROT.VK_COMMA) {
        var items = this._player.getMap().getItemsAt(this._player.getX(), this._player.getY(), this._player.getZ());
        if (items && items.length === 1) {
          var item = items[0];
          if (this._player.pickupItems([0])) {
            Game.sendMessage(this._player, "You pick up %s.", [item.describeA()]);
          } else {
            Game.sendMessage(this._player, "Your inventory is full. Cannot pick up items.")
          }
        } else {
          this.showItemsSubScreen(Game.Screen.pickupScreen, items, 'There is nothing to pick up.');
        }
      } else {
        //not a valid key
        return;
      }
      this._player.getMap().getEngine().unlock();
    } else if (inputType === 'keypress') {
      var keyChar = String.fromCharCode(inputData.charCode);
      if (keyChar === '>') {
        this.move(0, 0, 1);
      } else if (keyChar === '<') {
        this.move(0, 0, -1);
      } else if (keyChar === ';') {
        var offsets = this.getScreenOffsets();
        Game.Screen.lookScreen.setup(this._player, this._player.getX(), this._player.getY(), offsets.x, offsets.y);
        this.setSubScreen(Game.Screen.lookScreen);
        return;
      } else if (keyChar === '?') {
        this.setSubScreen(Game.Screen.helpScreen);
        return;
      } else {
        //not a valid key
        return;
      }
      this._player.getMap().getEngine().unlock();
    }
  },
  setGameEnded: function(gameEnded) {
    this._gameEnded = gameEnded;
  },
  setSubScreen: function(subScreen) {
    this._subScreen = subScreen;
    Game.refresh();
  },
  showItemsSubScreen: function(subScreen, items, emptyMessage) {
    if (items && subScreen.setup(this._player, items) > 0) {
      this.setSubScreen(subScreen);
    } else {
      Game.sendMessage(this._player, emptyMessage);
      Game.refresh();
    }
  }
}

//Stat increase subscreen
Game.Screen.gainStatsScreen = {
  setup: function(entity) {
    this._entity = entity;
    this._options = entity.getStatOptions();
  },
  render : function(display) {
    var letters ='abcdefghijklmnopqrstuvwxyz';
    display.drawText(0, 0, 'Choose a stat to increase: ');

    for (var i = 0; i < this._options.length; i++) {
      display.drawText(0, 2 + i, letters.substring(i, i + 1) + '-' + this._options[i][0]);
    }

    display.drawText(0, 4 + this._options.length, "Remaining points: " + this._entity.getStatPoints());
  },
  handleInput: function(inputType, inputData) {
    if (inputType === 'keydown') {
      var index = inputData.keyCode - ROT.VK_A;
      if (this._options[index]) {
        this._options[index][1].call(this._entity);
        this._entity.setStatPoints(this._entity.getStatPoints() - 1);
        if (this._entity.getStatPoints() === 0) {
          Game.Screen.playScreen.setSubScreen(undefined);
        } else {
          Game.refresh();
        }
      }
    }
  }
};

//Item Subscreen and proto functions
Game.Screen.ItemListScreen = function(template) {
  this._caption = template['caption'];
  this._okFunction = template['ok'];
  this._isAcceptableFunction = template['isAcceptable'] || function(x) {
    return x;
  }
  this._canSelectItem = template['canSelect'];
  this._canSelectMultipleItems = template['canSelectMultipleItems'];
  this._hasNoItemOption = template['hasNoItemOption'];
}
Game.Screen.ItemListScreen.prototype.setup = function(player, items) {
  this._player = player;
  //Count acceptable items for screen 
  var count = 0;
  var that = this;
  this._items = items.map(function(item) {
    if (that._isAcceptableFunction(item)) {
      count++;
      return item;
    } else {
      return null;
    }
  });
  this._selectedIndices = {};
  return count;
}
Game.Screen.ItemListScreen.prototype.render = function(display) {
  var letters = 'abcdefghijklmnopqrstuvwxyz';
  display.drawText(0, 0, this._caption);
  if (this._hasNoItemOption) {
    display.drawText(0, 1, '0 - no item');
  }
  var row = 0;
  for (var i = 0; i < this._items.length; i++) {
    if (this._items[i]) {
      var letter = letters.substring(i, i + 1);
      var selectionState = (this._canSelectItem && this._canSelectMultipleItems && this._selectedIndices[i]) ? '+' : '-';
      var suffix = '';
      if (this._items[i] === this._player.getArmor()) {
        suffix = ' (wearing)';
      } else if (this._items[i] === this._player.getWeapon()) {
        suffix = ' (wielding)';
      }
      display.drawText(0, 2 + row, letter + ' ' + selectionState + ' ' + this._items[i].describe() + suffix);
      row++;
    }
  }
}
Game.Screen.ItemListScreen.prototype.executeOkFunction = function() {
  //collect selected items
  var selectedItems = {};
  for (var key in this._selectedIndices) {
    selectedItems[key] = this._items[key];
  }
  //return to play screen
  Game.Screen.playScreen.setSubScreen(undefined);
  //Call OK function and end players turn if items selected properly
  if (this._okFunction(selectedItems)) {
    this._player.getMap().getEngine().unlock();
  }
}
Game.Screen.ItemListScreen.prototype.handleInput = function(inputType, inputData) {
  if (inputType === 'keydown') {
    if (inputData.keyCode === ROT.VK_ESCAPE || (inputData.keyCode === ROT.VK_RETURN && (!this._canSelectItem || Object.keys(this._selectedIndices).length === 0))) {
      Game.Screen.playScreen.setSubScreen(undefined);
    } else if (inputData.keyCode === ROT.VK_RETURN) {
      this.executeOkFunction();
    } else if (this._canSelectItem && this._hasNoItemOption && inputData.keyCode === ROT.VK_0) {
      this._selectedIndices = {};
      this.executeOkFunction();
    } else if (this._canSelectItem && inputData.keyCode >= ROT.VK_A && inputData.keyCode <= ROT.VK_Z) {
      var index = inputData.keyCode - ROT.VK_A;
      if (this._items[index]) {
        if (this._canSelectMultipleItems) {
          if (this._selectedIndices[index]) {
            delete this._selectedIndices[index];
          } else {
            this._selectedIndices[index] = true;
          }
          Game.refresh();
        } else {
          this._selectedIndices[index] = true;
          this.executeOkFunction();
        }
      }
    }
  }
}
//Templates for Item Screens
Game.Screen.inventoryScreen = new Game.Screen.ItemListScreen({
  caption: 'inventory',
  canSelect: false
});
Game.Screen.pickupScreen = new Game.Screen.ItemListScreen({
  caption: 'Select items to pick up',
  canSelect: true,
  canSelectMultipleItems: true,
  ok: function(selectedItems) {
    //attempt to pick up all items, message if all can't be held
    if (!this._player.pickupItems(Object.keys(selectedItems))) {
      Game.sendMessage(this._player, "Your inventory is full. Not all items picked up.")
    }
    return true;
  }
});
Game.Screen.dropScreen = new Game.Screen.ItemListScreen({
  caption: 'Select item to drop',
  canSelect: true,
  canSelectMultipleItems: false,
  ok: function(selectedItems) {
    this._player.dropItem(Object.keys(selectedItems)[0]);
    return true;
  }
});
Game.Screen.eatScreen = new Game.Screen.ItemListScreen({
  caption: "Choose the item you wish to eat",
  canSelect: true,
  canSelectMultipleItems: false,
  isAcceptable: function(item) {
    return item && item.hasMixin('Edible');
  },
  ok: function(selectedItems) {
    var key = Object.keys(selectedItems)[0];
    var item = selectedItems[key];
    Game.sendMessage(this._player, "You eat %s.", [item.describeThe()]);
    item.eat(this._player);
    if (!item.hasRemainingConsumptions()) {
      this._player.removeItem(key);
    }
    return true;
  }
});
Game.Screen.wieldScreen = new Game.Screen.ItemListScreen({
  caption: 'Choose the item you wish to wield',
  canSelect: true,
  canSelectMultipleItems: false,
  hasNoItemOption: true,
  isAcceptable: function(item) {
    return item && item.hasMixin("Equippable") && item.isWieldable();
  },
  ok: function(selectedItems) {
    var keys = Object.keys(selectedItems);
    if (keys.length === 0) {
      this._player.unwield();
      Game.sendMessage(this._player, "You are empty handed.");
    } else {
      var item = selectedItems[keys[0]];
      this._player.unequip(item);
      this._player.wield(item);
      Game.sendMessage(this._player, "You are wielding %s", [item.describeA()]);
    }
    return true;
  }
});
Game.Screen.wearScreen = new Game.Screen.ItemListScreen({
  caption: 'Choose the item you wish to wear',
  canSelect: true,
  canSelectMultipleItems: false,
  hasNoItemOption: true,
  isAcceptable: function(item) {
    return item && item.hasMixin("Equippable") && item.isWearable();
  },
  ok: function(selectedItems) {
    var keys = Object.keys(selectedItems);
    if (keys.length === 0) {
      this._player.takeOff();
      Game.sendMessage(this._player, "You are empty handed.");
    } else {
      var item = selectedItems[keys[0]];
      this._player.unequip(item);
      this._player.wear(item);
      Game.sendMessage(this._player, "You are wearing %s", [item.describeA()]);
    }
    return true;
  }
});
//Examine Screen
Game.Screen.examineScreen = new Game.Screen.ItemListScreen({
  caption: 'Choose the item you wish to examine:',
  canSelect: true,
  canSelectMultipleItems: false,
  isAcceptable: function(item) {
    return  true;
  },
  ok: function(selectedItems) {
    var keys = Object.keys(selectedItems);
    if (keys.length > 0) {
      var item = selectedItems[keys[0]];
      Game.sendMessage(this._player, "It's %s (%s).", [item.describeA(false), item.details()])
    }
    return true;
  }
});

Game.Screen.winScreen = {
  enter: function() { console.log("Entered win screen."); },
  exit: function() { console.log("Exited win screen"); },
  render: function(display) {
    for(var i = 0; i < 22; i++) {
      var r = Math.round(Math.random() *255);
      var g = Math.round(Math.random() *255);
      var b = Math.round(Math.random() *255);
      var background = ROT.Color.toRGB([r, g, b]);
      display.drawText(2, i + 1, "%b{" + background + "}You win!");
    }    
  },
  handleInput: function(inputType, inputData) {
  }
}

Game.Screen.loseScreen = {
  enter: function() { console.log("Entered lose screen."); },
  exit: function() { console.log("Exited lose screen"); },
  render: function(display) {
    for(var i = 0; i < 22; i++) {
      display.drawText(i +1 ,i + 1, "%b{red}Game over...");
    }
  },
  handleInput: function(inputType, inputData) {
  }
}

Game.Screen.TargetBasedScreen = function(template) {
  template = template || {};
  this._isAcceptableFunction = template['okFunction'] || function(x, y) {
    return false;
  };
  this._captionFunction = template['captionFunction'] || function(x, y) {
    return '';
  };
}

//Target based screen class
Game.Screen.TargetBasedScreen.prototype.setup = function(player, startX, startY, offsetX, offsetY) {
  this._player = player;
  this._startX = startX - offsetX;
  this._startY = startY - offsetY;
  this._cursorX = this._startX;
  this._cursorY = this._startY;
  this._offsetX = offsetX;
  this._offsetY = offsetY;
  var visibleCells = {};
  this._player.getMap().getFov(this._player.getZ()).compute(
      this._player.getX(), this._player.getY(), this._player.getSightRadius(), function(x, y, radius, visibility){
        visibleCells[x + "," + y] = true;
      });
  this._visibleCells = visibleCells;
}
Game.Screen.TargetBasedScreen.prototype.render = function(display) {
  Game.Screen.playScreen.renderTiles.call(Game.Screen.playScreen, display);

  var points = Game.Geometry.getLine(this._startX, this._startY, this._cursorX, this._cursorY);

  for (var i =  0, l = points.length; i < l; i++) {
    display.drawText(points[i].x, points[i].y, '%c{magenta}*');
  }

  display.drawText(0, Game.getScreenHeight() - 1, this._captionFunction(this._cursorX + this._offsetX, this._cursorY + this._offsetY));
}
Game.Screen.TargetBasedScreen.prototype.handleInput = function(inputType, inputData) {
  if (inputType == 'keydown') {
    if (inputData.keyCode === ROT.VK_LEFT) {
      this.moveCursor(-1, 0);
    } else if (inputData.keyCode === ROT.VK_RIGHT) {
      this.moveCursor(1, 0);
    } else if (inputData.keyCode === ROT.VK_UP) {
      this.moveCursor(0, -1);
    } else if (inputData.keyCode === ROT.VK_DOWN) {
      this.moveCursor(0, 1);
    } else if (inputData.keyCode === ROT.VK_ESCAPE) {
      Game.Screen.playScreen.setSubScreen(undefined);
    } else if (inputData.keyCode === ROT.VK_RETURN) {
      this.executeOkFunction();
    }
  }
  Game.refresh();
}
Game.Screen.TargetBasedScreen.prototype.moveCursor = function(dx, dy) {
  this._cursorX = Math.max(0, Math.min(this._cursorX + dx, Game.getScreenWidth()));
  this._cursorY = Math.max(0, Math.min(this._cursorY + dy, Game.getScreenHeight()));
}
Game.Screen.TargetBasedScreen.prototype.executeOkFunction = function() {
  Game.Screen.playScreen.setSubScreen(undefined);
  if (this._okFunction(this._cursorX + this._offsetX, this._cursorY + this._offsetY)) {
    this._player.getMap().getEngine().unlock();
  }
}

//Look Screen template for Target Screen
Game.Screen.lookScreen = new Game.Screen.TargetBasedScreen({
  captionFunction: function(x, y) {
    var z = this._player.getZ();
    var map = this._player.getMap();
    if (map.isExplored(x, y, z)) {
      if (this._visibleCells[x + ',' + y]) {
        var items = map.getItemsAt(x, y, z);
        if (items) {
          var item = items[items.length - 1];
          return String.format('%s - %s (%s)', item.getRepresentation(), item.describeA(true), item.details());
        } else if (map.getEntityAt(x, y, z)) {
          var entity = map.getEntityAt(x, y, z);
          return String.format('%s - %s (%s)', entity.getRepresentation(), entity.describeA(true), entity.details());
        }
      }
      //Tile description if not item or entity
      return String.format('%s - %s (%s)', map.getTile(x, y, z).getRepresentation(), map.getTile(x, y, z).getDescription());
    } else {
      //Return null tile if tile hasn't been explored
      return String.format('%s - %s (%s)', Game.Tile.nullTile.getRepresentation(), Game.Tile.nullTile.getDescription());
    }
  }
})

//Help Screen Template
Game.Screen.helpScreen = {
  render: function(display) {
    var text = 'Help Screen.'
    var border = '--------------------'
    var y = 0;
    display.drawText(Game.getScreenWidth() / 2 - text.length / 2, y++, text);
    display.drawText(Game.getScreenWidth() / 2 - border.length / 2, y++, border);
    display.drawText(0, y++, 'The villagers have been complaining of a terrible stench coming from the cave.');
    display.drawText(0, y++, 'Find the source of the putrid smell and get rid of it!');
    y += 3;
    display.drawText(0, y++, '[,] to pickup items!');
    display.drawText(0, y++, '[d] to drop items!');
    display.drawText(0, y++, '[e] to eat items!');
    display.drawText(0, y++, '[w] to wield items!');
    display.drawText(0, y++, '[W] to wear items!');
    display.drawText(0, y++, '[x] to examine items!');
    display.drawText(0, y++, '[;] to look around!');
    display.drawText(0, y++, '[?] to show this help screen!');
    y += 3;
    text = '--- press any key to continue ---';
    display.drawText(Game.getScreenWidth() / 2 - text.length / 2, y++, text);
  },
  handleInput: function(inputType, inputData) {
    Game.Screen.playScreen.setSubScreen(null);
  }
}