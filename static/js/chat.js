var socket;
var roomId;
var latitude, longitude;

function onload() {
    initializeSocketIO();
    initializeEventHandlers();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(retrieveRoomsInRange);
    }
}

function initializeSocketIO() {
    socket = io();
    socket.on('room-create', addRoomToList);
    socket.on('message', handleReceivedMessage);
}

function addRoomToList(room) {
    $('<tr class="room-row" data-room-id="' + room._id + '"><td><i class="fa fa-circle-o"></i> ' + room.name + '</td></tr>').insertBefore('#create-new-row');
}

function handleReceivedMessage(message) {
    var line = '<p><b>' + message.user.name + '</b>: ' + message.text + '</p>';
    $('#chat-feed').append(line);
    $('#chat-feed').scrollTop($('#chat-feed').height());
}

function initializeEventHandlers() {
    $(document).on('click', '.room-row', changeRooms);
    $(document).on('click', '#create-new-row', showCreateRoomForm);
    $(document).on('submit', '#create-new-room-form', createChatRoom);
    $(document).on('submit', '#chat-form', handleChatFormSubmission);
}

function changeRooms(event) {
    var td = event.target;
    var tr = td.parentElement;
    updateCircleIconsInRoomList(td);
    leaveCurrentRoom();
    joinRoom($(tr).attr('data-room-id'));
    retrieveChatRoom();
    enableChatInput();
}

function updateCircleIconsInRoomList(td) {
    var tr = td.parentElement;
    $('.room-row').find('i').switchClass('fa-circle', 'fa-circle-o');
    $(td).find('i').switchClass('fa-circle-o', 'fa-circle');
}

function leaveCurrentRoom() {
    if(roomId) {
        socket.emit('leave', roomId);
    }
}

function joinRoom(roomId) {
    this.roomId = roomId;
    socket.emit('join', roomId);
}

function retrieveChatRoom() {
    var url = 'http://test.yourdomain.com:8080/api/chat/' + roomId;
    $.ajax({
        dataType: "json",
        url: url,
        success:  function(room) {
            $('#chat-feed').html('');
            room.chatLog.forEach(handleReceivedMessage);
        }
    });
}

function showCreateRoomForm() {
    $('#create-new-room-modal').modal('show');
}

function createChatRoom() {
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

    hideCreateRoomForm();
    return false;
}

function enableChatInput() {
    $('#chat-text').attr('placeholder', 'Enter message here...');
    $('#chat-text').prop('disabled', false);
}

function retrieveRoomsInRange(position) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    var url = "http://test.yourdomain.com:8080/api/chat/discover/" + latitude + "/" + longitude;
    $.ajax({
        dataType: "json",
        url: url,
        success: function(rooms) {
            rooms.forEach(addRoomToList);
        }
    });
}

function handleChatFormSubmission(event) {
    var text = $('#chat-text').val();
    var token = $('#access-token').val();
    var userId = $('#user-id').val();
    var data = {
        text: text,
        accessToken: token,
        userId: userId
    };
    sendMessage(data);
    $('#chat-text').val('');
    event.preventDefault();
}

function sendMessage(data) {
    var url = 'http://test.yourdomain.com:8080/api/chat/room/' + roomId;
    $.post({
        dataType: 'json',
        url: url,
        data: data,
        success: function(response) {
            // TODO:  Handle error (response.success, response.error).
        }
    });
}

function handleFacebookLoginResponse(response) {
    if(response.status === 'connected') {
        FB.api('/me', function(me) {
            setName(me.name);
            setAccessToken(response.authResponse.accessToken);
            setUserId(response.authResponse.userID);
        });
    } else {
        window.location.replace('/');
    }
}

function setName(name) {
    $('#current-user').text(name);
}

function setAccessToken(accessToken) {
    $('#access-token').val(accessToken);
}

function setUserId(userId) {
    $('#user-id').val(userId);
}

function hideCreateRoomForm() {
    $('#create-new-room-modal').modal('hide');
}
