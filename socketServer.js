const server = require("http").createServer();
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
    },
});

const PORT = 4000;
const messageEventName = "newChatMessage";
const likeEventName = "userClicksLikeBtn"


io.on("connection", socket => {
    // console.log(socket.handshake)

    // Join a conversation
    const { roomId } = socket.handshake.query;
    // console.log(`user has joined roomId ${roomId}`)
    socket.join(roomId);

    // Listen for new messages
    socket.on(messageEventName, data => {
        // make a conditional based upon the room id
        // console.log("data", data.body.input);
        console.log("DATA", data)
        io.in(roomId).emit(messageEventName, data);
    });

    socket.on(likeEventName, data => {
        console.log("DATA", data)
        io.in(roomId).emit(likeEventName, data);
    })

    // Leave the room if the user closes the socket
    socket.on("disconnect", () => {
        socket.leave(roomId);
    });
});

server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});