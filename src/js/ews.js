define(function(require) {

	function extend(target, source) {
		target = target || {};
		for (var prop in source) {
			if (typeof source[prop] === 'object') {
				target[prop] = extend(target[prop], source[prop]);
			} else {
				target[prop] = source[prop];
			}
		}
		return target;
	}

	var EventEmitter = require('EventEmitter');
	var _ = require('underscore');

	function JSONSocket(url, options) {
		EventEmitter.apply(this);

		var self = this;
		var wsTimer;

		this.isConnected = false;

		function startWebSocket() {
			var isSecure = (window.location.protocol == 'https');

			console.log("Connecting to", (url || ( (isSecure?('wss://'):('ws://')) + window.location.host)));
			var ws = self.ws = new WebSocket(url || ( (isSecure?('wss://'):('ws://')) + window.location.host));
			ws.onclose = function() {
				self.isConnected = false;
				wsTimer = setTimeout(function() {
					startWebSocket();
				}, 500);
				self.emit("wsDisconnected");
			};
			ws.onopen = function() {
				self.isConnected = true;
				self.emit("wsConnected");
				if (wsTimer)
					clearInterval(self.wsTimer);
			};
			ws.onmessage = function(event) {
				try {
					var parsed = JSON.parse(event.data);

					console.log("Got parsed", parsed);
					self.emit('message', parsed);

					console.log(typeof parsed.message);
					if (typeof parsed.message == 'string' && parsed.data) {
						console.log("Emitting", parsed.message);
						self.emit(parsed.message, parsed.data);
					}

				} catch (e) {
					console.log("Parse error", e, e.stack);
					self.emit("parseError", e);
				}
			};
		}

		startWebSocket();
		options = _(options).clone();
	}


	JSONSocket.prototype = extend(EventEmitter.prototype, {
		send: function(data) {
			this.ws.send(JSON.stringify(data));
		},
		sendMessage: function(name, data) {
			this.send({
				message: name || null,
				data: data || null
			});
		}
	});

	function RESTSocket(url, options) {
		JSONSocket.apply(this, arguments);

		var reqResponse = this.reqResponse = {};

		var self = this;
		this.on('response', function(data) {
			console.log("Got resonse", data);
			var reqId = data.reqId;
			if (reqId) {
				if (reqResponse[reqId]) {
					console.log("Found response stuff!");
					if (reqResponse[reqId].timeout)
						clearTimeout(reqResponse[reqId].timeout);
					reqResponse[reqId].callback.call(self, data);
					delete reqResponse[reqId];
				}
			}
		});
	}

	RESTSocket.prototype = extend(JSONSocket.prototype, {
		request: function(method, url, data, callback) {
			var reqId = Math.floor((1 + Math.random()) * 0x10000);
			if (typeof callback != 'function')
				callback = null;
			if (typeof data == 'function')
				callback = data;

			var reqId = callback ? Math.floor(0xffffffff * Math.random()) : undefined;

			this.sendMessage('request', {
				reqId: reqId,
				method: method.toUpperCase(),
				url: url,
				body: data
			});
			if (typeof callback == 'function') {
				this.reqResponse[reqId] = {
					callback: callback,
					timestamp: (new Date()).getTime()
				};
			}
		}

	});
	var convenienceMethods = {};
	[
			'get', 'post', 'put', 'head', 'delete', 'options', 'trace', 'copy', 'lock', 'mkcol', 'move', 'propfind', 'proppatch', 'unlock', 'report', 'mkactivity', 'checkout', 'merge', 'm-search', 'notify', 'subscribe', 'unsubscribe', 'patch'
	].forEach(function(method) {
		convenienceMethods[method] = function(url, data, callback) {
			this.request(method, url, data, callback);
		};
	});

	RESTSocket.prototype = extend(RESTSocket.prototype, convenienceMethods);

	return {
		JSONSocket: JSONSocket,
		RESTSocket: RESTSocket
	};

});