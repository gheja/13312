// requires no special packages, just the base "npm install socket.io"

var app = require('http').createServer(handler),
	io = require('socket.io').listen(app);

function handler(request, response)
{
	console.log(request);
	response.writeHead(302, { "Location": "http://github.com/gheja/13312" } );
	response.end();
}


var S = {};

S.games = [];

S.log = function(socket, s)
{
	console.log((new Date()).getTime() + ": " + socket.id + ": " + s);
}

io.sockets.on("connection", function(socket) {
	S.log(socket, "connected");
	
	socket.ping_result = 0; // ms
	
	socket.emit2 = function(s, data)
	{
		S.log(socket, "sending: " + s + " " + data);
		socket.emit(s, data);
	}
	
	socket.emit2_partner = function(s, data)
	{
		var partner_socket = io.sockets.socket(socket.partner_id);
		
		// check if socket exists
		if (partner_socket.id)
		{
			S.log({}, socket);
			partner_socket.emit2(s, data);
		}
	}
	
	socket.on("disconnect", function() {
		S.log(socket, "disconnected");
		socket.emit2_partner("game_disconnected");
	});
	
	socket.on("game_create", function() {
		var game = {
			player1_uid: socket.id,
			player2_uid: null,
			players_swapped: Math.random() < 0.5,
			map: null
		};
		
		S.games.push(game);
		
		socket.emit2("game_created", game);
	});
	
	socket.on("game_join", function(data) {
		var i;
		
		for (i in S.games)
		{
			if (S.games[i].player1_uid == data)
			{
				if (S.games[i].player2_uid == null)
				{
					S.games[i].player2_uid = socket.id;
					S.log(socket, "connected to player " + S.games[i].player1_uid);
					
					// bind them together
					socket.partner_id = S.games[i].player1_uid;
					io.sockets.socket(S.games[i].player1_uid).partner_id = S.games[i].player2_uid;
					
					socket.emit2("game_started", S.games[i]);
					socket.emit2_partner("game_started", S.games[i]);
					
					return;
				}
			}
		}
		
		socket.emit2("game_disconnected");
	});
	
	socket.on("message", function(data) {
		S.log(socket, "message: " + data);
		socket.emit2_partner("message", data);
	});
	
	socket.on("ping", function(data) {
		// socket.emit2_to_partner("heartbeat");
		
		socket.ping_start = (new Date()).getTime();
		socket.emit2("ping_request", socket.ping_start);
	});
	
	socket.on("ping_response", function(data) {
		var now = (new Date()).getTime();
		
		socket.ping_result = (now - socket.ping_start);
		
		// DEBUG BEGIN
		var a = Math.round(socket.ping_result / 2 + io.sockets.socket(socket.partner_id).ping_result / 2);
		S.log("latency: " + a);
		socket.emit2("debug_log", "server-client-server latencies: you: " + (socket.ping_result) + " ms, partner: " + (io.sockets.socket(socket.partner_id).ping_result) + " ms");
		socket.emit2("debug_log", "client1-server-client2 latency: about " + a + " ms");
		// DEBUG END
	});
	
	socket.emit2("welcome", { uid: socket.id, version: 1 });
});

// the public TCP port 80 is forwarded to this port

app.listen(8080);
