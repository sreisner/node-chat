var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var path = require('path');
var mongo = require('mongodb').MongoClient;
var mongoose = require('mongoose');
var handlebars = require('express-handlebars');
var bodyParser = require('body-parser');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

var helpers = require('./helpers');

mongoose.connect('mongodb://104.197.136.32:27017/chat');

var User = mongoose.model('User', mongoose.Schema({
    name: String,
    socialId: String,
    photo: String
}));

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
        user: Object
    }]
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.engine('.hbs', handlebars({ extname: '.hbs' }));
app.set('view engine', '.hbs');
app.use('/static', express.static(path.join(__dirname, 'static')));

app.get('/', function(request, response) {
    response.render('login');
});

app.get('/chat', function(request, response) {
    response.render('chat');
});

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

app.post('/api/chat/room/:roomId', function(request, response) {
    var roomId = request.params.roomId;
    var data = request.body;
    var accessToken = data.accessToken;
    var userId = data.userId;
    var text = data.text;

    if(validateAccessToken(userId, accessToken)) {
        var chatroom = Chatroom.findOne({
            _id: roomId
        }, function(err, room) {
            if(err) {
                response.end(err);
            }
            if(!room) {
                response.end('Room not found.');
            }
            User.findOne({
                socialId: userId
            }, function(err, user) {
                if(err) {
                    response.end(err);
                }

                if(!user) {
                    var details = getFacebookUserDetails(userId, accessToken);
                    user = new User();
                    user.socialId = userId;
                    user.name = details.name;
                    user.save();
                }

                var chatMessage = {
                    text: text,
                    date: new Date(),
                    user: user
                };
                room.chatLog.push(chatMessage);
                room.save();

                io.in(roomId).emit('message', chatMessage);
            });
        });
        response.send({ success: 'true' });
    } else {
        response.send({
            success: 'false',
            error: 'User not logged in.',
            redirect: '/'
        });
    }
});

function validateAccessToken(userId, accessToken) {
    var request = new XMLHttpRequest();
    var url = 'https://graph.facebook.com/v2.5/' + userId + '?access_token=' + accessToken;
    request.open('GET', url, false);
    request.send();
    var response = JSON.parse(request.responseText);
    return !response.error;
}

function getFacebookUserDetails(userId, accessToken) {
    var request = new XMLHttpRequest();
    request.open('GET', 'https://graph.facebook.com/v2.5/' + userId + '?access_token=' + accessToken, false);
    request.send();
    var response = JSON.parse(request.responseText);
    return {
        name: response.name
    }
}

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

io.on('connection', function(socket) {
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

http.listen(8080, function() {
    console.log('Listening on port 8080');
});
