const bcontrol = (function () {
	'use strict';

  	var server_mode = "offline" // "active", "passive"

	const set_mode_low = function (mode, active) {
		const e = document.getElementById('m_' + mode)
		if (active) {
			e.style.backgroundColor = e.dataset.activeBg;
			e.style.color = 'white';
		}
		else {
			e.style.backgroundColor = 'inherit';
			e.style.color = 'grey';
		}
	}

	const server_mode_click = function (mode) {
		console.log(`server_mode_click(${mode})`);

		if (mode == server_mode)
			alert("Already " + mode);
		else if (mode == "passive" && board.is_sprite_active())
			alert("Can't switch to passive, stop first");
		else if (mode != "offline" && !bserver.get_server_online())
			alert("Server is offline");
		else if (mode == "reset")
			bserver.reset ();
		else {
			if (mode == "passive")
				set_run_controls("passive");
			else if(["active", "offline"].includes(mode) && server_mode == "passive")
				set_run_controls("stopped");
			server_mode = mode;
			bcontrol.set_server_mode_ui(mode);
		}
	}

	const set_run_controls = function (state) {
		const run = document.getElementById('c_run');
		const pause = document.getElementById('c_pause');
		const stop = document.getElementById('c_stop');

		const restore = () => {
			[run, pause, stop].forEach(b => {
				b.style.cssText='';
			});
		}

		if (state == "stopped") {
			restore();
			run.disabled = false;
			pause.disabled = true;
			stop.disabled = true;
			pause.innerHTML = "Pause";
		}
		else if (state == "running") {
			restore();
			run.disabled = true;
			pause.disabled = false;
			stop.disabled = false;
			pause.innerHTML = "Pause";
		}
		else if (state == "paused") {
			restore();
			run.disabled = true;
			pause.disabled = false;
			stop.disabled = false;
			pause.innerHTML = "Resume";
		}
		else if (state == "abort") {
			[run, pause, stop].forEach(b => {
				b.disabled = true;
				b.style.backgroundColor = "red";
				b.style.color = "white";
			});
		}
		else if (state == "passive") {
			restore();
			run.disabled = true;
			pause.disabled = true;
			stop.disabled = true;
		}
		else
			alert("set_run_controls(" + state + ")");
	}

	return {
		init : function() {
			["active", "passive", "offline", "reset"].forEach(m => {
				document.getElementById("m_" + m).onclick = () =>
					server_mode_click(m);
      			});
			set_run_controls("stopped");
			this.refresh();
		},

		set_server_status: function(status) {
			["on", "off", "unknown", "testing"].forEach(s => {
				document.getElementById('s_' + s).style.display = (s == status)? "initial" : "none";
			});
		},

		set_server_mode_ui: function(mode) {
			["active", "passive", "offline"].forEach(m => {
				set_mode_low(m, m == mode);
			});
		},

		sprite_started : function() {
			set_run_controls("running");
		},

		sprite_paused : function() {
			set_run_controls("paused");
		},

		sprite_stopped : function() {
			set_run_controls("stopped");
		},

		sprite_stop_initiated : function() {
			set_run_controls("abort");
		},

		sprite_stop_completed : function() {
			set_run_controls("stopped");
		},

		is_server_mode: function() {
			return bserver.get_server_online() &&
					(server_mode == "active" || server_mode == "passive");
		},

		is_active_server_mode: function() {
			return bserver.get_server_online() && server_mode == "active";
		},

		is_passive_server_mode: function() {
			return bserver.get_server_online() && server_mode == "passive";
		},

		refresh : function() {
			if (bserver.get_server_online()) {
				this.set_server_status("on");
				this.set_server_mode_ui(server_mode);
			}
			else {
				this.set_server_status("off");
				this.set_server_mode_ui("undefined");
			}
		}
	};
})();
