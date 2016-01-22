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
        io.emit('message', message);
    });
});

app.get('/api/chat/discover/:latitude/:longitude', function(request, response) {
    var location = {
        latitude: request.params.latitude,
        longitude: request.params.longitude
    };

    Chatroom.find({}, 'name', function(err, rooms) {
        if(err) {
            response.end(err);
        }
        var roomsInRange = [];
        rooms.forEach(function(room) {
            var distance = helpers.distanceMeters(location, room.location);
            // if(distance < room.radiusMeters) {
                // TODO:  Why doesn't this show up in the json?
                // room.distance = distance;
                roomsInRange.push(room);
            // }
        });
        response.json(roomsInRange);
    });
});

http.listen(8080, function() {
    console.log('Listening on port 8080');
});
