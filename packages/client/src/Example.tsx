import React from "react";
import { trpc } from "./trpc";

export interface ExampleProps {
}

export const Example: React.FC<ExampleProps> = (props) => {
  const helloQuery = trpc.useQuery(["hello", { text: "world" }]);

  if (helloQuery.isLoading) {
    return <div>Loading...</div>
  }

  if (helloQuery.isError) {
    return <div>Error: {helloQuery.error.message}</div>
  }

  return (
    <div>
      Greeting: {helloQuery.data?.greeting}
    </div>
  );
};
