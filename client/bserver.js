const bserver = (function () {
	'use strict' ;

	const base_url  = "https://board.zapad.org/api";
	var is_online = false;

	const set_server_online = function (online) {
		is_online = online;
		bcontrol.refresh ();
	}

	const server_error = function (api, xhr) {
		if (xhr)
			console.error("api = ",            api,
				          "; readyState =",    xhr.readyState,
				          ";  status =",       xhr.status,
			    	      ";  responseText =", xhr.responseText.substring(0,80));

		set_server_online(false);
	}

	return {
		get_server_online: function () {
			return is_online;
		},

		handshake: function (report_result) {
			const xhr  = new XMLHttpRequest();
			bcontrol.set_server_status("testing");
			const api = '/timetest';
			xhr.open('GET',
				     base_url +
				        api + "?" + (new URLSearchParams({
						 	clientUTCtime: (new Date()).valueOf()
			})),
				     true);
			xhr.onload = function () {
				if (xhr.readyState == 4 && xhr.status == "200") {
					const res = JSON.parse(xhr.responseText);
					console.log("Result", res);
					set_server_online(true);
				} else
					server_error(api, xhr);
			}
			xhr.onerror = server_error;
			xhr.send();
		},

		sync_blocks: function(blocks, onUpdate) {
			const xhr  = new XMLHttpRequest();
			const api = "/blocks";
			xhr.open('POST', base_url + api, true);
			xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
			xhr.onload = function () {
				if (xhr.readyState == 4 && xhr.status == "200") {
					const res = JSON.parse(xhr.responseText);
					console.log("Result", res);
					onUpdate(res);
				} else
					server_error(api, xhr);
			}
			xhr.onerror = server_error;
			xhr.send(JSON.stringify(blocks));
		},

		reset: function(onUpdate) {
			const xhr  = new XMLHttpRequest();
			const api = "/reset";
			xhr.open('POST', base_url + api, true);
			xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
			xhr.onload = function () {
				if (xhr.readyState == 4 && [200, 204].includes(xhr.status)) {
					if (onUpdate)
						onUpdate();
				} else
					server_error(api, xhr);
			}
			xhr.onerror = server_error;
			xhr.send();
		},

		get_sprite: function(onUpdate) {
			const xhr  = new XMLHttpRequest();
			const api = "/get-sprite";
			xhr.open('GET', base_url + api, true);
			xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
			xhr.onload = function () {
				if (xhr.readyState == 4 && xhr.status == "200") {
					const res = JSON.parse(xhr.responseText);
					if (onUpdate)
						onUpdate(res.x, res.y);
				}
				else if (xhr.readyState == 4 && xhr.status == "204") {
					if (onUpdate)
						onUpdate(null, null);
				} else
					server_error(api, xhr);
			}
			xhr.onerror = server_error;
			xhr.send();
		},

		put_sprite: function(x, y, onUpdate) {
			const xhr  = new XMLHttpRequest();
			const api = "/put-sprite";
			xhr.open('POST', base_url + api, true);
			xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
			xhr.onload = function () {
				if (xhr.readyState == 4 && [200, 204].includes(xhr.status)) {
					if (onUpdate)
						onUpdate();
				} else
					server_error(api, xhr);
			}
			xhr.onerror = server_error;
			xhr.send(JSON.stringify({x: x, y: y}));
		}
	};
})();
