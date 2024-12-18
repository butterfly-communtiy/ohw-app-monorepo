import { SerialComponent } from "../page/SerialComponent";

export function meta() {
  return [{ title: "App" }, { name: "description", content: "" }];
}

export default function Index() {
  return <SerialComponent />;
}
