import { type RouteConfig, index } from "@react-router/dev/routes";

export default [
  index("routes/Index.tsx"),
  { path: "test", file: "routes/test.tsx" },
] satisfies RouteConfig;
