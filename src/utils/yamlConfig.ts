/*
 * @Description: 
 * @Version: 1.0
 * @Autor: z.cejay@gmail.com
 * @Date: 2022-08-08 21:58:13
 * @LastEditors: cejay
 * @LastEditTime: 2022-09-22 19:28:23
 */
import YAML from 'yaml'
import fs from 'fs';

export class YamlConfig {

    private static instance: YamlConfig;


    public mysql = {
        host: "127.0.0.1",
        port: 3306,
        user: "root",
        password: "pwd",
        database: "dbname",
        charset: "utf8mb4",
        table_event: "tablename",
        table_price: "tablename"
    };

    public openseaApiKey: string[] = [];



    public collections: collection[] = [];

    private constructor() {
        let yamlPath = '';
        if (fs.existsSync('/root/config.yaml')) {
            yamlPath = '/root/config.yaml'
        } else {
            console.log('no config file specified, use default config file: ../config.yaml');
            yamlPath = 'config.yaml';//console.log('current path: ' + process.cwd());
        }
        const yamlContent = fs.readFileSync(yamlPath, 'utf8');
        const yamlObj = YAML.parse(yamlContent);


        // check config



        //# mysql config
        if (!yamlObj.mysql) throw new Error('mysql config not found');
        if (!yamlObj.mysql.host) throw new Error('mysql::host not found');
        if (typeof (yamlObj.mysql.host) !== 'string') throw new Error('mysql::host not string');
        if (!yamlObj.mysql.port) throw new Error('mysql::port not found');
        if (typeof (yamlObj.mysql.port) !== 'number') throw new Error('mysql::port not number');
        if (!yamlObj.mysql.user) throw new Error('mysql::user not found');
        if (typeof (yamlObj.mysql.user) !== 'string') throw new Error('mysql::user not string');
        if (!yamlObj.mysql.password) throw new Error('mysql::password not found');
        if (typeof (yamlObj.mysql.password) !== 'string') throw new Error('mysql::password not string');
        if (!yamlObj.mysql.database) throw new Error('mysql::database not found');
        if (typeof (yamlObj.mysql.database) !== 'string') throw new Error('mysql::database not string');
        if (!yamlObj.mysql.charset) throw new Error('mysql::charset not found');
        if (typeof (yamlObj.mysql.charset) !== 'string') throw new Error('mysql::charset not string');
        if (!yamlObj.mysql.table_event) throw new Error('mysql::table_event not found');
        if (typeof (yamlObj.mysql.table_event) !== 'string') throw new Error('mysql::table_event not string');
        if (!yamlObj.mysql.table_price) throw new Error('mysql::table_price not found');
        if (typeof (yamlObj.mysql.table_price) !== 'string') throw new Error('mysql::table_price not string');
        {
            this.mysql.host = yamlObj.mysql.host;
            this.mysql.port = yamlObj.mysql.port;
            this.mysql.user = yamlObj.mysql.user;
            this.mysql.password = yamlObj.mysql.password;
            this.mysql.database = yamlObj.mysql.database;
            this.mysql.charset = yamlObj.mysql.charset;
            this.mysql.table_event = yamlObj.mysql.table_event;
            this.mysql.table_price = yamlObj.mysql.table_price;
        }


        if (!yamlObj.openseaApiKey) throw new Error('openseaApiKey not found');
        if (typeof (yamlObj.openseaApiKey) !== 'object') throw new Error('openseaApiKey not object');
        if (yamlObj.openseaApiKey.length === 0) throw new Error('openseaApiKey is empty');
        this.openseaApiKey = yamlObj.openseaApiKey;

        //# contracts event config 
        if (!yamlObj.collections) throw new Error('collections config not found');
        if (!yamlObj.collections.length) throw new Error('collections config not found');
        for (let i = 0; i < yamlObj.collections.length; i++) {
            const collection = yamlObj.collections[i];
            if (!collection.address) throw new Error('collections::address not found');
            if (!collection.collection_slug) throw new Error('collections::collection_slug not found');
            if (typeof (collection.address) !== 'string') throw new Error('collections::address not string');
            if (typeof (collection.collection_slug) !== 'string') throw new Error('collections::collection_slug not string');
            this.collections.push({
                address: (collection.address as string).toLowerCase(),
                collection_slug: collection.collection_slug as string
            });
        }

    }

    public static getInstance() {
        if (!YamlConfig.instance) {
            YamlConfig.instance = new YamlConfig();
        }
        return YamlConfig.instance;
    }

}

interface collection {
    address: string;
    collection_slug: string;
}