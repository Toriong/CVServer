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
    const { roomId, usersToMessage, privateMessage } = socket.handshake.query;
    // console.log(`user has joined roomId ${roomId}`))
    if (usersToMessage?.length) {
        // console.log('usersToMessage: ', usersToMessage)
        // console.log(usersToMessage);
        // const userIds = Object.values(usersToMessage);
        console.table(JSON.parse(usersToMessage))
        JSON.parse(usersToMessage).forEach(userId => {
            console.log(`roomId: ${userId}`)
            socket.join(userId);

            socket.on(messageEvent, data => {
                io.in(userId).emit(messageEvent, data);
            });

            socket.on("disconnect", () => {
                socket.leave(userId);
            });
        })
    } else {
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
    }

});

server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});