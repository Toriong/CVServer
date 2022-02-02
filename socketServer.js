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
    console.log('messageQuery: ', messageQuery)
    const { _roomId } = messageQuery ? JSON.parse(messageQuery) : {};
    socket.join(_roomId ?? roomId);

    console.log('a user is connected.')
    socket.on('new_visitor', user => {
        console.log('new_visitor: ', user)
        socket.user = user
    })
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
        console.log(`This message will be sent to user with the id of ${_roomId}. Message: ${data.body}.`)
        io.in(_roomId).emit(messageEvent, data);
        socket.leave(_roomId);
    });



    // Leave the room if the user closes the socket
    socket.on("disconnect", () => {
        socket.leave(roomId);
    });
});

server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});