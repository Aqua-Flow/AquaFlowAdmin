import { Dialog, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Drop-in Dialog that goes full-screen on phones.
export default function ResponsiveDialog(props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  return <Dialog fullScreen={fullScreen} {...props} />;
}
