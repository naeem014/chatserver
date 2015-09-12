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
        if (team_map.has(arr[0])) {
            var arr_ = team_map.get(arr[0]);
            arr_.push(socket);
            team_map.set(arr[0], arr_);
        } else {
            team_map.set(arr[0], [socket]);
        }
        user_map.set(arr[0]+','+arr[1], socket);

        // online ussers info //
        var userid = parseInt(arr[1], 10);
        if (users_online.has(arr[0])) {
            var arr_ = users_online.get(arr[0]);
            if (arr_.indexOf(userid) < 0) {
                arr_.push(userid);
                users_online.set(arr[0], arr_);
            }
        } else {
            users_online.set(arr[0], [userid]);
        }

        // update online members info
        var sockets = team_map.get(arr[0]);
        if (sockets) {
            for (var i = 0; i < sockets.length; i++) {
                sockets[i].emit('update_online_members', users_online.get(arr[0]));
            }
        }
    });

    // broadcast the message to same team members //
    socket.on('to_server', function (data) {
        var arr = data.split(",");
        var sockets = team_map.get(arr[1]);
        for (var i = 0; i < sockets.length; i++) {
            sockets[i].emit('to_client', arr[2]+','+arr[0]);
        }
    });

    // remove the user info if user diconnects from server
    socket.on('disconnect', function() {
        var key = user_map.search(socket);
        if (key) {
            user_map.remove(key);
            var t_key = key.split(',')[0];
            var sockets = team_map.get(t_key);
            sockets.splice(sockets.indexOf(socket), 1);

            // user disconnect info 
            var users = users_online.get(t_key);
            var user_key = key.split(',')[1];
            var userid = parseInt(user_key, 10);
            users.splice(users.indexOf(userid), 1);
            if (sockets) {
                for (var i = 0; i < sockets.length; i++) {
                    sockets[i].emit('update_offline_members', users_online.get(t_key));
                }    
            }
                
        }
    });
});
