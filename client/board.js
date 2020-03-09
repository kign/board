const board = (function () {
	'use strict' ;

  // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial

	var ctx;  // 2D drawing context
  var cvas; // HTML canvas element
  var W, H; // canvas pixel size
  var X, Y; // canvas logical size
  var sx = null, sy = null; // current coordinates of sprite

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

  var drag_data = null;

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
    if (x0 && y0)
      fcell (c_trace, x0, y0);
    fcell (c_sprite,  x1, y1);
    sx = x1;
    sy = y1;
    return 0;
  }

  const move_try = function(x1, y1) {
    if (x1 < 1 || x1 > X || y1 < 1 || y1 > Y)
      return 1;
    if (has_block(x1,y1))
      return 2;
    return 0;
  }

  const move_promise = (x1, y1) => funwrapper(() => {
    return move_sprite(x1, y1);
  });

  const metronom_on = function (interval) {
    if (!metronom_interval) {
      metronom_interval = setInterval(metronom_action, interval);
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

  const canvas_action = function(evt, cell_action) {
    const ox = evt.offsetX;
    const oy = evt.offsetY;
    const rx = (ox - pad)/(spc + box);
    const ry = (oy - pad)/(spc + box);
    //console.log("rx =", rx, "ry = ", ry);
    if (rx < 0 || ry < 0)
      console.log("Outside click!");
    else {
      const x = Math.floor(rx);
      const y = Math.floor(ry);

      if (x >= X || y >= Y)
        console.log("Outside click!");
      else {
        //console.log("ox - pad - x*(spc + box) =", ox - pad - x*(spc + box),
        //  "oy - pad - y*(spc + box) =", oy - pad - y*(spc + box));
        if (ox - pad - x*(spc + box) > box || oy - pad - y*(spc + box) > box)
          //console.log("Click between cells!");
          ;
        else {
          //console.log("Valid click", 1+x, Y-y);
          cell_action(1+x, Y-y);
        }
      }
    }
  }

  const drag_active = function () {
    return !!drag_data;
  }

  const drag_initiate = function (x,y) {
    drag_data = {ox: x, oy: y, x: x, y: y};
    console.log("DRAG START", x, y);
  }

  const drag_move = function (x,y) {
    if (drag_data &&
        !(drag_data.x == x && drag_data.y == y) &&
        !has_block(x,y)) {
      //console.log(`blank(${drag_data.x},${drag_data.y})`)
      fcell (c_blank, drag_data.x, drag_data.y);
      //console.log(`sprite(${x},${y})`)
      fcell (c_sprite, x, y);
      drag_data.x = x;
      drag_data.y = y;
      //console.log("DRAG MOVE", x, y);
    }
  }

  const drag_drop = function () {
    if (drag_data && drag_data.x && drag_data.y) {
      const x = drag_data.x;
      const y = drag_data.y;
      console.log("DRAG DROP", x, y);
      sx = x;
      sy = y;
    }
    drag_data = null;
  }

  return {
  	init: function(id, interval, run) {
      // setup canvas
      cvas = document.getElementById(id);
      W = cvas.width;
      H = cvas.height;
    	ctx = cvas.getContext("2d");

      // initial board
      draw_new_board ();

      // initialize periodic wakeup events
      metronom_on (interval);

      let predrag = null;
      let preclick = null;
      cvas.onmousedown = evt => canvas_action(evt, (x,y) => {
        if (predrag == null) {
          if (x == sx && y == sy)
            predrag = {x : x, y : y};
        }
        else
          predrag = null;

        if (preclick == null) {
          if (!(x == sx && y == sy))
            preclick = {x : x, y : y};
        }
        else
          preclick = null;
      });
      cvas.onmousemove = evt => canvas_action(evt, (x,y) => {
        if (preclick != null)
          preclick = null;

        if (drag_active())
          drag_move(x,y);
        else if (predrag != null && !(x == predrag.x && y == predrag.y)) {
          drag_initiate(predrag.x, predrag.y);
          predrag = null;
          drag_move(x,y);
        }
      });
      cvas.onmouseup = evt => {
        if (drag_active()) {
          drag_drop();
        }
        else if (preclick != null)
          flip_block(preclick.x, preclick.y);
      };

      // initial position
      if (0 != move_sprite(1,1)) {
        alert("Error");
        return;
      }

      // setup Run/Pause/Stop callbacks
      document.getElementById("c_run").onclick = function () {
        if (sprite_state == "stopped") {
          wakeup_sprite_active = true;
          set_sprite_state("running");
          // some kind of magic I don't understand
          (async () => {await run(); set_sprite_state("stopped")})();
        }
        else
          alert("run: sprite_state = '" + sprite_state + "'");
        console.log("Exited from RUN#onclick");
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
    },

    move_right: function () {
      return move_promise (sx+1, sy);
    },

    move_left: function () {
      return move_promise (sx-1, sy);
    },

    move_up: function () {
      return move_promise (sx, sy+1);
    },

    move_down: function () {
      return move_promise (sx, sy-1);
    },

    try_right: function () {
      return move_try (sx+1, sy);
    },

    try_left: function () {
      return move_try (sx-1, sy);
    },

    try_up: function () {
      return move_try (sx, sy+1);
    },

    try_down: function () {
      return move_try (sx, sy-1);
    },

    done: function () {
      set_sprite_state("stopped");
    },

    is_sprite_active: function () {
      return sprite_state == "running" || sprite_state == "paused";
    },

    reset_blocks: function () {
      for (let x = 1; x <= X; x ++)
        for (let y = 1; y <= Y; y ++) {
          const cell = getcell(x,y);
          const blocked = cell.blocked;
          delete cell.blocked;
          delete cell.blocked_ts;
          if (blocked)
            draw_cell(x, y);
        }
    },

    pause: function () {
      if (sprite_state == "running") {
        wakeup_sprite_active = false;
        set_sprite_state("paused");
      }
    },

    import: function (data) {
      let ii = data.indexOf(',');
      const spx = parseInt(data.substring(0,ii));
      let jj = data.indexOf(',',ii+1);
      const spy = parseInt(data.substring(ii+1,jj));
      let dp = jj;
      let n = null;
      let e = 0;
      let buffer = [];
      const pop = () => {
        if (e == 0) {
          let ii;
          if (buffer.length == 0) {
            dp ++;
            if (data[dp] == 'z') {
              for (ii = dp + 1; '0' <= data[ii] && data[ii] <= '9'; ii ++);
              const z = parseInt(data.substring(dp + 1, ii))
              dp = ii-1;
              for (ii = 0; ii < z; ii ++)
                buffer.push(0);
            }
            else {
              buffer.push(data.charCodeAt(dp) - 58);
            }
          }
          n = buffer.shift();
          e = 6;
        }
        e --;
        return (n>>e)%2;
      }

      for (ii = 0; ii < X * Y; ii ++)
        if (pop() == 1) {
          const cell = F[ii];
          const x = 1 + ii%X;
          const y = (ii - (x - 1))/X + 1;
          cell.blocked = !(cell.blocked === true);
          cell.blocked_ts = (new Date()).valueOf();
          draw_cell(x, y);
        }

      move_sprite(spx, spy);
    },

    export: function () {
      let x = 0;
      let res = [];
      let z = 0;
      const push = t => {
        if (t > 0 && z > 0)
          fin();
        res.push(String.fromCharCode(58+t));
      }
      const fin = () => {
        if (z > 0) {
          if (z < 4) {
            for(let ii = 0; ii < z; ii ++)
              push(0);
          }
          else {
            res.push('z' + z);
          }
          z = 0;
        }
      }
      for (let ii = 0; ii < X * Y || ii%6 == 0; ii ++) {
        if (ii < X * Y && F[ii].blocked === true) {
          const ign=57;
        }
        x = 2 * x + ((ii < X * Y && F[ii].blocked === true)?1:0);
        if (ii % 6 == 5) {
          if (x == 0)
            z ++;
          else
            push(x);
          x = 0;
        }
      }
      fin();
      return '' + sx + ',' + sy + ',' + res.join('');
    }
  }
}());
