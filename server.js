var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var path = require('path');
var mongo = require('mongodb').MongoClient;
var mongoose = require('mongoose');

var helpers = require('./helpers');

mongoose.connect('mongodb://104.197.136.32:27017/chat');

var Chatroom = mongoose.model('Chatroom', mongoose.Schema({
    name: String,
    location: {
        latitude: Number,
        longitude: Number,
    },
    radiusMeters: Number,
    chatLog: [{
        text: String,
        date: Date,
        from: String
    }]
}));

app.use('/', express.static(path.join(__dirname, '/pages/home')));

app.get('/api/chat/:roomId', function(request, response) {
    var roomId = request.params.roomId;
    Chatroom.findOne({
        _id: roomId
    }, function(err, room) {
        if(err) {
            response.end(err);
        }
        response.json(room);
    });
});

io.on('connection', function(socket) {
    socket.on('message', function(message) {
        var roomId = message.room;
        var chatroom = Chatroom.findOne({
            _id: roomId
        }, function(err, room) {
            if(err) {
                response.end(err);
            }

            room.chatLog.push({
                text: message.text,
                date: new Date(),
                from: message.from
            });
            room.save();
        });

        io.in(roomId).emit('message', message);
    });

    socket.on('create', function(roomData) {
        var room = new Chatroom({
            name: roomData.name,
            location: roomData.location,
            radiusMeters: roomData.radiusMeters,
            chatLog: []
        });

        room.save(function(err) {
            if(err) {
                console.log(err);
            } else {
                io.emit('room-create', room);
            }
        });
    });

    socket.on('join', function(roomId) {
        socket.join(roomId);
    });

    socket.on('leave', function(roomId) {
        socket.leave(roomId);
    })
});

app.get('/api/chat/discover/:latitude/:longitude', function(request, response) {
    var location = {
        latitude: request.params.latitude,
        longitude: request.params.longitude
    };

    Chatroom.find({}, 'name location radiusMeters', function(err, rooms) {
        if(err) {
            response.end(err);
        }
        var roomsInRange = [];
        rooms.forEach(function(room) {
            var distance = helpers.distanceMeters(location, room.location);
            if(distance < room.radiusMeters) {
                roomsInRange.push(room);
            }
        });
        response.json(roomsInRange);
    });
});

http.listen(8080, function() {
    console.log('Listening on port 8080');
});
