const { createServer } = require("http");
const { Server } = require("socket.io");
const Client = require("socket.io-client");

const messageEvent = 'newMessage';


const message1 = 'hello there';
const message2 = 'what is up';


describe("my awesome project", () => {
    let io, serverSocket, clientSocket;

    beforeAll((done) => {
        const httpServer = createServer();
        io = new Server(httpServer);
        httpServer.listen(() => {
            const port = httpServer.address().port;
            console.log('port: ', port)
            clientSocket = new Client(`http://localhost:${port}`);
            io.on("connection", (socket) => {
                serverSocket = socket;
            });
            clientSocket.on("connect", done);
        });
    });

    afterAll(() => {
        io.close();
        clientSocket.close();
    });

    test("test1", done => {
        clientSocket.on(messageEvent, (arg) => {
            expect(arg).toBe(message1);
            done();
        });
        serverSocket.emit(messageEvent, message1);
    });

    // test("test2", done => {
    //     clientSocket.on(messageEvent, (arg) => {
    //         expect(arg).toBe(message2);
    //         done();
    //     });
    //     serverSocket.emit(messageEvent, message2);
    // });
});