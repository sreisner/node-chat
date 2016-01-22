var name = '';
var socket;
var roomId;

function onload() {
    socket = io();

    socket.on('message', receiveMessage);

    $(document).on('click', '.room-row', function(event) {
        var td = event.target;
        var tr = event.target.parentElement;
        $('.room-row').find('i').switchClass('fa-circle', 'fa-circle-o');
        $(td).find('i').switchClass('fa-circle-o', 'fa-circle');
        roomId = $(tr).attr('data-room-id');
        enableChatInput();
    })

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

function retrieveRoomsInRange(position) {
    var latitude = position.coords.latitude;
    var longitude = position.coords.longitude;
    var url = "http://localhost:8080/api/chat/discover/" + position.coords.latitude + "/" + position.coords.longitude;
    $.ajax({
        dataType: "json",
        url: url,
        success: function(rooms) {
            rooms.forEach(function(room) {
                $('<tr class="room-row" data-room-id="' + room._id + '"><td><i class="fa fa-circle-o"></i> ' + room.name + '</td></tr>').insertAfter('#rooms > tbody > tr:first-child');
            });
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
