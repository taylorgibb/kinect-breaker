(function (game, undefined) {

  var ctx,
      bricks = [],
      paddle,
      ball,
      score = 0,
      die = false,
      now,
      last = new Date().getTime(),
      dt = 0,
      gdt = 0,
      connection = $.hubConnection(),
      hub = connection.createHubProxy("GameHub");

  hub.on("move", function (direction) {
    if (direction > 0)
      game.moveRight();
    else
      game.moveLeft();
  });

  // Animate function
  var animateFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback, element) {
          window.setTimeout(callback, 1000 / 60);
        };
  })();

  // public methods and properties
  game.init = function (canvasDiv) {
    game.fps = 60;
    game.step = 1 / game.fps;
    ctx = document.getElementById(canvasDiv).getContext('2d');

    game.reset();
  };

  game.die = function () {
    die = true;
  };

  game.reset = function () {
    score = 0;
    game.clearScreen();
    bricks = [];

    for (var r = 0; r < 6; r++) {
      for (var c = 0; c < 8; c++) {
        bricks.push(new Brick(r, c));
      }
    }

    paddle = new Paddle();
    ball = new Ball(game.utils.randomBetween(0, 100), game.utils.randomChoice([-1, 1]));

    die = false;
  };

  game.getScore = function () {
    return score;
  };

  game.update = function () {
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    ball.width = ball.height / ctx.canvas.width * ctx.canvas.height;

    var hitBricks = ball.move(paddle, bricks);

    for (var i = 0; i < hitBricks.length; i++) {
      score++;
      bricks.splice(bricks.indexOf(hitBricks[i]), 1);
    }
  };

  game.render = function () {
    game.clearScreen();

    var width = ctx.canvas.width;
    var height = ctx.canvas.height;

    ball.draw(ctx, width, height);
    paddle.draw(ctx, width, height);

    for (var i = 0; i < bricks.length; i++) {
      var brick = bricks[i];
      brick.draw(ctx, width, height);
    }
  };

  game.clearScreen = function () {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };
  game.run = function () {
    now = new Date().getTime();
    dt = Math.min(1, (now - last) / 1000);
    gdt = gdt + dt;
    while (gdt > game.step) {
      gdt = gdt - game.step;
      game.update();

      game.render();
    }
    last = now;

    if (!die) {
      animateFrame(Game.run);
    };
  };
  game.moveLeft = function () {
    paddle.moveLeft();
  };
  game.moveRight = function () {
    paddle.moveRight();
  };

  game.utils = {};

  game.utils.randomBetween = function (min, max) {
    return (min + (Math.random() * (max - min)));
  };

  game.utils.randomChoice = function (choices) {
    return choices[Math.round(game.utils.randomBetween(0, choices.length - 1))];
  };

  connection.start()
      .done(function () { console.log('Connected!'); })
      .fail(function () { console.log('Could not Connect!'); });

  // check to evaluate whether "namespace" exists in the
  // global namespace - if not, assign window.namespace an
  // object literal

})(window.Game = window.Game || {});

function Brick(row, col) {
  this.row = row;
  this.col = col;
}

Brick.prototype = {
  brickColours: ["#C84848", "#C66C3A", "#B47A30", "#A2A22A", "#48A048", "#4248C8"],
  topPadding: 12,
  height: 4,
  getbox: function () {
    var top = this.row * this.height + this.topPadding;
    var left = this.col * 100.0 / 8.0;
    return {
      top: top,
      bottom: top + this.height,
      left: left,
      right: left + 100.0 / 8.0
    };
  },
  draw: function (ctx, canvasWidth, canvasHeight) {
    var height = this.height * canvasHeight / 100.0;
    var width = (canvasWidth / 8.0);
    var x = this.col * width;
    var y = this.row * height + (this.topPadding * canvasHeight / 100.0);

    var colour = this.brickColours[this.row];
    ctx.fillStyle = colour;
    ctx.strokeStyle = "#b3b3b3";
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
  }
};

function Paddle() {
  this.height = 2;
  this.width = 35;
  this.xPosition = 50 - this.width / 2;
  this.step = 5;

  this.moveLeft = function () {
    if (this.xPosition > this.step) {
      this.xPosition -= this.step;
    } else {
      this.xPosition = 0;
    }
  };

  this.moveRight = function () {
    if (this.xPosition + this.step < 100 - this.width) {
      this.xPosition += this.step;
    } else {
      this.xPosition = 100 - this.width;
    }
  };

  this.getbox = function () {
    return {
      top: 100 - this.height,
      bottom: 100,
      left: this.xPosition,
      right: this.xPosition + this.width
    };
  };

  this.draw = function (ctx, canvasWidth, canvasHeight) {
    var height = this.height * canvasHeight / 100;
    var width = (this.width * canvasWidth / 100);
    var x = this.xPosition * (canvasWidth) / 100;
    var y = canvasHeight - height;

    ctx.fillStyle = "#b8860b";
    ctx.strokeStyle = "#b3b3b3";
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
  };
}

function Ball(xStart, xDirection) {
  this.x = Math.round(xStart); // xStart; // Percentage
  this.y = 70; // Percentage
  this.xDirection = xDirection; ///xDirection;
  this.yDirection = 1;

  this.height = 2; // Percentage of height
  this.width = this.height;
  this.step = 0.5; // Percentage

  this.xNext = this.x;
  this.yNext = this.y;

  this.move = function (paddle, bricks) {
    this.xNext = this.x + this.xDirection * this.step;
    this.yNext = this.y - this.yDirection * this.step;

    // Bricks
    var hitBricks = this.detectBrickCollision(bricks);

    // Walls
    this.wallCollision(paddle);

    this.x = this.xNext;
    this.y = this.yNext;

    return hitBricks;
  };
  this.detectBrickCollision = function (bricks) {
    var hitBricks = [];
    do {
      var closestCollision = this.getClosestCollision(bricks);
      if (closestCollision) {
        if (closestCollision.type == "top" || closestCollision.type == "bottom") {
          this.yNext = closestCollision.yNext;
          this.yDirection = closestCollision.yDirection;
          this.x = closestCollision.x;
          this.y = closestCollision.y;
        }

        if (closestCollision.type == "left" || closestCollision.type == "right") {
          this.xNext = closestCollision.xNext;
          this.xDirection = closestCollision.xDirection;
          this.x = closestCollision.x;
          this.y = closestCollision.y;
        }

        hitBricks.push(closestCollision.brick);
      }

    } while (closestCollision);

    return hitBricks;
  };

  this.getClosestCollision = function (bricks) {
    var closestCollision = null;

    for (var i = 0; i < bricks.length; i++) {
      var brick = bricks[i];
      var box = brick.getbox();
      var collision;

      if (this.yDirection > 0) {
        collision = this.bottomCollision(box);
        if (collision && (!closestCollision || collision.distToCollision < closestCollision.distToCollision)) {
          closestCollision = collision;
          closestCollision.brick = brick;
        }
      } else {
        collision = this.topCollision(box);
        if (collision && (!closestCollision || collision.distToCollision < closestCollision.distToCollision)) {
          closestCollision = collision;
          closestCollision.brick = brick;
        }
      }

      if (this.xDirection > 0) {
        collision = this.leftCollision(box);
        if (collision && (!closestCollision || collision.distToCollision < closestCollision.distToCollision)) {
          closestCollision = collision;
          closestCollision.brick = brick;
        }
      } else {
        collision = this.rightCollision(box);
        if (collision && (!closestCollision || collision.distToCollision < closestCollision.distToCollision)) {
          closestCollision = collision;
          closestCollision.brick = brick;
        }
      }
    }
    return closestCollision;
  };

  this.bottomCollision = function (box) {
    if (this.y > box.bottom && this.yNext - this.height / 2 <= box.bottom) {
      var distToCollision = this.y - box.bottom - (this.height / 2);
      var xCollision = this.x + distToCollision * this.xDirection;
      var yCollision = this.y - distToCollision;

      if (xCollision + this.width / 2 >= box.left && xCollision - this.width / 2 <= box.right) {
        return {
          type: "bottom",
          distToCollision: distToCollision,
          yNext: 2 * this.y - this.yNext - 2 * distToCollision,
          yDirection: -(this.yDirection),
          x: xCollision,
          y: yCollision
        };
      }
    }
    return false;
  };

  this.topCollision = function (box) {
    if (this.y <= box.top && this.yNext + this.height / 2 >= box.top) {
      var distToCollision = box.top - this.y - (this.height / 2);
      var xCollision = this.x + distToCollision * this.xDirection;
      var yCollision = this.y + distToCollision;

      if (xCollision + this.width / 2 >= box.left && xCollision - this.width / 2 <= box.right) {
        return {
          type: "top",
          distToCollision: distToCollision,
          yNext: 2 * this.y - this.yNext + 2 * distToCollision,
          yDirection: -(this.yDirection),
          x: xCollision,
          y: yCollision
        };
      }
    }
    return false;
  };

  this.leftCollision = function (box) {
    if (this.x < box.left && this.xNext + this.width / 2 >= box.left) {
      var distToCollision = box.left - this.x - (this.width / 2);
      var xCollision = this.x + distToCollision;
      var yCollision = this.y - distToCollision * this.yDirection;

      if (yCollision + this.height / 2 >= box.top && yCollision - this.height / 2 <= box.bottom) {
        return {
          type: "left",
          distToCollision: distToCollision,
          xNext: 2 * this.x - this.xNext - 2 * distToCollision,
          xDirection: -(this.xDirection),
          x: xCollision,
          y: yCollision
        };
      }
    }
    return false;
  };

  this.rightCollision = function (box) {
    if (this.x > box.right && this.xNext - this.width / 2 <= box.right) {
      var distToCollision = this.x - box.right - (this.width / 2);
      var xCollision = this.x - distToCollision;
      var yCollision = this.y - distToCollision * this.yDirection;

      if (yCollision + this.height / 2 >= box.top && yCollision - this.height / 2 <= box.bottom) {
        return {
          type: "right",
          distToCollision: distToCollision,
          xNext: 2 * this.x - this.xNext + 2 * distToCollision,
          xDirection: -(this.xDirection),
          x: xCollision,
          y: yCollision
        };
      }
    }
    return false;
  };

  this.paddleCollision = function (paddle) {
    var box = paddle.getbox();

    var collision = this.topCollision(box);

    if (collision) {
      this.yNext = collision.yNext;
      this.yDirection = 1;
      this.x = collision.x;
      this.y = collision.y;
    }
  };

  this.wallCollision = function (paddle) {
    // Walls
    if (this.xNext < 0 - this.width / 2) {
      this.xNext = -this.xNext;
      this.xDirection = -(this.xDirection);
    }
    if (this.xNext > 100 + this.width / 2) {
      this.xNext = 200 - this.xNext;
      this.xDirection = -(this.xDirection);
    }

    // Walls
    if (this.yNext < 0 - this.height / 2) {
      this.yNext = -this.yNext;
      this.yDirection = -(this.yDirection);
    }
    if (this.yNext > (100 - paddle.height - this.height / 2)) {
      var box = paddle.getbox();
      if (this.xNext + this.width / 2 >= box.left && this.xNext - this.width / 2 <= box.right) {
        this.yNext = 200 - 2 * paddle.height - this.height - this.yNext;
        this.yDirection = -(this.yDirection);
      } else {
        Game.die();
        Game.reset();
        Game.run();
      }
    }
  };

  this.draw = function (ctx, canvasWidth, canvasHeight) {
    var height = this.height * canvasHeight / 100;
    var width = this.width * canvasWidth / 100;
    var xNext = (this.xNext - this.height / 2) * canvasWidth / 100;
    var yNext = (this.yNext - this.height / 2) * canvasHeight / 100;

    ctx.fillStyle = "#C66C3A";
    ctx.fillRect(xNext, yNext, width, height);
  };
}


//Keyboard
document.onkeydown = function keyboardController(e) {
  if (!e) {
    e = window.event;
  }

  switch (e.keyCode) {
    case 13:
      Game.die();
      Game.reset();
      Game.run();
      break;
    case 37:
      Game.moveLeft();
      break;
    case 39:
      Game.moveRight();
      break;
    case 27:
      Game.die();
      break;
  }
};

//Webkit
if ('ontouchstart' in document.documentElement) {
  $('#left-hand-side').bind('touchstart', function () {
    Game.moveLeft();
  });

  $('#right-hand-side').bind('touchstart', function () {
    Game.moveRight();
  });
}

//Trident
if (window.navigator.msPointerEnabled) {
  $('#left-hand-side').bind('MSPointerDown', function () {
    Game.moveLeft();
  });

  $('#right-hand-side').bind('MSPointerUp', function () {
    Game.moveRight();
  });
};

Game.init('kinectCanvas');
Game.run();