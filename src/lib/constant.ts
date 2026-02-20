export const FULLNODE_URL = process.env.NEXT_PUBLIC_SUI_FULLNODE_URL || "https://fullnode.devnet.sui.io";

export const REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || "";

export const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3001";

export const SUI_DEVNET_FAUCET = process.env.NEXT_PUBLIC_SUI_FAUCET_URL || "https://faucet.devnet.sui.io/gas";

export const SUI_PROVER_DEV_ENDPOINT = process.env.NEXT_PUBLIC_SUI_PROVER_ENDPOINT || "https://prover-dev.mystenlabs.com/v1";

export const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS || "0xc2e1c711e827f27dea0a065b2767eb64296c95dffa152efbd834a3b6306a33f8";

export const KEY_PAIR_SESSION_STORAGE_KEY = "demo_ephemeral_key_pair";

export const USER_SALT_LOCAL_STORAGE_KEY = "demo_user_salt_key_pair";

export const RANDOMNESS_SESSION_STORAGE_KEY = "demo_randomness_key_pair";

export const MAX_EPOCH_LOCAL_STORAGE_KEY = "demo_max_epoch_key_pair";

export const STEPS_LABELS_TRANS_KEY = [
  "16e758e8",
  "9b8b5398",
  "8adf5b45",
  "8b72e7cd",
  "66f6b490",
  "af802c7a",
  "c649dd70",
];

export const STEPS_DESC = [
  "ephemeralKeyPair",
  "47b83f4e",
  "fb399be8",
  "0a710e64",
  "32255d31",
  "8f2433d9",
];
