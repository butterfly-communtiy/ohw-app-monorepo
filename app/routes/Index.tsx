import { TestPage } from "../page/TestPage";

export function meta() {
  return [{ title: "App" }, { name: "description", content: "" }];
}

export default function Index() {
  return <TestPage />;
}
