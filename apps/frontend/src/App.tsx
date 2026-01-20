import { Layout, Menu } from "antd";
import { useState } from "react";
import KeysPage from "./pages/KeysPage";
import UsagePage from "./pages/UsagePage";

const { Header, Content, Sider } = Layout;

export default function App() {
  const [activeKey, setActiveKey] = useState("keys");

  return (
    <Layout className="layout">
      <Sider theme="light" width={220}>
        <div style={{ padding: 16, fontWeight: 600 }}>Codex 转发平台</div>
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          onClick={(e) => setActiveKey(e.key)}
          items={[
            { key: "keys", label: "API 密钥管理" },
            { key: "usage", label: "使用统计" }
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ background: "#fff", padding: "0 24px" }}>
          {activeKey === "keys" ? "API 密钥管理" : "使用统计"}
        </Header>
        <Content className="page-content">
          {activeKey === "keys" ? <KeysPage /> : <UsagePage />}
        </Content>
      </Layout>
    </Layout>
  );
}
