import { Layout } from "../components/Layout";
import { Home } from "../components/Home";

export function meta() {
  return [{ title: "OHW - Open Hardware Wallet" }, { name: "description", content: "安全、开源的硬件钱包解决方案" }];
}

export default function Index() {
  return (
    <Layout>
      <Home />
    </Layout>
  );
}
