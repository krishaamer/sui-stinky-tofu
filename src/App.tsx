import { LoadingButton } from "@mui/lab";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { fromB64 } from "@mysten/bcs";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { SuiClient } from "@mysten/sui.js/client";
import { SerializedSignature } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { MIST_PER_SUI } from "@mysten/sui.js/utils";
import {
  genAddressSeed,
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
  jwtToAddress,
} from "@mysten/zklogin";
import axios from "axios";
import { BigNumber } from "bignumber.js";
import { JwtPayload, jwtDecode } from "jwt-decode";
import { enqueueSnackbar } from "notistack";
import queryString from "query-string";
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import "./App.css";
import KakaoLogo from "./assets/kakao.png";
import {
  REST_API_KEY,
  FULLNODE_URL,
  KEY_PAIR_SESSION_STORAGE_KEY,
  MAX_EPOCH_LOCAL_STORAGE_KEY,
  RANDOMNESS_SESSION_STORAGE_KEY,
  REDIRECT_URI,
  SUI_DEVNET_FAUCET,
  SUI_PROVER_DEV_ENDPOINT,
  USER_SALT_LOCAL_STORAGE_KEY,
} from "./constant";

export type PartialZkLoginSignature = Omit<
  Parameters<typeof getZkLoginSignature>["0"]["inputs"],
  "addressSeed"
>;

const suiClient = new SuiClient({ url: FULLNODE_URL });

function App() {
  const { t, i18n } = useTranslation();
  const [currentEpoch, setCurrentEpoch] = useState("");
  const [nonce, setNonce] = useState("");
  const [oauthParams, setOauthParams] =
    useState<queryString.ParsedQuery<string>>();
  const [idToken, setIdToken] = useState("");
  const [zkLoginUserAddress, setZkLoginUserAddress] = useState("");
  const [decodedJwt, setDecodedJwt] = useState<JwtPayload>();
  const [jwtString, setJwtString] = useState("");
  const [ephemeralKeyPair, setEphemeralKeyPair] = useState<Ed25519Keypair>();
  const [userSalt, setUserSalt] = useState<string>();
  const [zkProof, setZkProof] = useState<PartialZkLoginSignature>();
  const [extendedEphemeralPublicKey, setExtendedEphemeralPublicKey] =
    useState("");
  const [maxEpoch, setMaxEpoch] = useState(0);
  const [randomness, setRandomness] = useState("");
  const [fetchingZKProof, setFetchingZKProof] = useState(false);
  const [executingTxn, setExecutingTxn] = useState(false);
  const [executeDigest, setExecuteDigest] = useState("");
  const [lang, setLang] = useState<"zh" | "en">("en");

  const location = useLocation();
  const navigate = useNavigate();

  // Change lng
  useEffect(() => {
    i18n.changeLanguage(lang);
  }, [i18n, lang]);

  useEffect(() => {
    const res = queryString.parse(location.hash);
    setOauthParams(res);
  }, [location]);

  // query jwt id_token
  useEffect(() => {
    if (oauthParams && idToken) {
      const decodedJwt = jwtDecode(idToken);
      setJwtString(idToken as string);
      setDecodedJwt(decodedJwt);
    }
  }, [oauthParams, idToken]);

  useEffect(() => {
    // Check for the presence of the authorization code
    const queryParams = queryString.parse(location.search);
    if (queryParams.code) {
      exchangeCodeForToken(queryParams.code);
    }
  }, [location]);

  useEffect(() => {
    const fetchEpochData = async () => {
      try {
        const { epoch } = await suiClient.getLatestSuiSystemState();
        setCurrentEpoch(epoch);
        window.localStorage.setItem(
          MAX_EPOCH_LOCAL_STORAGE_KEY,
          String(Number(epoch) + 10)
        );
        setMaxEpoch(Number(epoch) + 10);
      } catch (error) {
        console.error("Error fetching epoch data:", error);
        // Handle errors appropriately
      }
    };

    fetchEpochData();
  }, [randomness]);

  useEffect(() => {
    const privateKey = window.sessionStorage.getItem(
      KEY_PAIR_SESSION_STORAGE_KEY
    );
    if (privateKey) {
      const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(
        fromB64(privateKey)
      );
      setEphemeralKeyPair(ephemeralKeyPair);
    }
    const randomness = window.sessionStorage.getItem(
      RANDOMNESS_SESSION_STORAGE_KEY
    );
    if (randomness) {
      setRandomness(randomness);
    }
    const userSalt = window.localStorage.getItem(USER_SALT_LOCAL_STORAGE_KEY);
    if (userSalt) {
      setUserSalt(userSalt);
    }

    const maxEpoch = window.localStorage.getItem(MAX_EPOCH_LOCAL_STORAGE_KEY);

    if (maxEpoch) {
      setMaxEpoch(Number(maxEpoch));
    }
  }, []);

  // query zkLogin address balance
  const { data: addressBalance } = useSuiClientQuery(
    "getBalance",
    {
      owner: zkLoginUserAddress,
    },
    {
      enabled: Boolean(zkLoginUserAddress),
      refetchInterval: 1500,
    }
  );

  const resetState = () => {
    setCurrentEpoch("");
    setNonce("");
    setOauthParams(undefined);
    setZkLoginUserAddress("");
    setDecodedJwt(undefined);
    setJwtString("");
    setEphemeralKeyPair(undefined);
    setUserSalt(undefined);
    setZkProof(undefined);
    setExtendedEphemeralPublicKey("");
    setMaxEpoch(0);
    setRandomness("");
    setFetchingZKProof(false);
    setExecutingTxn(false);
    setExecuteDigest("");
  };

  const resetLocalState = () => {
    try {
      window.sessionStorage.clear();
      window.localStorage.clear();
      resetState();
      navigate(`/`);
      enqueueSnackbar("Reset successful", {
        variant: "success",
      });
    } catch (error) {
      enqueueSnackbar(String(error), {
        variant: "error",
      });
    }
  };

  const exchangeCodeForToken = async (code) => {
    try {
      const response = await axios.post(
        "https://kauth.kakao.com/oauth/token",
        {
          grant_type: "authorization_code",
          client_id: REST_API_KEY,
          redirect_uri: REDIRECT_URI,
          code: code,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      setIdToken(response.data.id_token);

      // Process the id_token as needed
    } catch (error) {
      console.error("Error exchanging code for token", error);
      // Handle errors
    }
  };

  const [requestingFaucet, setRequestingFaucet] = useState(false);

  const requestFaucet = async () => {
    if (!zkLoginUserAddress) {
      return;
    }
    try {
      setRequestingFaucet(true);
      await axios.post(SUI_DEVNET_FAUCET, {
        FixedAmountRequest: {
          recipient: zkLoginUserAddress,
        },
      });
      enqueueSnackbar("Success!", {
        variant: "success",
      });
    } catch (error) {
      enqueueSnackbar(String(error), {
        variant: "error",
      });
    } finally {
      setRequestingFaucet(false);
    }
  };

  const doCryptoStuff = () => {

    // Step 1
    const ephemeralKeyPair = Ed25519Keypair.generate();
    window.sessionStorage.setItem(
      KEY_PAIR_SESSION_STORAGE_KEY,
      ephemeralKeyPair.export().privateKey
    );
    setEphemeralKeyPair(ephemeralKeyPair);

    // Step 3
    const randomness = generateRandomness();
    window.sessionStorage.setItem(RANDOMNESS_SESSION_STORAGE_KEY, randomness);
    setRandomness(randomness);
  };

  return (
    <Box>
      <Box
        sx={{
          mb: "36px",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography
            sx={{
              fontSize: "2rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              columnGap: "16px",
            }}
          >
            SUI ZIRAN{" "}
          </Typography>
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={() => {
              resetLocalState();
            }}
          >
            Reset LocalState
          </Button>
        </Stack>
      </Box>

      {zkLoginUserAddress && (
        <Stack direction="row" spacing={1} sx={{ mt: "24px" }}>
          <Typography>
            <code>
              <Typography
                component="span"
                sx={{
                  fontFamily: "'Noto Sans Mono', monospace;",
                  fontWeight: 600,
                }}
              >
                {zkLoginUserAddress}
              </Typography>
            </code>
          </Typography>
          {addressBalance && (
            <Typography>
              Balance:{" "}
              {BigNumber(addressBalance?.totalBalance)
                .div(MIST_PER_SUI.toString())
                .toFixed(6)}{" "}
              SUI
            </Typography>
          )}
        </Stack>
      )}

      <Box
        sx={{
          mt: "24px",
          p: "12px",
        }}
        className="border border-slate-300 rounded-xl"
      >
        {/* Step 1 */}

        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              disabled={Boolean(ephemeralKeyPair)}
              onClick={() => {
                doCryptoStuff();
              }}
            >
              Create random ephemeral KeyPair{" "}
            </Button>
          </Stack>
          <Typography>
            <SyntaxHighlighter wrapLongLines language="json" style={oneDark}>
              {`// PrivateKey
${JSON.stringify(ephemeralKeyPair?.export())}`}
            </SyntaxHighlighter>
            <SyntaxHighlighter wrapLongLines language="json" style={oneDark}>
              {`// PublicKey:
${JSON.stringify(ephemeralKeyPair?.getPublicKey().toBase64())}`}
            </SyntaxHighlighter>
          </Typography>
        </Stack>

        {/* Step 2 */}

        <Stack spacing={2}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              flexDirection: "column",
            }}
          >
            <Box sx={{ mt: "6px" }}>
              {t("6d47d563")}{" "}
              <code>{currentEpoch}</code>
            </Box>
          </Box>
          <Box
            sx={{
              mt: "16px",
            }}
          >
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography>
              <code>randomness: {randomness}</code>
            </Typography>
          </Stack>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Button
                variant="contained"
                disabled={
                  !ephemeralKeyPair || !maxEpoch || !currentEpoch || !randomness
                }
                onClick={() => {
                  if (!ephemeralKeyPair) {
                    return;
                  }
                  const nonce = generateNonce(
                    ephemeralKeyPair.getPublicKey(),
                    maxEpoch,
                    randomness
                  );
                  setNonce(nonce);
                }}
              >
                Generate Nonce
              </Button>
              {nonce && (
                <Typography>
                  nonce: <code>{nonce}</code>
                </Typography>
              )}
            </Stack>
            <Button
              sx={{
                mt: "24px",
              }}
              disabled={!nonce}
              variant="contained"
              onClick={() => {
                const params = new URLSearchParams({
                  client_id: REST_API_KEY,
                  redirect_uri: REDIRECT_URI,
                  response_type: "code",
                  scope: "openid",
                  nonce: nonce,
                });
                const loginURL = `https://kauth.kakao.com/oauth/authorize?${params}`;
                window.location.replace(loginURL);
              }}
            >
              <img
                src={KakaoLogo}
                width="100px"
                style={{
                  marginRight: "8px",
                }}
                alt="Kakao"
              />{" "}
              Sign In With Kakao
            </Button>
          </Box>
        </Stack>

        {/* Step 3 */}

        <Box>
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 600,
              mb: "12px !important",
            }}
          >
            {t("ef410d70")}
          </Typography>
          {decodedJwt && (
            <Alert
              variant="standard"
              color="success"
              sx={{
                fontWeight: 600,
              }}
            >
              Successfully logged in via Kakao!
            </Alert>
          )}
          <Box sx={{ m: "16px 0" }}>
            UrlQuery: <code>id_token</code>
          </Box>
        </Box>

        {/* Step 4 */}

        <Stack spacing={2}>
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 600,
              mb: "12px !important",
            }}
          >
            {t("b7c54098")}
          </Typography>
          <Typography>{t("ec71ef53")}</Typography>
          <Alert
            severity="warning"
            sx={{
              fontWeight: 600,
            }}
          >
            {t("cb63dedd")}
          </Alert>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{
              mt: "12px!important",
            }}
          >
            <Button
              variant="contained"
              disabled={Boolean(userSalt)}
              onClick={() => {
                const salt = generateRandomness();
                window.localStorage.setItem(USER_SALT_LOCAL_STORAGE_KEY, salt);
                setUserSalt(salt);
              }}
            >
              Generate User Salt
            </Button>
            <Button
              variant="contained"
              disabled={!userSalt}
              color="error"
              onClick={() => {
                const salt = generateRandomness();
                setUserSalt(salt);
                window.localStorage.removeItem(USER_SALT_LOCAL_STORAGE_KEY);
                setUserSalt(undefined);
              }}
            >
              Delete User Salt
            </Button>
          </Stack>
          <Typography>
            User Salt: {userSalt && <code>{userSalt}</code>}
          </Typography>
        </Stack>

        {/* Step 5 */}

        <Stack spacing={2}>
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 600,
              mb: "12px !important",
            }}
          >
            {t("2fb333f5")}
          </Typography>
          <Box>
            <Button
              variant="contained"
              disabled={!userSalt || !jwtString || Boolean(zkLoginUserAddress)}
              onClick={() => {
                if (!userSalt) {
                  return;
                }
                const zkLoginUserAddress = jwtToAddress(jwtString, userSalt);
                setZkLoginUserAddress(zkLoginUserAddress);
              }}
            >
              {t("c9bbf457")}
            </Button>
          </Box>
          <Typography
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            User Sui Address:{" "}
            {zkLoginUserAddress && (
              <code>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: "'Noto Sans Mono', monospace;",
                    fontWeight: 600,
                  }}
                >
                  {zkLoginUserAddress}
                </Typography>
              </code>
            )}
            <LoadingButton
              variant="contained"
              sx={{
                ml: "24px",
              }}
              size="small"
              loading={requestingFaucet}
              disabled={!zkLoginUserAddress}
              onClick={requestFaucet}
            >
              Request Test SUI Token
            </LoadingButton>
          </Typography>
          {zkLoginUserAddress && (
            <Alert severity="success">
              Congratulations! At this stage, your Sui zkLogin address has been
              successfully generated.
              <br />
              You can click the button on the right of the address to claim a
              test SUI Coin.
              <br />
              If there's an error with the service, you can use the{" "}
              <b>devnet faucet</b>{" "}
              <a
                href="https://discord.com/channels/916379725201563759/971488439931392130"
                target="_blank"
              >
                (#Sui official discord)
              </a>{" "}
              to claim test Sui Token in order to proceed to the next step.
            </Alert>
          )}
        </Stack>

        {/* Step 6 */}

        <Stack spacing={2}>
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 600,
              mb: "12px !important",
            }}
          >
            {t("51e8ceeb")}
          </Typography>
          <Typography>{t("446760ac")}</Typography>
          <Typography>{t("c5c9e603")}</Typography>
          <Box>
            <Button
              variant="contained"
              onClick={() => {
                if (!ephemeralKeyPair) {
                  return;
                }
                const extendedEphemeralPublicKey =
                  getExtendedEphemeralPublicKey(
                    ephemeralKeyPair.getPublicKey()
                  );

                setExtendedEphemeralPublicKey(extendedEphemeralPublicKey);
              }}
            >
              {t("71c429d2")}
            </Button>
            <Typography
              sx={{
                mt: "12px",
              }}
            >
              extendedEphemeralPublicKey:
              {extendedEphemeralPublicKey && (
                <code>{extendedEphemeralPublicKey}</code>
              )}
            </Typography>
          </Box>
          <Typography>{t(`16ebd660`)}</Typography>
          <LoadingButton
            loading={fetchingZKProof}
            variant="contained"
            disabled={
              !idToken ||
              !extendedEphemeralPublicKey ||
              !maxEpoch ||
              !randomness ||
              !userSalt
            }
            onClick={async () => {
              try {
                setFetchingZKProof(true);
                const zkProofResult = await axios.post(
                  SUI_PROVER_DEV_ENDPOINT,
                  {
                    jwt: idToken as string,
                    extendedEphemeralPublicKey: extendedEphemeralPublicKey,
                    maxEpoch: maxEpoch,
                    jwtRandomness: randomness,
                    salt: userSalt,
                    keyClaimName: "sub",
                  },
                  {
                    headers: {
                      "Content-Type": "application/json",
                    },
                  }
                );
                setZkProof(zkProofResult.data as PartialZkLoginSignature);
                enqueueSnackbar("Successfully obtain ZK Proof", {
                  variant: "success",
                });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } catch (error: any) {
                console.error(error);
                enqueueSnackbar(
                  String(error?.response?.data?.message || error),
                  {
                    variant: "error",
                  }
                );
              } finally {
                setFetchingZKProof(false);
              }
            }}
          >
            {t("33893c96")}
          </LoadingButton>
        </Stack>

        {/* Step 7 */}

        <Box>
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 600,
              mb: "12px !important",
            }}
          >
            {t("acf1b947")}
          </Typography>
          <Alert severity="warning">{t("d58c9e1e")}</Alert>
          <Typography sx={{ mt: "12px" }}>{t("6591b962")}</Typography>
          <div className="card">
            <LoadingButton
              loading={executingTxn}
              variant="contained"
              disabled={!decodedJwt}
              onClick={async () => {
                try {
                  if (
                    !ephemeralKeyPair ||
                    !zkProof ||
                    !decodedJwt ||
                    !userSalt
                  ) {
                    return;
                  }
                  setExecutingTxn(true);
                  const txb = new TransactionBlock();

                  const [coin] = txb.splitCoins(txb.gas, [MIST_PER_SUI * 1n]);
                  txb.transferObjects(
                    [coin],
                    "0xfa0f8542f256e669694624aa3ee7bfbde5af54641646a3a05924cf9e329a8a36"
                  );
                  txb.setSender(zkLoginUserAddress);

                  const { bytes, signature: userSignature } = await txb.sign({
                    client: suiClient,
                    signer: ephemeralKeyPair, // This must be the same ephemeral key pair used in the ZKP request
                  });
                  if (!decodedJwt?.sub || !decodedJwt.aud) {
                    return;
                  }

                  const addressSeed: string = genAddressSeed(
                    BigInt(userSalt),
                    "sub",
                    decodedJwt.sub,
                    decodedJwt.aud as string
                  ).toString();

                  const zkLoginSignature: SerializedSignature =
                    getZkLoginSignature({
                      inputs: {
                        ...zkProof,
                        addressSeed,
                      },
                      maxEpoch,
                      userSignature,
                    });

                  const executeRes = await suiClient.executeTransactionBlock({
                    transactionBlock: bytes,
                    signature: zkLoginSignature,
                  });

                  enqueueSnackbar(
                    `Execution successful: ${executeRes.digest}`,
                    {
                      variant: "success",
                    }
                  );
                  setExecuteDigest(executeRes.digest);
                } catch (error) {
                  console.error(error);
                  enqueueSnackbar(String(error), {
                    variant: "error",
                  });
                } finally {
                  setExecutingTxn(false);
                }
              }}
            >
              Execute Transaction Block
            </LoadingButton>
            {executeDigest && (
              <Alert severity="success" sx={{ mt: "12px" }}>
                Execution successful:{" "}
                <Typography
                  component="span"
                  sx={{
                    fontFamily: "'Noto Sans Mono', monospace;",
                    fontWeight: 600,
                  }}
                >
                  <a
                    href={`https://suiexplorer.com/txblock/${executeDigest}?network=devnet`}
                    target="_blank"
                  >
                    {executeDigest}
                  </a>
                </Typography>
              </Alert>
            )}
          </div>
        </Box>
      </Box>
    </Box>
  );
}

export default App;
