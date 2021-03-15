// higher order function types
export type CryptoDataFunction = (
  crypto_ticker: string,
  api_key: string
) => Promise<any>;

export type EtlFunction = (raw_data: any) => string;
