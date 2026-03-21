"use client";

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { PropsWithChildren } from "react";
import { ShelbyClientProvider } from "@shelby-protocol/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createShelbyClient } from "@/lib/shelbyClient";

const shelbyClient = createShelbyClient();
const queryClient = new QueryClient();

export default function WalletProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ShelbyClientProvider client={shelbyClient}>
        <AptosWalletAdapterProvider
          autoConnect={true}
          dappConfig={{
            network: Network.TESTNET,
            aptosApiKeys: {
              testnet: process.env.NEXT_PUBLIC_APTOS_API_KEY,
            },
          }}
          onError={(error) => {
            console.error("Wallet error:", error);
          }}
        >
          {children}
        </AptosWalletAdapterProvider>
      </ShelbyClientProvider>
    </QueryClientProvider>
  );
}