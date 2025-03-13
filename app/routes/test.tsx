import { Layout } from "../components/Layout";
import { TestPage } from "../page/TestPage";

export function meta() {
  return [{ title: "Test - OHW" }, { name: "description", content: "OHW Hardware Wallet Test Page" }];
}

export default function Test() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* <h1 className="text-3xl font-bold mb-8">Function Test</h1> */}
        <TestPage />
      </div>
    </Layout>
  );
}