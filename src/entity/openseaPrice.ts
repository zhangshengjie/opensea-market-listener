
export interface Stats {
    one_hour_volume: number;
    one_hour_change: number;
    one_hour_sales: number;
    one_hour_sales_change: number;
    one_hour_average_price: number;
    one_hour_difference: number;
    six_hour_volume: number;
    six_hour_change: number;
    six_hour_sales: number;
    six_hour_sales_change: number;
    six_hour_average_price: number;
    six_hour_difference: number;
    one_day_volume: number;
    one_day_change: number;
    one_day_sales: number;
    one_day_sales_change: number;
    one_day_average_price: number;
    one_day_difference: number;
    seven_day_volume: number;
    seven_day_change: number;
    seven_day_sales: number;
    seven_day_average_price: number;
    seven_day_difference: number;
    thirty_day_volume: number;
    thirty_day_change: number;
    thirty_day_sales: number;
    thirty_day_average_price: number;
    thirty_day_difference: number;
    total_volume: number;
    total_sales: number;
    total_supply: number;
    count: number;
    num_owners: number;
    average_price: number;
    num_reports: number;
    market_cap: number;
    floor_price: number;
}

export interface OpenseaPrice {
    stats: Stats;
}
