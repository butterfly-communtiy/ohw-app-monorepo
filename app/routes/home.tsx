import { Welcome } from "../welcome/welcome";

export function meta() {
  return [{ title: "App" }, { name: "description", content: "" }];
}

export default function Home() {
  return <Welcome />;
}
