import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "./styles.css";
import App from "./App";

const theme = {
  fontFamily: "Fredoka, sans-serif",
  headings: {
    fontFamily: "Bungee, cursive"
  },
  primaryColor: "pink",
  defaultRadius: "xl",
  colors: {
    brand: [
      "#fff2f6",
      "#ffe0ec",
      "#ffc2dc",
      "#ff97c5",
      "#ff69ad",
      "#ff4095",
      "#ff1f7d",
      "#dd005f",
      "#b1004a",
      "#780032"
    ]
  }
};

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </React.StrictMode>
);
