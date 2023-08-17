import { NextFunction, Request, Response } from 'express';
import logging from '../config/logging';
import { Connect, Query, mysql } from '../config/mysql';

const NAMESPACE = 'Users';
const nicknamePattern = /^[A-Za-z]+[A-Za-z0-9]+$/;

const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    logging.info(NAMESPACE, 'login');

    let { nickname } = req.body;

    if (!nickname.match(nicknamePattern)) {
        return res.status(400).json({ message: "No special characters and no spaces, please!" });
    }

    let query = `UPDATE users SET is_online = true WHERE nickname = "${nickname}"; SELECT * FROM users WHERE nickname = "${nickname}";`;

    Connect()
        .then((connection) => {
            Query(connection, query)
                .then((results) => {
                    logging.info(NAMESPACE, 'user update: ', results);
                    if ((results as [mysql.OkPacket, any])[0].affectedRows == 1) {
                        return res.status(200).json({
                            result: (results as [mysql.OkPacket, any])[1]
                        });
                    } else {
                        query = `insert into users (nickname, is_online) values ("${nickname}", true); SELECT * FROM users WHERE nickname = "${nickname}";`;
                        Query(connection, query)
                            .then((results) => {
                                logging.info(NAMESPACE, 'insert a new user: ', results);
                                return res.status(200).json({
                                    result: (results as [mysql.OkPacket, any])[1]
                                });
                            })
                            .catch((error) => {
                                logging.error(NAMESPACE, error.message, error);

                                return res.status(200).json({
                                    message: error.message,
                                    error
                                });
                            })
                    }

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

const logoutUser = async (req: Request, res: Response, next: NextFunction) => {
    logging.info(NAMESPACE, 'logout');

    let { userId } = req.body;

    if (isNaN(Number(userId))) {
        return res.status(400).json({ message: "No special characters and no spaces, please!" });
    }

    let query = `UPDATE users SET is_online = false WHERE id = "${userId}"`;

    Connect()
        .then((connection) => {
            Query(connection, query)
                .then((result) => {
                    logging.info(NAMESPACE, 'user: ', result);

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

const getOnlineUsers = async (req: Request, res: Response, next: NextFunction) => {
    logging.info(NAMESPACE, 'Getting all online Users.');

    let query = 'SELECT nickname FROM users WHERE is_online=true';

    Connect()
        .then((connection) => {
            Query(connection, query)
                .then((result) => {
                    logging.info(NAMESPACE, 'Retrieved messages: ', result);

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

export default { loginUser, logoutUser, getOnlineUsers };