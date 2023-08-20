import { NextFunction, Request, Response } from 'express';
import logging from '../config/logging';
import { Connect, Query } from '../config/mysql';
import IMessage from '../interfaces/message';

const NAMESPACE = 'Messages';
const messagePattern = /^[A-Za-z0-9 .,!?]+$/;

const createMessage = async (req: Request, res: Response, next: NextFunction) => {
    logging.info(NAMESPACE, 'Inserting message');

    let { userId, message } = req.body;

    if (isNaN(Number(userId))) {
        return res.status(400).json({ message: 'userId Is Number only, please!' });
    } else if (!message.match(messagePattern)) {
        return res.status(400).json({ message: 'No special characters, please!' });
    }

    let query = `INSERT INTO messages (user_id, message, created_at) VALUES (${userId}, '${message}', CURRENT_TIMESTAMP)`;

    logging.info(NAMESPACE, query, req.body);
    Connect()
        .then((connection) => {
            Query(connection, query)
                .then((result) => {
                    logging.info(NAMESPACE, 'message created: ', result);

                    return res.status(200).json({
                        result
                    });
                })
                .catch((error) => {
                    logging.error(NAMESPACE, error.message, error);

                    return res.status(200).json({
                        message: error.message,
                        error
                    });
                })
                .finally(() => {
                    logging.info(NAMESPACE, 'Closing connection.');
                    connection.end();
                });
        })
        .catch((error) => {
            logging.error(NAMESPACE, error.message, error);

            return res.status(200).json({
                message: error.message,
                error
            });
        });
};

const getAllMessages = async (req: Request, res: Response, next: NextFunction) => {
    logging.info(NAMESPACE, 'Getting all messages.');

    let query =
        'SELECT messages.id as id, users.id as uid, users.nickname as uname, messages.message, messages.created_at as createdAt FROM `messages` LEFT JOIN `users` ON messages.user_id = users.id;'; //'SELECT * FROM messages';

    Connect()
        .then((connection) => {
            Query(connection, query)
                .then((messages) => {
                    logging.info(NAMESPACE, 'Retrieved messages: ', messages);

                    return res.status(200).json({
                        messages
                    });
                })
                .catch((error) => {
                    logging.error(NAMESPACE, error.message, error);

                    return res.status(200).json({
                        message: error.message,
                        error
                    });
                })
                .finally(() => {
                    logging.info(NAMESPACE, 'Closing connection.');
                    connection.end();
                });
        })
        .catch((error) => {
            logging.error(NAMESPACE, error.message, error);

            return res.status(200).json({
                message: error.message,
                error
            });
        });
};

export default { createMessage, getAllMessages };
