// ETL for data from Messari API
export function crypto_messari_etl(raw_data: any): string {
  const data = raw_data.data;
  return `${data.name} [${data.symbol}]\nCurrent Price: $${Number(
    data.market_data.price_usd.toFixed(2)
  ).toLocaleString()}\nVolume(1h): ${Number(
    data.market_data.ohlcv_last_1_hour.volume.toFixed(0)
  ).toLocaleString()}\nPercent Change(1h): ${Number(
    data.market_data.percent_change_usd_last_1_hour.toFixed(2)
  ).toLocaleString()}%\n\n`;
}
