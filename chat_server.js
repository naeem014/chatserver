var hashmap = require('hashmap');

var team_map = new hashmap();
var user_map = new hashmap();
var users_online = new hashmap();

var server = require('http').createServer().listen(process.env.PORT || 8000);

var io = require('socket.io')(server);


io.sockets.on('connection', function (socket) {

    // store connected user info on connection //
    socket.on('info', function (data) {
        var arr = data.split(",");
        var p_id = arr[0];
        var u_id = arr[1]; 
        if (team_map.has(p_id)) {
            var sockets_array = team_map.get(p_id);
            sockets_array.push(socket);
            team_map.set(p_id, sockets_array);
        } else {
            team_map.set(p_id, [socket]);
        }
        user_map.set(p_id+','+u_id, socket);

        // online ussers info //
        var userid = parseInt(u_id, 10);
        if (users_online.has(p_id)) {
            var users_array = users_online.get(p_id);
            if (users_array.indexOf(userid) < 0) {
                users_array.push(userid);
                users_online.set(p_id, users_array);
            } else {
                var sockets = team_map.get(p_id);
                if (sockets) {
                    for (var i = 0; i < sockets.length; i++) {
                        sockets[i].emit('update_online_members', users_online.get(p_id));
                    }
                }
            }
        } else {
            users_online.set(p_id, [userid]);
        }

        // update online members info
        var sockets = team_map.get(p_id);
        if (sockets) {
            for (var i = 0; i < sockets.length; i++) {
                sockets[i].emit('update_online_members', users_online.get(p_id));
            }
        }
    });

    // broadcast the message to same team members //
    socket.on('to_server', function (data) {
        var arr = data.split(",");
        var message = arr[0];
        var p_id = arr[1];
        var u_id = arr[2];
        var sockets = team_map.get(p_id);
        for (var i = 0; i < sockets.length; i++) {
            sockets[i].emit('to_client', u_id+','+message);
        }
    });

    // remove the user info if user diconnects from server
    socket.on('disconnect', function() {
        var key = user_map.search(socket);
        if (key) {
            user_map.remove(key);
            var p_id = key.split(',')[0];
            var sockets = team_map.get(p_id);
            sockets.splice(sockets.indexOf(socket), 1);

            // user disconnect info 
            var users = users_online.get(p_id);
            var user_key = key.split(',')[1];
            var userid = parseInt(user_key, 10);
            users.splice(users.indexOf(userid), 1);
            if (sockets) {
                for (var i = 0; i < sockets.length; i++) {
                    sockets[i].emit('update_offline_member', userid);
                }    
            }
                
        }
    });
});
