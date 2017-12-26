var Game ={
  _display: null,
  _currentScreen: null,
  _screenWidth: 80,
  _screenHeight: 24,
  init: function() {
    this._display = new ROT.Display({width: this._screenWidth, height: this._screenHeight + 1}); //+1 for stats line
    var game = this;
    var bindEventToScreen = function(event) {
      window.addEventListener(event, function(e) {
        if(game._currentScreen !== null) {
          game._currentScreen.handleInput(event, e);
        }
      });
    }
    bindEventToScreen('keydown');
    //bindEventToScreen('keyup');
    bindEventToScreen('keypress');
  },
  refresh: function() {
    this._display.clear();
    this._currentScreen.render(this._display);
  },
  getDisplay: function() {
    return this._display;
  },
  getScreenWidth: function() {
    return this._screenWidth;
  },
  getScreenHeight: function() {
    return this._screenHeight;
  },
  switchScreen: function(screen) {
    if (this._currentScreen !== null) {
      this._currentScreen.exit();
    }
    this.getDisplay().clear();
    this._currentScreen = screen;
    if(this._currentScreen) {
      this._currentScreen.enter();
      this.refresh();
    }
  }
}

window.onload = function(){
  //Check browser compatibility
  if (!ROT.isSupported()) {
    alert("Rot.js is not supported by this browser. Please update or try a different browser.")
  } else {
    Game.init();
    //Add canvas to HTML
    document.body.appendChild(Game.getDisplay().getContainer());
    Game.switchScreen(Game.Screen.startScreen);
  }
}