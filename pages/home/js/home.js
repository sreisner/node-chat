var name = '';
var socket;
var roomId;
var latitude, longitude;

function onload() {
    socket = io();

    socket.on('message', receiveMessage);
    socket.on('room-create', addRoomToList);

    $(document).on('click', '.room-row', function(event) {
        var td = event.target;
        var tr = event.target.parentElement;
        $('.room-row').find('i').switchClass('fa-circle', 'fa-circle-o');
        $(td).find('i').switchClass('fa-circle-o', 'fa-circle');
        roomId = $(tr).attr('data-room-id');
        enableChatInput();
    })

    $('#create-new-row').click(function(event) {
        $('#create-new-room-modal').modal('show');
    });

    $('#create-new-room-form').submit(function() {
        var roomName = $('#new-room-name').val();
        var roomRadius = $('#new-room-radius').val();
        var roomLocation = {
            'latitude': latitude,
            'longitude': longitude
        };
        socket.emit('create', {
            'name': roomName,
            'radiusMeters': roomRadius,
            'location': roomLocation
        });

        $('#create-new-room-modal').modal('hide');
        return false;
    });

    $('#name-input').focus();
    $('#name-input').on('keypress', function(event) {
        if(event.which == 13) {
            login();
        }
    });

    $('#chat-text').on('keypress', function(event) {
        if(event.which == 13) {
            var text = $('#chat-text').val();
            sendMessage(text);
            $('#chat-text').val('');
        }
    });
}

function sendMessage(text) {
    socket.emit('message', {
        'from': name,
        'text': text,
        'room': roomId
    });
}

function receiveMessage(message) {
    var line = '<p><b>' + message.from + '</b>: ' + message.text + '</p>';
    $('#chat-feed').append(line);
    $('#chat-feed').scrollTop($('#chat-feed').height());
}

function enableChatInput() {
    $('#chat-text').attr('placeholder', 'Enter message here...');
    $('#chat-text').prop('disabled', false);
}

function login() {
    name = $('#name-input').val();
    if(name) {
        $('#login').hide();
        $('#chat').show();
        $('#current-user').append(name);
        $('#current-user').show();
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(retrieveRoomsInRange);
        }
    }
}

function addRoomToList(room) {
    $('<tr class="room-row" data-room-id="' + room._id + '"><td><i class="fa fa-circle-o"></i> ' + room.name + '</td></tr>').insertBefore('#create-new-row');
}

function retrieveRoomsInRange(position) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    var url = "http://localhost:8080/api/chat/discover/" + latitude + "/" + longitude;
    $.ajax({
        dataType: "json",
        url: url,
        success: function(rooms) {
            rooms.forEach(addRoomToList);
        }
    });
}

function retrieveChatRoom(button) {
    var roomId = $(button).attr('data-room-id');
    var url = 'http://localhost:8080/api/chat/' + roomId;
    $.ajax({
        dataType: "json",
        url: url,
        success: function(room) {
            console.log(room.chatLog);
        }
    });
}
