const board = (function () {
	'use strict' ;

  // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial

	var ctx;  // 2D drawing context
  var cvas; // HTML canvas element
  var W, H; // canvas pixel size
  var X, Y; // canvas logical size
  var sx, sy; // current coordinates of sprite

  var F;    // 2-dim array with cell data

  const pad = 5;
  const box = 23;
  const spc = 3;

  const c_sprite = 'rgb(200,20 ,20 )';
  const c_trace  = 'rgb(255,230,230)';
  const c_blank  = 'rgb(255,255,255)';
  const c_block  = 'rgb(64 ,64 ,200)';

  const wakeup_sprite = new Event('wakeup_sprite');
  var wakeup_sprite_active = true;

  var metronom_interval;
  var sprite_state = "stopped"; // "running", "paused", "stopped", "aborted"

  const funwrapper = function funwrapper(callback) {
    return new Promise((resolve, reject) => {
      if (sprite_state == "aborted") {
        set_sprite_state("stopped");
        reject("Aborted");
      }

      const fun = () => {
        cvas.removeEventListener('wakeup_sprite', fun);
        const result = callback();
        resolve(result);
      }
      cvas.addEventListener('wakeup_sprite', fun);
    });
  }

  const draw_new_board = function () {
    ctx.fillStyle = 'rgb(200, 200, 200)';

    ctx.fillRect(0,0,W,pad);
    var y = pad + box;
    Y = 1;

    while (true) {
      if (y + spc + box + pad <= H+1)
        ctx.fillRect(0,y,W,spc);
      else {
        ctx.fillRect(0,y,W,H-y);
        break;
      }
      y += spc + box;
      Y += 1;
    }

    ctx.fillRect(0,0,pad,H);
    var x = pad + box;
    X = 1;
    while (true) {
      if (x + spc + box + pad <= W+1)
        ctx.fillRect(x,0,spc,H);
      else {
        ctx.fillRect(x,0,W-x,H);
        break;
      }
      x += spc + box;
      X += 1;
    }

    F = new Array (X*Y);
    for (let a = 0; a < X*Y; a ++)
      F[a] = {};
  }

  const getcell = function (x,y,v) {
    return F[(y-1)*X + (x-1)];
  }

  const has_block = function (x, y) {
    return getcell(x,y).blocked === true;
  }

  const flip_block = function(x,y) {
    console.log("flip", x, y);
    const cell = getcell(x,y);
    cell.blocked = !(cell.blocked === true);
    cell.blocked_ts = (new Date()).valueOf();
    draw_cell(x, y);

    if (bcontrol.is_server_mode())
      sync_blocks ();
  }

  const sync_blocks = function () {
    let blocks = [];
    for (let x = 1; x <= X; x ++)
      for (let y = 1; y <= Y; y ++) {
        const cell = getcell(x,y);

        if (cell.blocked === true || cell.blocked === false) {
          blocks.push({x: x, y: y, ts: cell.blocked_ts, blocked: cell.blocked});
        }
      }

    bserver.sync_blocks(blocks, function (updates) {
      updates.forEach(b => {
        const cell = getcell(b.x,b.y);
        cell.blocked = b.blocked;
        cell.blocked_ts = b.ts;
        console.log(`Changing cell (${b.x},${b.y}) to`, cell.blocked);
        draw_cell(b.x, b.y);
      });
    });
  }

  const draw_cell = function (x,y) {
    const cell = getcell(x,y);
    const color = cell.blocked? c_block :
                  ((x == sx && y == sy)? c_sprite :
                  (cell.trace? c_trace  :
                               c_blank));
    fcell(color, x, y);
  }

  const fcell = function (color, x, y) {
    ctx.fillStyle = color;
    ctx.fillRect(pad + (x - 1) * (spc+box), pad + (Y - y) * (spc+box), box, box);
  }

  const move_sprite = function(x1, y1) {
    if (x1 < 1 || x1 > X || y1 < 1 || y1 > Y)
      return 1;
    if (has_block(x1,y1))
      return 2;
    const x0 = sx, y0 = sy;
    fcell (c_trace, x0, y0);
    fcell (c_sprite,  x1, y1);
    sx = x1;
    sy = y1;
    return 0;
  }

  const move_promise = (x1, y1) => funwrapper(() => {
    return move_sprite(x1, y1);
  });

  // const move = (x1, y1) => funwrapper(() => {
  //   if (x1 < 1 || x1 > X || y1 < 1 || y1 > Y)
  //     return 1;
  //   if (has_block(x1,y1))
  //     return 2;
  //   const x0 = sx, y0 = sy;
  //   fcell (c_trace, x0, y0);
  //   fcell (c_sprite,  x1, y1);
  //   sx = x1;
  //   sy = y1;
  //   return 0;
  // });

  const metronom_on = function () {
    if (!metronom_interval) {
      metronom_interval = setInterval(metronom_action, 500);
      console.log("metronom_interval on");
    }
  }

  const metronom_off = function () {
    if (metronom_interval) {
      clearInterval (metronom_interval);
      metronom_interval = null;
      console.log("metronom_interval off");
    }
  }

  const metronom_action = function () {
    if (wakeup_sprite_active)
      cvas.dispatchEvent(wakeup_sprite);

    if (bcontrol.is_server_mode())
      sync_blocks ();

    if (bcontrol.is_active_server_mode() && sprite_state == "running")
      bserver.put_sprite(sx, sy);

    if (bcontrol.is_passive_server_mode())
      bserver.get_sprite((x, y) => {
        if (x && y)
          move_sprite(x,y);
        else
          console.log("Received no sprite info!");
      });
  }

  const set_sprite_state = function (state) {
    if (sprite_state == "aborted" && state == "stopped")
      bcontrol.sprite_stop_completed();
    else if (state == "stopped")
      bcontrol.sprite_stopped();
    else if (state == "running")
      bcontrol.sprite_started();
    else if (state == "paused")
      bcontrol.sprite_paused();
    else if (state == "aborted")
      bcontrol.sprite_stop_initiated();
    else
      console.log("Invalid state =", state);
    sprite_state = state;
  }

  return {
  	init: function(id, run) {
      // setup canvas
      cvas = document.getElementById(id);
      W = cvas.width;
      H = cvas.height;
    	ctx = cvas.getContext("2d");

      // initial board
      draw_new_board ();

      // initialize periodic wakeup events
      metronom_on ();

      let action = this.action;
      cvas.onclick = function(e){
        //console.log("x =", e.offsetX, "y =", e.offsetY);
        action(e.offsetX, e.offsetY);
      }

      // temp
      sx = sy = 1;

      // setup Run/Pause/Stop callbacks
      document.getElementById("c_run").onclick = function () {
        if (sprite_state == "stopped") {
          wakeup_sprite_active = true;
          set_sprite_state("running");
          run();
        }
        else
          alert("run: sprite_state = '" + sprite_state + "'");
      }
      document.getElementById("c_pause").onclick = function () {
        if (sprite_state == "running") {
          wakeup_sprite_active = false;
          set_sprite_state("paused");
        }
        else if (sprite_state == "paused") {
          wakeup_sprite_active = true;
          set_sprite_state("running");
        }
        else
          alert("pause: sprite_state = '" + sprite_state + "'");
      }
      document.getElementById("c_stop").onclick = function () {
        if (sprite_state == "running" || sprite_state == "paused") {
          set_sprite_state("aborted");
          wakeup_sprite_active = false;
          cvas.dispatchEvent(wakeup_sprite);
        }
        else
          alert("stop: sprite_state = '" + sprite_state + "'");
      }

      // initialize control elements and callbacks
      bcontrol.init();

      // initiate server handshake
      bserver.handshake();

      // bcontrol.set_server_mode('offline');

    },

    move_right: async function () {
      return move_promise (sx+1, sy);
    },

    move_left: async function () {
      return move_promise (sx-1, sy);
    },

    move_up: function () {
      return move_promise (sx, sy+1);
    },

    move_down: async function () {
      return move_promise (sx, sy-1);
    },

    done: function () {
      set_sprite_state("stopped");
    },

    is_sprite_active: function () {
      return sprite_state == "running" || sprite_state == "paused";
    },

    action: function(ox, oy) {
      const rx = (ox - pad)/(spc + box);
      const ry = (oy - pad)/(spc + box);
      //console.log("rx =", rx, "ry = ", ry);
      if (rx < 0 || ry < 0)
        console.log("Outside click!");
      else {
        const x = Math.floor(rx);
        const y = Math.floor(ry);

        if (x >= W || y >= H)
          console.log("Outside click!");
        else {
          //console.log("ox - pad - x*(spc + box) =", ox - pad - x*(spc + box),
          //  "oy - pad - y*(spc + box) =", oy - pad - y*(spc + box));
          if (ox - pad - x*(spc + box) > box || oy - pad - y*(spc + box) > box)
            console.log("Click between cells!");
          else {
            //console.log("Valid click", 1+x, Y-y);
            flip_block(1+x, Y-y);
          }
        }
      }
    }
  }
}());
