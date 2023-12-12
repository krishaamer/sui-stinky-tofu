/* eslint-disable @typescript-eslint/ban-ts-comment */
import { LoadingButton } from "@mui/lab";
import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
  Paper,
  Avatar,
  Skeleton,
} from "@mui/material";
import { deepOrange } from "@mui/material/colors";
import PixelatedImage from "./PixelatedImage";

import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  timelineItemClasses,
} from "@mui/lab";

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
import { useLocation, useNavigate } from "react-router-dom";
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
  const [tofuImage, setTofuImage] = useState("");
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
  //const [fetchingZKProof, setFetchingZKProof] = useState(false);
  const [executingTxn, setExecutingTxn] = useState(false);
  const [executeDigest, setExecuteDigest] = useState("");

  const location = useLocation();
  const navigate = useNavigate();

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
      }
    };

    fetchEpochData();
  }, [randomness]);

  useEffect(() => {
    const fetchTofuImage = async () => {
      try {
        const randomNumber = Math.floor(Math.random() * 9) + 1;

        setTimeout(() => {
          setTofuImage(`tofu${randomNumber}`);
        }, 2000);
      } catch (error) {
        console.error("Error fetching image data:", error);
      }
    };
    fetchTofuImage();
  }, [
    nonce,
    ephemeralKeyPair,
    extendedEphemeralPublicKey,
    maxEpoch,
    randomness,
    userSalt,
    jwtString,
  ]);

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

  useEffect(() => {
    const fetchNonce = async () => {
      try {
        const nonce = await generateNonce(
          // @ts-ignore
          ephemeralKeyPair.getPublicKey(),
          maxEpoch,
          randomness
        );
        setNonce(nonce);
      } catch (error) {
        console.error("Error fetching nonce data:", error);
        // Handle errors appropriately
      }
    };

    fetchNonce();
  }, [ephemeralKeyPair, maxEpoch, currentEpoch, randomness]);

  useEffect(() => {
    const fetchSalt = async () => {
      try {
        const salt = await generateRandomness();
        window.localStorage.setItem(USER_SALT_LOCAL_STORAGE_KEY, salt);
        setUserSalt(salt);
      } catch (error) {
        console.error("Error fetching randomness data:", error);
        // Handle errors appropriately
      }
    };

    fetchSalt();
  }, [randomness]);

  useEffect(() => {
    const fetchUserAddress = async () => {
      try {
        // @ts-ignore
        const zkLoginUserAddress = await jwtToAddress(jwtString, userSalt);
        setZkLoginUserAddress(zkLoginUserAddress);
      } catch (error) {
        console.error("Error fetching address data:", error);
        // Handle errors appropriately
      }
    };

    fetchUserAddress();
  }, [jwtString, userSalt]);

  useEffect(() => {
    if (userSalt && jwtString) {
      const fetchZKProof = async () => {
        try {
          //setFetchingZKProof(true);
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
        } catch (error) {
          console.error(error);
          // @ts-ignore
          enqueueSnackbar(String(error?.response?.data?.message || error), {
            variant: "error",
          });
        } finally {
          //setFetchingZKProof(false);
        }
      };

      fetchZKProof();
    }
  }, [
    idToken,
    extendedEphemeralPublicKey,
    maxEpoch,
    randomness,
    userSalt,
    jwtString,
    decodedJwt,
    ephemeralKeyPair,
  ]);

  useEffect(() => {
    const fetchExtendedEphemeralPublicKey = async () => {
      try {
        const extendedEphemeralPublicKey = await getExtendedEphemeralPublicKey(
          // @ts-ignore
          ephemeralKeyPair.getPublicKey()
        );

        setExtendedEphemeralPublicKey(extendedEphemeralPublicKey);
      } catch (error) {
        console.error("Error fetching address data:", error);
        // Handle errors appropriately
      }
    };

    fetchExtendedEphemeralPublicKey();
  }, [ephemeralKeyPair]);

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
    setTofuImage("");
    setIdToken("");
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
    //setFetchingZKProof(false);
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

  // @ts-ignore
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
    const ephemeralKeyPair = Ed25519Keypair.generate();
    window.sessionStorage.setItem(
      KEY_PAIR_SESSION_STORAGE_KEY,
      ephemeralKeyPair.export().privateKey
    );
    setEphemeralKeyPair(ephemeralKeyPair);

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
              fontSize: "2.5em",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              color: "#d58a3c",
            }}
          >
            SUI Stinky Tofu 🇹🇼🇰🇷
          </Typography>
          <img src="/tofu-logo.png" height={200} width={200} />
          <Typography
            sx={{
              fontSize: "1.5em",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              color: "#d58a3c",
            }}
          >
            The government of Taiwan has decided to gift the Korean people 10
            million SUI worth of stinky tofu. Use your Kakao account to redeem
            your free stinky tofu 대만 정부는 한국인에게 10백만 SUI 가치의
            냄새나는 두부를 선물하기로 결정했습니다. 카카오 계정을 사용하여 무료
            냄새나는 두부를 받으세요
          </Typography>
        </Stack>
      </Box>

      <Box
        sx={{
          p: "12px",
        }}
        className="border border-yellow-300 border-4 rounded-xl"
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <Button
              size="large"
              variant="contained"
              onClick={() => {
                doCryptoStuff();
              }}
            >
              <Typography sx={{ fontSize: "1.5em", color: "#ffffff" }}>
                1. Start Cooking Tofu 🇹🇼
              </Typography>
            </Button>
            <Button
              size="large"
              disabled={!nonce || !tofuImage}
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
              <Typography sx={{ fontSize: "1.5em", color: "#ffffff" }}>
                2. Sign In With Kakao
              </Typography>
              <img
                src={KakaoLogo}
                width="100px"
                style={{
                  marginLeft: "8px",
                }}
                alt="Kakao"
              />
            </Button>
            <LoadingButton
              size="large"
              variant="contained"
              loading={requestingFaucet}
              disabled={!zkLoginUserAddress}
              onClick={requestFaucet}
            >
              <Typography sx={{ fontSize: "1.5em", color: "#ffffff" }}>
                3. Get Taiwanese Money 💰
              </Typography>
            </LoadingButton>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => {
                resetLocalState();
              }}
            >
              Restart
            </Button>
          </Stack>
        </Stack>
      </Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          my: 5,
        }}
      >
        <Box
          sx={{
            minHeight: 400,
            height: "100%",
            width: "100%",
            overflowY: "auto",
          }}
        >
          {tofuImage && ephemeralKeyPair ? (
            <PixelatedImage src={`/${tofuImage}.jpg`} loadingTime={5000} />
          ) : (
            <Skeleton
              variant="circular"
              width={400}
              height={400}
              sx={{ bgcolor: "#fee52c" }}
            />
          )}
        </Box>
        <Box>
          <Typography
            sx={{
              fontSize: "1.5em",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              columnGap: "16px",
            }}
          >
            Tofu Logs
          </Typography>
          <Paper
            elevation={3}
            sx={{
              width: 500,
              height: 370,
              overflowY: "scroll",
            }}
          >
            <Timeline
              sx={{
                [`& .${timelineItemClasses.root}:before`]: {
                  flex: 0,
                  padding: 0,
                },
              }}
            >
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <div style={{ overflowWrap: "anywhere" }}>
                    {`Private Key ${JSON.stringify(
                      ephemeralKeyPair?.export()
                    )}`}
                  </div>
                </TimelineContent>
              </TimelineItem>
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <div style={{ overflowWrap: "anywhere" }}>
                    {`Public Key: ${JSON.stringify(
                      ephemeralKeyPair?.getPublicKey().toBase64()
                    )}`}
                  </div>
                </TimelineContent>
              </TimelineItem>
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <div
                    style={{ overflowWrap: "anywhere" }}
                  >{`Current Epoch: ${currentEpoch}`}</div>
                </TimelineContent>
              </TimelineItem>
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <div
                    style={{ overflowWrap: "anywhere" }}
                  >{`Randomness: ${randomness}`}</div>
                </TimelineContent>
              </TimelineItem>
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <div
                    style={{ overflowWrap: "anywhere" }}
                  >{`Nonce: ${nonce}`}</div>
                </TimelineContent>
              </TimelineItem>
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <div
                    style={{ overflowWrap: "anywhere" }}
                  >{`Salt: ${userSalt}`}</div>
                </TimelineContent>
              </TimelineItem>
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <div
                    style={{ overflowWrap: "anywhere" }}
                  >{`ID Token: ${idToken}`}</div>
                </TimelineContent>
              </TimelineItem>
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <div
                    style={{ overflowWrap: "anywhere" }}
                  >{`User SUI Address: ${zkLoginUserAddress}`}</div>
                </TimelineContent>
              </TimelineItem>
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot />
                </TimelineSeparator>
                <TimelineContent>
                  <div
                    style={{ overflowWrap: "anywhere" }}
                  >{`extendedEphemeralPublicKey ${extendedEphemeralPublicKey}`}</div>
                </TimelineContent>
              </TimelineItem>
            </Timeline>
          </Paper>
        </Box>
      </Stack>
      <Box
        sx={{
          p: "12px",
        }}
        className="border border-yellow-300 border-4 rounded-xl"
      >
        {idToken && (
          <Alert variant="outlined" color="success">
            Signed in with Kakao
          </Alert>
        )}
        {zkLoginUserAddress && (
          <Stack direction="row" spacing={2} sx={{ mt: "2px", mb: "24px" }}>
            <Avatar sx={{ bgcolor: deepOrange[500] }}>KJ</Avatar>
            <Typography sx={{ pt: "8px" }}>
              <code>
                Kakao Account:{" "}
                <Typography component="span">{zkLoginUserAddress}</Typography>
              </code>
            </Typography>
            {addressBalance && (
              <Typography sx={{ pt: "8px", fontWeight: 600 }}>
                {" "}
                {BigNumber(addressBalance?.totalBalance)
                  .div(MIST_PER_SUI.toString())
                  .toFixed(6)}{" "}
                SUI MONEY 💰
              </Typography>
            )}
          </Stack>
        )}
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <LoadingButton
              size="large"
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
                    "0xc2e1c711e827f27dea0a065b2767eb64296c95dffa152efbd834a3b6306a33f8"
                  );

                  //const imageUrl = `https://sui-stinky-tofu.vercel.app/tofus/tofu${tofuImage}.png`;
                  //txb.addMetadata({ imageUrl });
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

                  enqueueSnackbar(`Stinky Tofu Saved: ${executeRes.digest}`, {
                    variant: "success",
                  });
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
              <Typography
                sx={{ fontSize: "1.8em", color: "#ffffff", fontWeight: 500 }}
              >
                Buy This Stinky Tofu
              </Typography>
            </LoadingButton>
            <Typography
              sx={{
                fontSize: "1.5em",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                color: "#d58a3c",
              }}
            >
              Travel to Taiwan in 2024 to redeem your Digital Stinky Tofu for a
              Real One. Yummy! 😋
            </Typography>
          </Stack>
        </Stack>
        <Box>
          {executeDigest && (
            <Alert severity="success" sx={{ mt: "12px" }}>
              Stinky Tofu Saved!{" "}
              <Typography component="span">
                <a
                  href={`https://suiexplorer.com/txblock/${executeDigest}?network=devnet`}
                  target="_blank"
                >
                  {executeDigest}
                </a>
              </Typography>
            </Alert>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default App;
