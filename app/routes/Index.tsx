import { Layout } from "../components/Layout";
import { Home } from "../components/Home";

export function meta() {
  return [{ title: "OHW - Open Hardware Wallet" }, { name: "description", content: "Secure, open-source hardware wallet solution" }];
}

export default function Index() {
  return (
    <Layout>
      <Home />
    </Layout>
  );
}
