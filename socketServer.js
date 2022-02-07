const server = require("http").createServer();
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
    },
});


const PORT = 4000;
const commentEvent = "newComment";
const likeEventName = "userClicksLikeBtn";
const commentNumEvent = "commentNumChanged";
const messageEvent = 'newMessage';


// save User data in when the user send the data through this server?



io.on("connection", socket => {
    // console.log(socket.handshake)

    // Join a conversation
    const { roomId, messageQuery } = socket.handshake.query;
    // console.log(`user has joined roomId ${roomId}`))
    const { _roomId, currentUserId } = messageQuery ? JSON.parse(messageQuery) : {};
    socket.join(_roomId ?? roomId);

    if (_roomId && (currentUserId === _roomId)) {
        console.log(`User ${currentUserId} is available to message.`)
    } else if (_roomId) {
        console.log(`User ${currentUserId} entered user ${_roomId}'s message stream.`)
    }
    // console.log('isGroup: ', isGroup)
    // Listen for new messages
    socket.on(commentEvent, data => {
        io.in(roomId).emit(commentEvent, data);
    });

    socket.on(likeEventName, data => {
        io.in(roomId).emit(likeEventName, data);
    });

    socket.on(commentNumEvent, data => {
        console.log({ data })
        io.in(roomId).emit(commentNumEvent, data);
    });
    socket.on(messageEvent, data => {
        console.log({ data })
        console.log(`This message will be sent to user with the id of ${_roomId}.`)
        io.in(_roomId).emit(messageEvent, data);
    });



    // Leave the room if the user closes the socket
    socket.on("disconnect", () => {
        socket.leave(_roomId ?? roomId);
    });
});

server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});