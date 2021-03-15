import fetch from "node-fetch";

export function getMessariCryptoData(
  crypto_ticker: string,
  messari_api_key: string
): Promise<any> {
  const api_url = `https://data.messari.io/api/v1/assets/${crypto_ticker}/metrics`;

  return fetch(api_url, {
    headers: {
      "Content-Type": "application/json",
      "x-messari-api-key": messari_api_key,
    },
  })
    .then((res) => res.json())
    .then((json) => json);
}
