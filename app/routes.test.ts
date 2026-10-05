import { matchRoutes } from "react-router";
import { describe, expect, it } from "vitest";
import routes from "./routes";

describe("application routes", () => {
  it("matches the transaction list route linked by the navigation", () => {
    const matches = matchRoutes(routes, "/transactions");

    expect(matches?.at(-1)?.route.path).toBe("transactions");
  });
});
