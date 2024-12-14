import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "App" },
    { name: "description", content: "" },
  ];
}

export default function Home() {
  return <Welcome />;
}
