import { ShelbyClient } from "@shelby-protocol/sdk/browser";

export const createShelbyClient = () => {
  return new ShelbyClient({
    apiKey: process.env.NEXT_PUBLIC_SHELBY_API_KEY || "",
    network: "shelbynet" as any,
  });
};

export const getShelbyFileUrl = (ownerAddress: string, filename: string): string => {
  return `https://api.shelbynet.shelby.xyz/shelby/v1/blobs/${ownerAddress}/${filename}`;
};