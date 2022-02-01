const server = require("http").createServer();
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
    },
});

const User = require('./models/user')

const PORT = 4000;
const commentEvent = "newComment";
const likeEventName = "userClicksLikeBtn";
const commentNumEvent = "commentNumChanged";
const messageEvent = 'newMessage';

// save User data in when the user send the data through this server?


io.on("connection", socket => {
    // console.log(socket.handshake)

    // Join a conversation
    const { roomId, messagesRoomId } = socket.handshake.query;
    // console.log(`user has joined roomId ${roomId}`))
    socket.join(roomId);

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
    })

    // Leave the room if the user closes the socket
    socket.on("disconnect", () => {
        socket.leave(roomId);
    });
});

server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});