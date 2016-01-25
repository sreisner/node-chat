var express = require('express');
var session = require('express-session');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var passport = require('passport');
var facebookStrategy = require('passport-facebook').Strategy;

var path = require('path');
var mongo = require('mongodb').MongoClient;
var mongoose = require('mongoose');
var handlebars = require('express-handlebars');

var helpers = require('./helpers');

var FACEBOOK_APP_ID = '477440145790631';
var FACEBOOK_APP_SECRET = '26bbe27574eeafccc36bbfcfa6346586';

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

var User = mongoose.model('User', mongoose.Schema({
    name: String,
    email: String,
    socialId: String,
    accessToken: String,
    photo: String
}));

app.use(session({ secret: 'secret' }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
    done(null, user._id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

passport.use(new facebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "http://test.yourdomain.com:8080/auth/facebook/callback",
    profileFields: ['id', 'first_name', 'last_name', 'displayName', 'email', 'photos']
},  function(accessToken, refreshToken, profile, done) {
        User.findOne({ 'socialId' : profile.id }, function(err, user) {
            if (err) {
                return done(err);
            }

            if(user) {
                User.remove(function() {});
                user = null;
            }
            if(user) {
                return done(null, user);
            } else {
                var newUser = new User();
                newUser.socialId = profile.id;
                newUser.accessToken = accessToken,
                newUser.name = profile.displayName;
                newUser.photo = profile.photos[0].value;
                if(profile.emails && profile.emails.length > 0) {
                    newUser.email = profile.emails[0].value;
                }

                newUser.save(function(err) {
                    if(err) {
                        throw err;
                    }

                    return done(null, newUser);
                })
            }
        });
    }
));

app.engine('.hbs', handlebars({ extname: '.hbs' }));
app.set('view engine', '.hbs');
app.use('/static', express.static(path.join(__dirname, 'static')));

app.get('/', function(request, response) {
    if(request.user) {
        User.findOne(
            {
                'socialId': request.user.socialId
            },
            function(err, user) {
                if(err) {
                    response.end(err);
                }
                response.render('home', { user : user });
            }
        );
    } else {
        response.render('login');
    }
});

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    successRedirect: '/',
    failureRedirect: '/'
}));

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

http.listen(8080, function() {
    console.log('Listening on port 8080');
});
