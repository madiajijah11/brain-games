import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], theme: { extend: { colors: { ink: "#172033", muted: "#697386", brand: "#6658D3", canvas: "#F6F7FB" }, boxShadow: { soft: "0 12px 35px rgba(20, 28, 55, .07)" } } }, plugins: [] };
export default config;
