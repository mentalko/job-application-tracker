import { createTheme } from "@mantine/core";
import { DateInput, DateTimePicker } from "@mantine/dates";
import classes from "./theme.module.css";

// Every date picker marks today (classNames here merge with any a picker passes itself).
const today = { defaultProps: { highlightToday: true }, classNames: { day: classes.day } };

export const theme = createTheme({
  primaryColor: "indigo",
  defaultRadius: "md",
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headings: { fontWeight: "650" },
  components: {
    DateInput: DateInput.extend(today),
    DateTimePicker: DateTimePicker.extend(today),
  },
});
