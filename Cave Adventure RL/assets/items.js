Game.Item = function(properties) {
  properties = properties || {};
  Game.DynamicGlyph.call(this, properties);
  this._name = properties['name'] || '';
}

Game.Item.extend(Game.DynamicGlyph);

Game.Item.prototype.describe = function() {
  return this._name;
}

Game.Item.prototype.describeA = function(capitalize) {
  var prefixes = capitalize ? ['A', 'An'] : ['a', 'an'];
  var string = this.describe();
  var firstLetter = string.charAt(0).toLowerCase();
  var prefix = 'aeiou'.indexOf(firstLetter) >= 0 ? 1 : 0;

  return prefixes[prefix] + ' ' + string;
}

Game.ItemRepository = new Game.Repository('items', Game.Item);

//Foods
Game.ItemRepository.define('apple', {
  name: 'apple',
  character: '%',
  foreground: 'red',
  foodValue: 50,
  mixins: [Game.ItemMixins.Edible]
});
Game.ItemRepository.define('rock', {
  name: 'rock',
  character: '*',
  foreground: 'white'
});
Game.ItemRepository.define('melon', {
  name: 'melon',
  character: '%',
  foreground: 'lightGreen',
  foodValue: 35,
  consumptions: 4,
  mixins: [Game.ItemMixins.Edible]
});
Game.ItemRepository.define('corpse', {
  name: 'corpse',
  character: '%',
  foodValue: 75,
  consumptions: 1,
  mixins: [Game.ItemMixins.Edible]
}, { disableRandomCreation: true }
);
Game.ItemRepository.define('pumpkin', {
  name: 'pumpkin',
  character: '%',
  foreground: 'orange',
  foodValue: 50,
  consumptions: 1,
  attackValue: 2,
  defenseValue: 2,
  wearable: true,
  wieldable: true,
  mixins: [Game.ItemMixins.Edible, Game.ItemMixins.Equippable]
}, { disableRandomCreation: false }
);

//Weapons
Game.ItemRepository.define('dagger', {
  name: 'dagger',
  character: ')',
  foreground: 'gray',
  attackValue: 5,
  wieldable: true,
  mixins: [Game.ItemMixins.Equippable]
}, { disableRandomCreation: true }
);
Game.ItemRepository.define('sword', {
  name: 'sword',
  character: ')',
  foreground: 'white',
  attackValue: 10,
  wieldable: true,
  mixins: [Game.ItemMixins.Equippable]
}, { disableRandomCreation: true }
);
Game.ItemRepository.define('staff', {
  name: 'staff',
  character: ')',
  foreground: 'yellow',
  attackValue: 5,
  defenseValue: 3,
  wieldable: true,
  mixins: [Game.ItemMixins.Equippable]
}, { disableRandomCreation: true }
);

//Wearables
Game.ItemRepository.define('tunic', {
  name: 'tunic',
  character: '[',
  foreground: 'green',
  defenseValue: 2,
  wearable: true,
  mixins: [Game.ItemMixins.Equippable]
}, { disableRandomCreation: true }
);
Game.ItemRepository.define('chainmail', {
  name: 'chainmail',
  character: '[',
  foreground: 'white',
  defenseValue: 4,
  wearable: true,
  mixins: [Game.ItemMixins.Equippable]
}, { disableRandomCreation: true }
);
Game.ItemRepository.define('platemail', {
  name: 'platemail',
  character: '[',
  foreground: 'aliceblue',
  defenseValue: 6,
  wearable: true,
  mixins: [Game.ItemMixins.Equippable]
}, { disableRandomCreation: true }
);