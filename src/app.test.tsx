import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "./router.tsx";

function renderAt(path: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("routes", () => {
  it("opens the census with its title and the first service in the ranking", async () => {
    renderAt("/");
    expect(await screen.findByRole("heading", { level: 1, name: "Census" })).toBeInTheDocument();
    expect(await screen.findByText("Backup archive HSM wrapping key 1")).toBeInTheDocument();
  });

  it("opens one asset by id and shows what replaces it", async () => {
    renderAt("/assets/ast-0097?horizon=2035");
    expect(await screen.findByRole("heading", { level: 1, name: "Backup archive HSM wrapping key 1" })).toBeInTheDocument();
    expect(await screen.findByText(/ML-KEM-1024 key wrapping/)).toBeInTheDocument();
  });

  it("says so when the id is not in the inventory", async () => {
    renderAt("/assets/ast-9999");
    expect(await screen.findByText(/No asset with that id/)).toBeInTheDocument();
  });
});
