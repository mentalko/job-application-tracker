import { createTheme } from "@mantine/core";
import { DateInput, DateTimePicker } from "@mantine/dates";
import classes from "./theme.module.css";

// Every date picker marks today.
const todayProps = { highlightToday: true, classNames: { day: classes.day } };

export const theme = createTheme({
  primaryColor: "indigo",
  defaultRadius: "md",
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headings: { fontWeight: "650" },
  components: {
    DateInput: DateInput.extend({ defaultProps: todayProps }),
    DateTimePicker: DateTimePicker.extend({ defaultProps: todayProps }),
  },
});
