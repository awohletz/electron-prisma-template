import React from "react";
import logo from "./logo.svg";
import "./App.css";
import { QueryClient, QueryClientProvider } from "react-query";
import { trpc } from "./trpc";
import { customLink } from "./util";
import { Example } from "./Example";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: Infinity
    },
  },
});

const trpcClient = trpc.createClient({
  links: [customLink]
});

window.addEventListener("error", e => {
  window.appApi.log(`Message: ${e.message}
    LineNo: ${e.lineno}
    Stack: ${e.error?.stack}`);
});

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>

        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <Example/>
          </header>
        </div>

      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
