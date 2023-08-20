import { Server as HTTPServer } from 'http';
import { Socket, Server } from 'socket.io';
import logging from './config/logging';
import IMessage from './interfaces/message';
import config from './config/config';

const NAMESPACE = 'Socket';

export class ServerSocket {
    public static instance: ServerSocket;
    public io: Server;

    /** Master list of all connectet users */
    public users: { [userId: string]: string }; //value is ioId

    constructor(server: HTTPServer) {
        ServerSocket.instance = this;
        this.users = {};
        this.io = new Server(server, {
            serveClient: false,
            pingInterval: 10000,
            pingTimeout: 5000,
            cookie: false,
            cors: {
                origin: '*'
            }
        });

        this.io.on('connect', this.StartListeners);

        logging.info(NAMESPACE, 'Socket IO started.');
    }

    StartListeners = (socket: Socket) => {
        logging.info(NAMESPACE, 'Message receivd from ' + socket.id);

        socket.on('handshake', (userId: string, callback: (userId: string, users: string[]) => void) => {
            logging.info(NAMESPACE, 'Connect receivd from ' + socket.id);
            this.GetAllMessages();
            /** Check if this ia a reconnection */
            const reconnected = Object.values(this.users).includes(socket.id);

            if (reconnected) {
                console.log('This user has reconnected.');

                const userID = this.GetUserIdFromSocketId(socket.id);
                const user_ids = Object.keys(this.users);

                if (userID) {
                    console.info('sending callback for reconnect ...');
                    callback(userID, user_ids);
                    return;
                }
            }

            /** Generate new user */
            this.users[userId] = socket.id;
            const user_ids = Object.keys(this.users);
            const socket_ids = Object.values(this.users);

            console.info('sending callback for handshake ...');
            callback(userId, user_ids);

            /** Send new user to all connected users */
            this.SendMessage(
                'user_connected',
                socket_ids.filter((id) => id !== socket.id),
                user_ids
            );
        });

        socket.on('new_message', (text: string) => {
            logging.info(NAMESPACE, 'New Message from ' + socket.id);

            const userId = this.GetUserIdFromSocketId(socket.id);

            fetch(`${config.server.hostname}:${config.server.port}/chat/create/message`, {
                method: 'POST',
                headers: { 'Content-type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    message: text
                })
            })
                .then(function (response) {
                    return response.json();
                })
                .then(function (data) {
                    console.log('Request succeeded with JSON response', data);
                    ServerSocket.instance.GetAllMessages();
                })
                .catch(function (error) {
                    console.log('Request failed', error);
                });
        });

        socket.on('disconnect', () => {
            logging.info(NAMESPACE, 'Disconnect receivd from ' + socket.id);

            const userId = this.GetUserIdFromSocketId(socket.id);

            if (userId) {
                delete this.users[userId];
                const socket_ids = Object.values(this.users);

                this.SendMessage('user_disconnected', socket_ids, userId);

                fetch(`${config.server.hostname}:${config.server.port}/user/logout`, {
                    method: 'POST',
                    headers: { 'Content-type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId
                    })
                })
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (data) {
                        logging.info(NAMESPACE, 'db update user logout: ' + userId, data);
                    })
                    .catch(function (error) {
                        console.log('Request failed', error);
                    });
            }
        });
    };

    GetUserIdFromSocketId = (id: string) => Object.keys(this.users).find((userId) => this.users[userId] === id);

    /**
     * Send a message through the socket
     * @param name the name of event, example: handshake
     * @param users  List of socket id's
     * @param payload any information needed by the user for state update
     */
    SendMessage = (name: string, users: string[], payload: string | string[] | IMessage[]) => {
        console.info(`Emmitting event: ${name} to `, users);
        users.forEach((id) => (payload ? this.io.to(id).emit(name, payload) : this.io.to(id).emit(name)));
    };

    GetAllMessages = () => {
        fetch(`${config.server.hostname}:${config.server.port}/chat/get/messages`, { method: 'GET' })
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                const messages = data.messages;
                console.log('Request succeeded with JSON response', messages);
                if (messages.length > 0) {
                    logging.info(NAMESPACE, 'messages data: ', messages);
                }
                ServerSocket.instance.SendMessage('get_messages', Object.values(ServerSocket.instance.users), messages);
            })
            .catch(function (error) {
                console.log('Request failed', error);
            });
    };
}
