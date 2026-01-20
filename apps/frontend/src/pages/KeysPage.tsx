import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Switch,
  Table,
  Tag,
  Typography,
  Space,
  InputNumber,
  DatePicker,
  message
} from "antd";
import dayjs from "dayjs";
import { api } from "../api/client";

const { Title, Text } = Typography;

type KeyRecord = {
  id: string;
  name: string;
  prefix: string;
  status: "active" | "disabled";
  scopes: Record<string, unknown>;
  dailyUsdLimit?: number | null;
  totalUsdLimit?: number | null;
  expiresAt?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
};

type CreateResponse = KeyRecord & { apiKey: string };

export default function KeysPage() {
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editKey, setEditKey] = useState<KeyRecord | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const parseScopes = (value: unknown) => {
    if (!value) return { mode: "all" };
    if (typeof value === "object") return value as Record<string, unknown>;
    try {
      return JSON.parse(value as string);
    } catch {
      message.error("Scope JSON 格式不正确");
      return { mode: "all" };
    }
  };

  const loadKeys = async () => {
    setLoading(true);
    try {
      const res = await api.get<KeyRecord[]>("/api/keys");
      setKeys(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const createKey = async () => {
    const values = await form.validateFields();
    const scopesValue = parseScopes(values.scopes);
    const res = await api.post<CreateResponse>("/api/keys", {
      ...values,
      scopes: scopesValue,
      expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null
    });
    message.success("Key 已创建，请立即保存明文 Key");
    Modal.info({
      title: "新 Key 已生成",
      content: (
        <div>
          <Text strong>API Key:</Text>
          <div style={{ wordBreak: "break-all", marginTop: 8 }}>{res.data.apiKey}</div>
        </div>
      )
    });
    setCreateOpen(false);
    form.resetFields();
    loadKeys();
  };

  const updateKey = async () => {
    const values = await editForm.validateFields();
    if (!editKey) return;
    const scopesValue = parseScopes(values.scopes);
    await api.patch(`/api/keys/${editKey.id}`, {
      ...values,
      scopes: scopesValue,
      status: values.status ? "active" : "disabled",
      expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null
    });
    message.success("Key 已更新");
    setEditKey(null);
    loadKeys();
  };

  const deleteKey = async (id: string) => {
    await api.delete(`/api/keys/${id}`);
    message.success("Key 已删除");
    loadKeys();
  };

  return (
    <Card>
      <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={4}>API 密钥管理</Title>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          创建 Key
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={keys}
        style={{ marginTop: 16 }}
        columns={[
          { title: "名称", dataIndex: "name" },
          {
            title: "Key 前缀",
            dataIndex: "prefix",
            render: (value) => <Tag color="blue">{value}</Tag>
          },
          {
            title: "Scope",
            dataIndex: "scopes",
            render: (value) => <Tag>{(value as any)?.mode ?? "all"}</Tag>
          },
          {
            title: "状态",
            dataIndex: "status",
            render: (value) => (value === "active" ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>)
          },
          { title: "日额度", dataIndex: "dailyUsdLimit" },
          { title: "总额度", dataIndex: "totalUsdLimit" },
          {
            title: "到期时间",
            dataIndex: "expiresAt",
            render: (value) => (value ? dayjs(value).format("YYYY-MM-DD") : "-"),
          },
          {
            title: "操作",
            render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => {
                  setEditKey(record);
                editForm.setFieldsValue({
                  status: record.status === "active",
                  scopes: JSON.stringify(record.scopes ?? { mode: "all" }),
                  dailyUsdLimit: record.dailyUsdLimit,
                  totalUsdLimit: record.totalUsdLimit,
                  expiresAt: record.expiresAt ? dayjs(record.expiresAt) : null
                });
                }}>
                  编辑
                </Button>
                <Button size="small" danger onClick={() => deleteKey(record.id)}>
                  删除
                </Button>
              </Space>
            )
          }
        ]}
      />

      <Modal
        title="创建 API Key"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={createKey}
        okText="生成"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="例如：Codex Key" />
          </Form.Item>
          <Form.Item name="scopes" label="Scope" initialValue='{"mode":"all"}'>
            <Input placeholder='{"mode":"all"}' />
          </Form.Item>
          <Form.Item name="dailyUsdLimit" label="日额度 (USD)">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="totalUsdLimit" label="总额度 (USD)">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="expiresAt" label="到期时间">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑 API Key"
        open={!!editKey}
        onCancel={() => setEditKey(null)}
        onOk={updateKey}
        okText="保存"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="status" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item name="scopes" label="Scope">
            <Input placeholder='{"mode":"codex-only"}' />
          </Form.Item>
          <Form.Item name="dailyUsdLimit" label="日额度 (USD)">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="totalUsdLimit" label="总额度 (USD)">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="expiresAt" label="到期时间">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
