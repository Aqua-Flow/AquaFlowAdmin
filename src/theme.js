import { createTheme, responsiveFontSizes } from "@mui/material/styles";

// Water business identity: deep marine navy surfaces + a bright aqua accent.
// Kept as a proper MUI theme so every component inherits it.
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0288a6", dark: "#016479", light: "#4fb3c7", contrastText: "#ffffff" },
    secondary: { main: "#00c2a8" },
    background: { default: "#f2f6f8", paper: "#ffffff" },
    success: { main: "#2e9e6b" },
    warning: { main: "#e0913a" },
    error: { main: "#d0455f" },
    text: { primary: "#0f2933", secondary: "#5a7480" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontWeight: 700 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiCard: {
      styleOverrides: {
        root: { border: "1px solid rgba(15,41,51,0.06)", boxShadow: "0 1px 2px rgba(15,41,51,0.04)" },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiAppBar: {
      styleOverrides: { root: { backgroundColor: "#ffffff", color: "#0f2933" } },
    },
  },
});

export default responsiveFontSizes(theme);
