import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Provider } from "react-redux";
import store from "./store";
import "./index.css";
import App from "./App.jsx";

const queryClient = new QueryClient();
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId="954428711596-hhdate05h0catcbh0pogcjgml0a1qfq4.apps.googleusercontent.com">
          <App />
        </GoogleOAuthProvider>
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
);
