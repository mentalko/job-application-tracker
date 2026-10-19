import { MantineProvider } from "@mantine/core";
import { DateInput, DateTimePicker } from "@mantine/dates";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test } from "vitest";
import { theme } from "./theme";
import classes from "./theme.module.css";

test.each<[string, ReactNode]>([
  ["DateInput", <DateInput label="When" />],
  ["DateTimePicker", <DateTimePicker label="When" />],
  ["a picker with its own classNames", <DateInput label="When" classNames={{ input: "mine" }} />],
])("%s marks today", async (_name, picker) => {
  render(<MantineProvider theme={theme}>{picker}</MantineProvider>);
  fireEvent.click(screen.getByLabelText("When"));
  await waitFor(() => expect(document.querySelector("[data-today]")).not.toBeNull());
  const today = document.querySelector("[data-today]");
  expect(today).toHaveAttribute("data-highlight-today");
  expect(today).toHaveClass(String(classes.day));
});
