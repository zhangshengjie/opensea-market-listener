/*
 * @Description: 
 * @Version: 1.0
 * @Autor: z.cejay@gmail.com
 * @Date: 2022-08-08 21:53:06
 * @LastEditors: cejay
 * @LastEditTime: 2022-09-23 15:13:49
 */

import { MysqlHelper } from './utils/mysqlHelper';
import { YamlConfig } from './utils/yamlConfig';
import axios from 'axios';
import { AssetEvent, OpenSeaEvent } from './entity/openseaEvent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import math, * as mathjs from 'mathjs'
import { OpenseaPrice } from './entity/openseaPrice';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

process.on('unhandledRejection', (err) => {
    console.error(err);
    process.exit(1);
});


// print current path
console.log(`work path: ${__dirname}`);

const yamlConfig: YamlConfig = YamlConfig.getInstance();
const mysqlHelper = MysqlHelper.getInstance();


async function sleep(s: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, s * 1000);
    });
}

let openseaApiKeyIndex = 0;

async function fetch(contractAddress: string, cursor = ''): Promise<OpenSeaEvent | null> {
    const openseaApiKey = yamlConfig.openseaApiKey[(openseaApiKeyIndex++) % yamlConfig.openseaApiKey.length];
    //const proxyOptions = `socks5://127.0.0.1:1086`; // your sock5 host and port;
    //const httpsAgent = new SocksProxyAgent(proxyOptions);
    const url = `https://api.opensea.io/api/v1/events?only_opensea=true&asset_contract_address=${contractAddress}&event_type=successful&cursor=${cursor}`;
    try {
        const result = await axios({
            //httpsAgent,
            method: 'GET',
            url: url,
            headers: {
                'X-API-KEY': openseaApiKey,
                'accept': 'application/json'
            }
        });

        return result.data as OpenSeaEvent;
    } catch (error) {
        console.log(error);
        return null;
    }

}

interface openSeaEvent {
    openseaId: number;
    block_number: number;
    block_timestamp: number;
    transaction_hash: string;
    quantity: number;
    token_id: string;
    price_eth: string;
    price_usd: string;
    seller: string;
    buyer: string;

}

async function fetchUntilId(contractAddress: string, openSeaId: number) {
    const events: openSeaEvent[] = [];
    let cursor = '';
    for (let index = 0; index < 20; index++) {
        const openSeaEvent = await fetch(contractAddress, cursor);
        if (openSeaEvent && openSeaEvent.asset_events) {
            console.log(`opensea event: contract ${contractAddress}\tevent len ${openSeaEvent.asset_events.length}`);
            for (let index = 0; index < openSeaEvent.asset_events.length; index++) {
                const event = openSeaEvent.asset_events[index];
                const id = event.id;
                if (id <= openSeaId) {
                    return events;
                }

                const block_number = parseInt(event.transaction.block_number);
                const block_timestamp = Math.floor(new Date(event.transaction.timestamp).getTime() / 1000);
                const transaction_hash = event.transaction.transaction_hash;
                const quantity = parseInt(event.quantity, 10);
                const token_id = event.asset.token_id;
                const total_price = mathjs.bignumber(event.total_price);
                const payment_token_decimals = event.payment_token.decimals;
                const token_price = mathjs.divide(total_price, mathjs.pow(10, payment_token_decimals));
                const payment_token_symbol = event.payment_token.symbol;
                const payment_token_eth_price = mathjs.bignumber(event.payment_token.eth_price);
                const payment_token_usd_price = mathjs.bignumber(event.payment_token.usd_price);

                const price_eth = mathjs.multiply(payment_token_eth_price, token_price).toString();
                const price_usd = mathjs.multiply(payment_token_usd_price, token_price).toString();

                const seller = event.seller.address;
                const winner_account = event.winner_account.address;

                events.push({
                    openseaId: id,
                    block_number: block_number,
                    block_timestamp: block_timestamp,
                    transaction_hash: transaction_hash,
                    quantity: quantity,
                    token_id: token_id,
                    price_eth: price_eth,
                    price_usd: price_usd,
                    seller: seller,
                    buyer: winner_account
                });

            }

            if (openSeaEvent.next) {
                cursor = openSeaEvent.next;
            } else {
                return events;
            }
        } else {
            break;
        }
    }
    return events;
}



async function fetchEventForever() {
    while (true) {
        for (let index = 0; index < yamlConfig.collections.length; index++) {
            const collection = yamlConfig.collections[index];
            try {
                const sql = `select IFNULL(max(openseaid),0) as openseaid from ${yamlConfig.mysql.table_event} where contract =?`;
                let data = await mysqlHelper.queryparams(sql, [collection.address]);
                if (data && data.length === 1) {
                    const openseaid = data[0].openseaid;
                    const arr = await fetchUntilId(collection.address, openseaid);
                    if (arr.length > 0) {
                        // insert
                        let insert_sql = `INSERT INTO ${yamlConfig.mysql.table_event} (contract, eventname, openseaid, block_number, block_timestamp, transaction_hash, quantity, token_id, price_eth, price_usd, seller, buyer) VALUES `;

                        let valueArr: string[] = [];

                        for (let arrindex = 0; arrindex < arr.length; arrindex++) {
                            const row = arr[arrindex];
                            valueArr.push(`('${collection.address}','successful',${row.openseaId},${row.block_number},${row.block_timestamp},'${row.transaction_hash}',${row.quantity},'${row.token_id}','${row.price_eth}','${row.price_usd}','${row.seller}','${row.buyer}')`);
                        }

                        await mysqlHelper.queryparams(insert_sql + valueArr.join(','));
                        console.log(`opensea event: contract ${collection.address}\t add event len ${valueArr.length}`);
                    }
                }
            } catch (error) {
                console.log(error);
                await sleep(120);
            }
        }
        await sleep(30);
    }
}



async function fetchPrice(collection_slug: string) {
    /* 
    curl --request GET \
     --url https://api.opensea.io/api/v1/collection/doodles-official/stats \
     --header 'accept: application/json'
    */
    const openseaApiKey = yamlConfig.openseaApiKey[(openseaApiKeyIndex++) % yamlConfig.openseaApiKey.length];
    //const proxyOptions = `socks5://127.0.0.1:1086`; // your sock5 host and port;
    //const httpsAgent = new SocksProxyAgent(proxyOptions);
    const url = `https://api.opensea.io/api/v1/collection/${encodeURI(collection_slug)}/stats`;
    try {
        const result = await axios({
            //httpsAgent,
            method: 'GET',
            url: url,
            headers: {
                'X-API-KEY': openseaApiKey,
                'accept': 'application/json'
            }
        });

        return result.data as OpenseaPrice;
    } catch (error) {
        console.log(error);
        return null;
    }
}


async function fetchPriceForever() {
    while (true) {
        for (let index = 0; index < yamlConfig.collections.length; index++) {
            const collection = yamlConfig.collections[index];
            try {
                const data = await fetchPrice(collection.collection_slug);
                if (data && data.stats) {
                    const stats = data.stats;
                    const sql = `INSERT INTO ${yamlConfig.mysql.table_price} (contract, one_hour_volume, one_hour_change, one_hour_sales, one_hour_sales_change, one_hour_average_price, one_hour_difference, six_hour_volume, six_hour_change, six_hour_sales, six_hour_sales_change, six_hour_average_price, 
                        six_hour_difference, one_day_volume, one_day_change, one_day_sales, one_day_sales_change, one_day_average_price, 
                        one_day_difference, seven_day_volume, seven_day_change, seven_day_sales, seven_day_average_price, 
                        seven_day_difference, thirty_day_volume, thirty_day_change, thirty_day_sales, thirty_day_average_price, 
                        thirty_day_difference, total_volume, total_sales, total_supply, count, num_owners, average_price, 
                        num_reports, market_cap, floor_price) VALUES (
                            '${collection.address}', 
                            ${stats.one_hour_volume}, 
                            ${stats.one_hour_change}, 
                            ${stats.one_hour_sales}, 
                            ${stats.one_hour_sales_change}, 
                            ${stats.one_hour_average_price}, 
                            ${stats.one_hour_difference}, 
                            ${stats.six_hour_volume}, 
                            ${stats.six_hour_change}, 
                            ${stats.six_hour_sales}, 
                            ${stats.six_hour_sales_change}, 
                            ${stats.six_hour_average_price}, 
                            ${stats.six_hour_difference}, 
                            ${stats.one_day_volume}, 
                            ${stats.one_day_change}, 
                            ${stats.one_day_sales}, 
                            ${stats.one_day_sales_change}, 
                            ${stats.one_day_average_price}, 
                            ${stats.one_day_difference}, 
                            ${stats.seven_day_volume}, 
                            ${stats.seven_day_change}, 
                            ${stats.seven_day_sales}, 
                            ${stats.seven_day_average_price}, 
                            ${stats.seven_day_difference},
                            ${stats.thirty_day_volume}, 
                            ${stats.thirty_day_change}, 
                            ${stats.thirty_day_sales}, 
                            ${stats.thirty_day_average_price}, 
                            ${stats.thirty_day_difference}, 
                            ${stats.total_volume}, 
                            ${stats.total_sales}, 
                            ${stats.total_supply}, 
                            ${stats.count}, 
                            ${stats.num_owners}, 
                            ${stats.average_price}, 
                            ${stats.num_reports}, 
                            ${stats.market_cap}, 
                            ${stats.floor_price}
                             )`;
                    await mysqlHelper.queryparams(sql);
                    console.log(`opensea price: contract ${collection.address}\t updated`);
                }
            } catch (error) {
                console.log(error);
                await sleep(120);
            }
        }
        await sleep(60 * 20);
    }
}

async function main() {

    console.log(yamlConfig);

    // check table exists
    {
        const sql = `SELECT count(*) c FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${yamlConfig.mysql.database}' AND TABLE_NAME = '${yamlConfig.mysql.table_event}'`;
        const result = await mysqlHelper.queryparams(sql);
        if (result[0].c == 0) {
            console.log(`table ${yamlConfig.mysql.table_event} not exists`);
            // create table
            const sql = `CREATE TABLE ${yamlConfig.mysql.table_event} (
                id int unsigned NOT NULL AUTO_INCREMENT,
                contract varchar(255) NOT NULL,
                eventname varchar(64) NOT NULL,
                openseaid decimal(16,0) NOT NULL,
                block_number int NOT NULL,
                block_timestamp decimal(11,0) NOT NULL,
                transaction_hash varchar(66) NOT NULL,
                quantity int NOT NULL,
                token_id varchar(255) NOT NULL,
                price_eth decimal(16,6) NOT NULL,
                price_usd decimal(12,2) NOT NULL,
                seller varchar(42) NOT NULL,
                buyer varchar(42) NOT NULL,
                ts_insert timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY opensea_events_contract (contract),
                KEY opensea_events_openseaid (openseaid)
              ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
            await mysqlHelper.queryparams(sql);
        }
    }

    {
        const sql = `SELECT count(*) c FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${yamlConfig.mysql.database}' AND TABLE_NAME = '${yamlConfig.mysql.table_price}'`;
        const result = await mysqlHelper.queryparams(sql);
        if (result[0].c == 0) {
            console.log(`table ${yamlConfig.mysql.table_price} not exists`);
            // create table
            const sql = `CREATE TABLE ${yamlConfig.mysql.table_price} (
                id int unsigned NOT NULL AUTO_INCREMENT,
                ts_insert timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                contract varchar(255) NOT NULL,
                one_hour_volume decimal(20,5) NOT NULL,
                one_hour_change decimal(20,5) NOT NULL,
                one_hour_sales int NOT NULL,
                one_hour_sales_change decimal(20,5) NOT NULL,
                one_hour_average_price decimal(20,5) NOT NULL,
                one_hour_difference decimal(20,5) NOT NULL,
                six_hour_volume decimal(20,5) NOT NULL,
                six_hour_change decimal(20,5) NOT NULL,
                six_hour_sales int NOT NULL,
                six_hour_sales_change decimal(20,5) NOT NULL,
                six_hour_average_price decimal(20,5) NOT NULL,
                six_hour_difference decimal(20,5) NOT NULL,
                one_day_volume decimal(20,5) NOT NULL,
                one_day_change decimal(20,5) NOT NULL,
                one_day_sales int NOT NULL,
                one_day_sales_change decimal(20,5) NOT NULL,
                one_day_average_price decimal(20,5) NOT NULL,
                one_day_difference decimal(20,5) NOT NULL,
                seven_day_volume decimal(20,5) NOT NULL,
                seven_day_change decimal(20,5) NOT NULL,
                seven_day_sales int NOT NULL,
                seven_day_average_price decimal(20,5) NOT NULL,
                seven_day_difference decimal(20,5) NOT NULL,
                thirty_day_volume decimal(20,5) NOT NULL,
                thirty_day_change decimal(20,5) NOT NULL,
                thirty_day_sales int NOT NULL,
                thirty_day_average_price decimal(20,5) NOT NULL,
                thirty_day_difference decimal(20,5) NOT NULL,
                total_volume decimal(20,5) NOT NULL,
                total_sales int NOT NULL,
                total_supply int NOT NULL,
                count int NOT NULL,
                num_owners int NOT NULL,
                average_price decimal(20,5) NOT NULL,
                num_reports int NOT NULL,
                market_cap decimal(20,5) NOT NULL,
                floor_price decimal(20,5) NOT NULL,
                PRIMARY KEY (id)
              ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
            await mysqlHelper.queryparams(sql);
        }
    }


    fetchEventForever();

    fetchPriceForever();




}

main();
