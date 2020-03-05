const bserver = (function () {
	'use strict' ;

	const base_url  = "https://board.zapad.org/api";
	var is_online = false;

	const set_server_online = function (online) {
		is_online = online;
		bcontrol.refresh ();
	}

	const server_error(xhr) {
		if (xhr)
			console.error("readyState =",      xhr.readyState,
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
			xhr.open('GET',
				     base_url +
				        '/timetest' + "?" + (new URLSearchParams({
						 	clientUTCtime: (new Date()).valueOf()
			})),
				     true);
			xhr.onload = function () {
				if (xhr.readyState == 4 && xhr.status == "200") {
					const res = JSON.parse(xhr.responseText);
					console.log("Result", res);
					set_server_online(true);
				} else
					server_error(xhr);
			}
			xhr.onerror = server_error;
			xhr.send();
		},

		sync_blocks: function(blocks, onUpdate) {
			const xhr  = new XMLHttpRequest();
			xhr.open('POST', base_url + "/blocks", true);
			xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
			xhr.onload = function () {
				if (xhr.readyState == 4 && xhr.status == "200") {
					const res = JSON.parse(xhr.responseText);
					console.log("Result", res);
					onUpdate(res);
				} else
					server_error(xhr);
			}
			xhr.onerror = server_error;
			xhr.send(JSON.stringify(blocks));
		},

		reset: function(blocks, onUpdate) {
			const xhr  = new XMLHttpRequest();
			xhr.open('POST', base_url + "/reset", true);
			xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
			xhr.onload = function () {
				if (xhr.readyState == 4 && xhr.status == "200") {
					onUpdate();
				} else
					server_error(xhr);
			}
			xhr.onerror = server_error;
			xhr.send();
		}
	};
})();
