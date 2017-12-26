Game.EntityMixins = {};

Game.sendMessage = function(recipient, message, args) {
  if (recipient.hasMixin(Game.EntityMixins.MessageRecipient)) {
    //formatting only needed if args present
    if (args) {
      message = vsprintf(message, args);
    }
    recipient.receiveMessage(message);
  }
}

Game.sendMessageNearby = function(map, centerX, centerY, centerZ, message, args) {
  if (args) {
    message = vsprintf(message, args);
  }
  entities = map.getEntitiesWithinRadius(centerX, centerY, centerZ, 5);
  for (var i = 0; i < entities.length; i++) {
    if (entities[i].hasMixin(Game.EntityMixins.MessageRecipient)) {
      entities[i].receiveMessage(message);
    }
  }
}

//Mixins
Game.EntityMixins.PlayerActor = {
  name: 'PlayerActor',
  groupName: 'Actor',
  act: function() {
    if (this._acting) {
      return;
    }
    this._acting = true;
    this.addTurnHunger();

    if (!this.isAlive()) {
      Game.Screen.playScreen.setGameEnded(true);
      Game.sendMessage(this, 'You have died... Press [Enter]...');
    }
    Game.refresh();
    this.getMap().getEngine().lock();
    this.clearMessages();
    this._acting = false;
  }
}
Game.EntityMixins.FungusActor = {
  name: 'FungusActor',
  groupName: 'Actor',
  init: function() {
    this._growthsRemaining = 5;
  },
  act: function() {
    if (this._growthsRemaining > 0 && this.getZ() == Game.Screen.playScreen.getPlayerDepth()) {
      if (Math.random() <= 0.02) {
        var xOffset = Math.floor(Math.random() * 3) - 1;
        var yOffset = Math.floor(Math.random() * 3) - 1;
        if (xOffset != 0 || yOffset != 0) {
          if(this.getMap().isEmptyFloor(this.getX() + xOffset, this.getY() + yOffset, this.getZ())) {
            var entity = Game.EntityRepository.create('fungus');
            entity.setPosition(this.getX() + xOffset, this.getY() + yOffset, this.getZ());
            this.getMap().addEntity(entity);
            this._growthsRemaining--;

            //Send message nearby
            Game.sendMessageNearby(this.getMap(), entity.getX(), entity.getY(), entity.getZ(), 'The fungus is spreading!');
          }
        }
      }
    }
  }
}
Game.EntityMixins.Destructible = {
  name: 'Destructible',
  init: function(template) {
    this._maxHp = template['maxHp'] || 10;
    this._hp = template['hp'] || this._maxHp;
    this._defenseValue = template['defenseValue'] || 0;
  },
  getHp: function() {
    return this._hp;
  },
  setHp: function(hp) {
    this._hp = hp;
  },
  getMaxHp: function() {
    return this._maxHp;
  },
  getDefenseValue: function() {
    var modifier = 0;
    if(this.hasMixin(Game.EntityMixins.Equipper)) {
      if (this.getWeapon()) {
        modifier += this.getWeapon().getDefenseValue();
      }
      if (this.getArmor()) {
        modifier += this.getArmor().getDefenseValue();
      }
    }
    return this._defenseValue + modifier;
  },
  increaseDefenseValue: function(value) {
    value = value || 2;
    this._defenseValue += value;
    Game.sendMessage(this, "You look tougher!");
  },
  increaseMaxHp: function(value) {
    value = value || 10;
    this._maxHp += value;
    this._hp += value;
    Game.sendMessage(this, "You look healthier!");
  },
  takeDamage: function(attacker, damage) {
    this._hp -= damage;
    if (this._hp <= 0) {
      Game.sendMessage(attacker, 'You kill the %s', [this.getName()]);
      this.raiseEvent('onDeath', attacker);
      attacker.raiseEvent('onKill', this);
      this.kill();
    }
  },
  listeners: {
    onGainLevel: function() {
      this.setHp(this.getMaxHp());
    },
    details: function() {
      return [
        { key: 'defense', value: this.getDefenseValue() },
        { key: 'hp', value: this.getHp() }
      ];
    }
  }
}
Game.EntityMixins.Attacker = {
  name: 'Attacker',
  groupName: 'Attacker',
  init: function(template) {
    this._attackValue = template['attackValue'] || 1;
  },
  getAttackValue: function() {
    var modifier = 0;
    if(this.hasMixin(Game.EntityMixins.Equipper)) {
      if (this.getWeapon()) {
        modifier += this.getWeapon().getAttackValue();
      }
      if (this.getArmor()) {
        modifier += this.getArmor().getAttackValue();
      }
    }
    return this._attackValue + modifier;
  },
  increaseAttackValue: function(value) {
    value = value || 2;
    this._attackValue += value;
    Game.sendMessage(this, "You look stronger!");
  },
  attack: function(target) {
    if (target.hasMixin('Destructible')) {
      var attack = this.getAttackValue();
      var defense = target.getDefenseValue();
      var max = Math.max(0, attack - defense);
      var damage = 1 + Math.floor(Math.random() * max);

      Game.sendMessage(this, "You strike the %s for %d damage!", [target.getName(), damage]);
      Game.sendMessage(target, 'The %s strikes you for %d damage!', [this.getName(), damage]);

      target.takeDamage(this, damage);
    }
  },
  listeners: {
    details: function() {
      return [{key: 'attack', value: this.getAttackValue()}];
    }
  }
}
Game.EntityMixins.MessageRecipient = {
  name: 'MessageRecipient',
  init: function(template) {
    this._messages = [];
  },
  receiveMessage: function(message) {
    this._messages.push(message);
  },
  getMessages: function() {
    return this._messages;
  },
  clearMessages: function() {
    this._messages = [];
  }
}
Game.EntityMixins.Sight = {
  name: 'Sight',
  groupName: 'Sight',
  init: function(template) {
    this._sightRadius = template['sightRadius'] || 5;
  },
  getSightRadius: function() {
    return this._sightRadius;
  },
  increaseSightRadius: function(value) {
    value = value || 1;
    this._sightRadius += value;
    Game.sendMessage(this, "You look keener of eye!");
  },
  canSee: function(entity) {
    //Match depths
    if (!entity || this._map !== entity.getMap() || this._z !== entity.getZ()) {
      return false;
    }

    var otherX = entity.getX();
    var otherY = entity.getY();

    //check for square field of view
    if ((otherX - this._x) * (otherX - this._x) + (otherY - this._y) * (otherY - this._y) > this._sightRadius * this._sightRadius) {
      return false;
    }

    //compute FOV and check coordinates
    var found = false;
    this.getMap().getFov(this.getZ()).compute(this.getX(), this.getY(), this.getSightRadius(), function(x, y, radius, visibility) {
      if (x === otherX && y === otherY) {
        found = true;
      }
    });
    return found;
  }
}
Game.EntityMixins.TaskActor = {
  name: 'TaskActor',
  groupName: 'Actor',
  init: function(template) {
    this._tasks = template['tasks'] || ['wander'];
  },
  act: function() {
    for(var i = 0; i < this._tasks.length; i++) {
      if (this.canDoTask(this._tasks[i])) {
        this[this._tasks[i]]();
        return;
      }
    }
  },
  canDoTask: function(task) {
    if (task === 'hunt') {
      return this.hasMixin('Sight') && this.canSee(this.getMap().getPlayer());
    } else if (task === 'wander') {
      return true;
    } else {
      throw new Error('Tried to perform undefined task [' + task + ']');
    }
  },
  hunt: function() {
    var player = this.getMap().getPlayer();

    //attack if possible
    var offsets = Math.abs(player.getX() - this.getX()) + Math.abs(player.getY() - this.getY());
    if (offsets === 1 && this.hasMixin('Attacker')) {
      this.attack(player);
      return;
    }

    var source = this;
    var z = source.getZ();
    var path = new ROT.Path.AStar(player.getX(), player.getY(), function(x, y) {
      var entity = source.getMap().getEntityAt(x, y, z);
      if (entity && entity !== player && entity !== source) {
        return false;
      }
      return source.getMap().getTile(x, y, z).isWalkable();
    }, { topology: 4 });

    var count = 0;
    path.compute(source.getX(), source.getY(), function(x, y) {
      if (count === 1 ) {
        source.tryMove(x, y, z);
      }
      count++;
    });
  },
  wander: function() {
    var moveOffset = (Math.round(Math.random()) === 1) ? 1 : -1;
    if (Math.round(Math.random()) === 1) {
      this.tryMove(this.getX() + moveOffset, this.getY(), this.getZ());
    } else {
      this.tryMove(this.getX(), this.getY() + moveOffset, this.getZ());
    }
  }
}
Game.EntityMixins.InventoryHolder = {
  name: 'InventoryHolder',
  init: function(template) {
    var inventorySlots = template['inventorySlots'] || 10;
    this._items = new Array(inventorySlots);
  },
  getItems: function() {
    return this._items;
  },
  getItem: function(i) {
    return this._items[i];
  },
  addItem: function(item) {
    //find empty slot and add
    for (var i = 0; i < this._items.length; i++) {
      if (!this._items[i]) {
        this._items[i] = item;
        return true;
      }
    }
    return false;
  },
  removeItem: function(i) {
    if (this._items[i] && this.hasMixin(Game.EntityMixins.Equipper)) {
      this.unequip(this._items[i]);
    }
    this._items[i] = null;
  },
  canAddItem: function() {
    for (var i = 0; i < this._items.length; i++) {
      if (!this._items[i]) {
        return true;
      }
    }
    return false;
  },
  pickupItems: function(indices) {
    var mapItems = this._map.getItemsAt(this.getX(), this.getY(), this.getZ());
    var added = 0;
    for (var i = 0; i < indices.length; i++) {
      //attempt to add all items from ground to inventory
      if (this.addItem(mapItems[indices[i] - added])) {
        mapItems.splice(indices[i] - added, 1);
        added++;
      } else {
        //inventory full
        break;
      }
    }
    //update items remaining on map
    this._map.setItemsAt(this.getX(), this.getY(), this.getZ(), mapItems);
    //return true if all added
    return added === indices.length;
  },
  dropItem: function(i) {
    if (this._items[i]) {
      if(this._map) {
        this._map.addItem(this.getX(), this.getY(), this.getZ(), this._items[i]);
      }
      this.removeItem(i);
    }
  }
}
Game.EntityMixins.FoodConsumer = {
  name: 'FoodConsumer',
  init: function(template) {
    this._maxFullness = template['maxFullness'] || 1000;
    this._fullness = template['fullness'] || (this._maxFullness / 2);
    this._fullnessDepletionRate = template['fullnessDepletionRate'] || 1;
  },
  addTurnHunger: function() {
    this.modifyFullnessBy(-this._fullnessDepletionRate);
  },
  modifyFullnessBy: function(points) {
    this._fullness = this._fullness + points;
    if (this._fullness <= 0) {
      this.kill("You have died of starvation.")
    } else if (this._fullness > this._maxFullness) {
      this.kill("Too full! Death by stomach explosion!")
    }
  },
  getHungerState: function() {
    var perPercent = this._maxFullness / 100;
    if (this._fullness <= perPercent * 5) {
      return 'Starving';
    } else if (this._fullness <= perPercent * 25) {
      return 'Hungry';
    } else if (this._fullness >= perPercent * 95) {
      return 'Oversatiated';
    } else if (this._fullness >= perPercent * 75) {
      return 'Full';
    } else {
      return 'Not Hungry';
    }
  }
}
Game.EntityMixins.CorpseDropper = {
  name: 'CorpseDropper',
  init: function(template) {
    this._corpseDropRate = template['corpseDropRate'] || 100;
  },
  listeners: {
    onDeath: function(attacker) {
      if (Math.round(Math.random() * 100) < this._corpseDropRate) {
        this._map.addItem(this.getX(), this.getY(), this.getZ(), Game.ItemRepository.create('corpse', 
        {
            name: this._name + ' corpse',
            foreground: this._foreground
        }));  
      }
    }
  }
}
Game.EntityMixins.Equipper = {
  name: 'Equipper',
  init: function(template) {
    this._weapon = null;
    this._armor = null;
  },
  wield: function(item) {
    this._weapon = item;
  },
  unwield: function() {
    this._weapon = null;
  },
  wear: function(item) {
    this._armor = item;
  },
  takeOff: function() {
    this._armor = null;
  },
  getWeapon: function() {
    return this._weapon;
  },
  getArmor: function() {
    return this._armor;
  },
  unequip: function(item) {
    //helper function called before dropping an item, in case it may be equipped.
    if (this._weapon === item) {
      this.unwield();
    }
    if (this._armor === item) {
      this.takeOff();
    }
  }
}
Game.EntityMixins.ExperienceGainer = {
  name: "ExperienceGainer",
  init: function(template) {
    this._level = template['level'] || 1;
    this._experience = template['experience'] || 0;
    this._statPointPerLevel = template['statPointPerLevel'] || 1;
    this._statPoints = 0;
    this._statOptions = [];

    if (this.hasMixin('Attacker')) {
      this._statOptions.push(['Increase attack value', this.increaseAttackValue]);
    }
    if (this.hasMixin('Destructible')) {
      this._statOptions.push(['Increase defense value', this.increaseDefenseValue]);
      this._statOptions.push(['Increase max health', this.increaseMaxHp]);
    }
    if (this.hasMixin('Sight')) {
      this._statOptions.push(['Increase sight range', this.increaseSightRadius]);
    }
  },
  getLevel: function() {
    return this._level;
  },
  getExperience: function() {
    return this._experience;
  },
  getNextLevelExperience: function() {
    return (this._level * this._level) * 10;
  },
  getStatPoints: function() {
    return this._statPoints;
  },
  setStatPoints: function(statPoints) {
    this._statPoints = statPoints;
  },
  getStatOptions: function() {
    return this._statOptions;
  },
  giveExperience: function(points) {
    var statPointsGained = 0;
    var levelsGained = 0;

    while (points > 0) {
      if (this._experience + points >= this.getNextLevelExperience()) {
        var usedPoints = this.getNextLevelExperience() - this._experience;
        points -= usedPoints;
        this._experience += usedPoints;
        this._level++;
        levelsGained++;
        this._statPoints += this._statPointPerLevel;
        statPointsGained += this._statPointPerLevel;
      } else {
        this._experience += points;
        points = 0;
      }
    }
    if (levelsGained > 0) {
      Game.sendMessage(this, "You advance to level %d", [this._level]);
      this.raiseEvent('onGainLevel');
    }
  },
  listeners: {
    onKill: function(victim) {
      var exp = victim.getMaxHp() + victim.getDefenseValue();
      if (victim.hasMixin('Attacker')) {
        exp += victim.getAttackValue();
      }
      if (victim.hasMixin('ExperienceGainer')) {
        exp -= (this.getLevel() - victim.getLevel()) * 3;
      }
      if (exp > 0) {
        this.giveExperience(exp);
      }
    },
    details: function() {
      return [{ key: 'level', value: this.getLevel() }];
    }
  }
}
Game.EntityMixins.RandomStatGainer = {
  name: 'RandomStatGainer',
  groupName: 'StatGainer',
  listeners: {
    onGainLevel: function() {
      var statOptions = this.getStatOptions();
      while (this.getStatPoints() > 0) {
        statOptions.random()[1].call(this);
        this.setStatPoints(this.getStatPoints() - 1);
      }
    }
  }
}
Game.EntityMixins.PlayerStatGainer = {
  name: 'PlayerStatGainer',
  groupName: 'StatGainer',
  listeners: {
    onGainLevel: function() {
      Game.Screen.gainStatsScreen.setup(this);
      Game.Screen.playScreen.setSubScreen(Game.Screen.gainStatsScreen);
    }
  }
}
Game.EntityMixins.GiantZombieActor = Game.extend(Game.EntityMixins.TaskActor, {
  init: function(template) {
    Game.EntityMixins.TaskActor.init.call(this, Game.extend(template, {
      'tasks': ['growArm', 'spawnSlime', 'hunt', 'wander']
    }));
    this._hasGrownArm = false;
  },
  canDoTask: function(task) {
    if (task === 'growArm') {
      return this.getHp() <= 20 && !this._hasGrownArm;
    } else if (task === 'spawnSlime') {
      return Math.round(Math.random() * 100) <= 10;
    } else {
      return Game.EntityMixins.TaskActor.canDoTask.call(this, task);
    }
  },
  growArm: function() {
    this._hasGrownArm = true;
    this.increaseAttackValue(5);
    Game.sendMessageNearby(this.getMap(), this.getX(), this.getY(), this.getZ(), 'An extra arm appears on the giant zombie!');
  },
  spawnSlime: function() {
    var xOffset = Math.floor(Math.random() * 3) - 1;
    var yOffset = Math.floor(Math.random() * 3) - 1;

    if (!this.getMap().isEmptyFloor(this.getX() + xOffset, this.getY() + yOffset, this.getZ())) {
      return;
    }

    var slime = Game.EntityRepository.create('slime');
    slime.setX(this.getX() + xOffset);
    slime.setY(this.getY() + yOffset);
    slime.setZ(this.getZ());
    this.getMap().addEntity(slime);
  },
  listeners: {
    onDeath: function(attacker) {
      Game.switchScreen(Game.Screen.winScreen);
    }
  }
})