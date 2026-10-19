import { MantineProvider } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import { theme } from "./theme";

test("date pickers mark today", async () => {
  render(
    <MantineProvider theme={theme}>
      <DateInput label="When" />
    </MantineProvider>,
  );
  fireEvent.click(screen.getByLabelText("When"));
  await waitFor(() => expect(document.querySelector("[data-today]")).not.toBeNull());
  const today = document.querySelector("[data-today]");
  expect(today).toHaveAttribute("data-highlight-today");
  expect(today?.className).toMatch(/day/);
});
