/*
 * @Description: 
 * @Version: 1.0
 * @Autor: z.cejay@gmail.com
 * @Date: 2022-09-14 15:36:25
 * @LastEditors: cejay
 * @LastEditTime: 2022-09-14 20:48:20
 */


import { Pool, createPool, MysqlError, PoolConnection } from 'mysql';
import { YamlConfig } from './yamlConfig';


export class MysqlHelper {
    private static instance: MysqlHelper;
    private pool?: Pool;
    private constructor() {
        const yamlconfig = YamlConfig.getInstance();
        this.pool = createPool({
            host: yamlconfig.mysql.host,
            port: yamlconfig.mysql.port,
            user: yamlconfig.mysql.user,
            password: yamlconfig.mysql.password,
            database: yamlconfig.mysql.database,
            charset: yamlconfig.mysql.charset,
            multipleStatements: true
        });
    }
    public static getInstance() {
        if (!MysqlHelper.instance) {
            MysqlHelper.instance = new MysqlHelper();
        }

        return MysqlHelper.instance;
    }

    public escape(str: string) {
        return this.pool?.escape(str);
    }

    queryparams(sql: string, params: any = null): Promise<any> {
        return new Promise((resolve, reject) => {
            this.pool?.getConnection((err: MysqlError, connection: PoolConnection) => {
                if (err) {
                    reject(err);
                } else {
                    connection.query(sql, params, (qerr, vals, fields) => {
                        //释放连接    
                        connection.release();
                        if (qerr) {
                            reject(qerr);
                        } else {
                            resolve(vals);
                        }
                    });
                }

            });
        });

    }

    private query(connection: PoolConnection, sql: string, params: any = null) {
        return new Promise((resolve, reject) => {
            connection.query(sql, params, (qerr, vals, fields) => {
                if (qerr) {
                    reject(qerr);
                } else {
                    resolve(vals);
                }
            });
        });
    }
    async transactionSingleSql(sql: string, params: any[] = []): Promise<boolean> {
        if (params.length == 0) {
            throw new Error('params is empty');
        }
        const sqls = [];
        for (let index = 0; index < params.length; index++) {
            sqls.push(sql);
        }
        return await this.transaction(sqls, params);
    }

    transaction(sql: string[], params: any[] = []): Promise<boolean> {
        if (sql.length == 0) {
            throw new Error('sql is empty');
        }
        if (sql.length !== params.length) {
            throw new Error('sql.length!==params.length');
        }
        return new Promise((resolve, reject) => {
            this.pool?.getConnection((err: MysqlError, connection: PoolConnection) => {
                if (err) {
                    reject(err);
                } else {
                    connection.beginTransaction(async (err: MysqlError) => {
                        if (err) {
                            reject(err);
                        }
                        try {
                            for (let i = 0; i < sql.length; i++) {
                                await this.query(connection, sql[i], params[i]);
                            }
                            connection.commit((err: MysqlError) => {
                                connection.release();
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(true);
                                }
                            }
                            );
                        } catch (error) {
                            connection.rollback(() => {
                                connection.release();
                                reject(error);
                            });
                        }
                    });
                }
            });
        });
    }
}
