const emptyFeatures = {
  "aptos:account": { get: () => null },
  "aptos:connect": { connect: () => {} },
  "aptos:disconnect": { disconnect: () => {} },
  "aptos:signTransaction": {},
  "aptos:signMessage": {},
};

export class AptosConnectWallet {
  name = "AptosConnect";
  version = "1.0.0";
  icon = "";
  chains = [];
  accounts = [];
  features = emptyFeatures;
}

export class AptosConnectGoogleWallet extends AptosConnectWallet {
  name = "AptosConnectGoogle";
}

export class AptosConnectAppleWallet extends AptosConnectWallet {
  name = "AptosConnectApple";
}

export const AptosConnectWalletPlugin = {
  wallets: [],
};

export default {
  AptosConnectWallet,
  AptosConnectGoogleWallet,
  AptosConnectAppleWallet,
  AptosConnectWalletPlugin,
};