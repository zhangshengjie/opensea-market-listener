
export interface Asset {
    asset_contract: address;
    token_id: string;
}

export interface PaymentToken {
    symbol: string;
    address: string;
    name: string;
    decimals: number;
    eth_price: string;
    usd_price: string;
}

export interface Transaction {
    block_hash: string;
    block_number: string;
    id: number;
    timestamp: string;
    transaction_hash: string;
    transaction_index: string;
}

export interface address {
    address: string;
}


export interface AssetEvent {
    asset: Asset;
    event_type: string;
    event_timestamp: Date;
    total_price: string;
    payment_token: PaymentToken;
    transaction: Transaction;
    created_date: Date;
    quantity: string;
    contract_address: string;
    id: number;
    seller: address;
    winner_account: address;
}



export interface OpenSeaEvent {
    next: string;
    previous: string;
    asset_events: AssetEvent[];
}

