"use client";

import { ThemeProvider } from "@mui/material/styles";
import { createTheme } from "@mui/material";
import { SuiClientProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { ReactNode, useState } from "react";
import ThemeConfig from "../theme/index";
import { StyledSnackbarProvider } from "./StyledSnackbarProvider";

const { networkConfig } = createNetworkConfig({
  devnet: { url: getJsonRpcFullnodeUrl("devnet"), network: "devnet" },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider theme={createTheme(ThemeConfig)}>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} network="devnet">
          <StyledSnackbarProvider maxSnack={4} autoHideDuration={3000} />
          {children}
          <Analytics />
        </SuiClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
