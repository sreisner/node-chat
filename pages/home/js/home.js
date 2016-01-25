var name = '';
var socket;
var roomId;
var latitude, longitude;

function onload() {
    initializeSocketIO();
    initializeEventHandlers();

    $('#name-input').focus();
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
    var line = '<p><b>' + message.from + '</b>: ' + message.text + '</p>';
    $('#chat-feed').append(line);
    $('#chat-feed').scrollTop($('#chat-feed').height());
}

function initializeEventHandlers() {
    $(document).on('click', '.room-row', changeRooms);
    $(document).on('click', '#create-new-row', showCreateRoomForm);
    $(document).on('submit', '#create-new-room-form', createChatRoom);
    $(document).on('submit', '#name-form', login);
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
    roomId = roomId;
    socket.emit('join', roomId);
}

function retrieveChatRoom() {
    var url = 'http://localhost:8080/api/chat/' + roomId;
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
    return false;
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

function handleChatFormSubmission(event) {
    var text = $('#chat-input').val();
    sendMessage(text);
    $('#chat-input').val('');
}

function sendMessage(text) {
    socket.emit('message', {
        'from': name,
        'text': text,
        'room': roomId
    });
}

function hideCreateRoomForm() {
    $('#create-new-room-modal').modal('hide');
}
