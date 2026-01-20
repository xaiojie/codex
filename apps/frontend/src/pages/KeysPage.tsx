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
  Select,
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
type KeyTestResponse = {
  valid: boolean;
  reason?: "invalid_format" | "invalid_api_key" | "disabled_api_key" | "expired_api_key";
};

export default function KeysPage() {
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editKey, setEditKey] = useState<KeyRecord | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [testLoading, setTestLoading] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const formatTestReason = (reason?: KeyTestResponse["reason"]) => {
    switch (reason) {
      case "invalid_format":
        return "Key 格式不正确";
      case "invalid_api_key":
        return "Key 不存在";
      case "disabled_api_key":
        return "Key 已被禁用";
      case "expired_api_key":
        return "Key 已过期";
      default:
        return "未知原因";
    }
  };

  const parseScopes = (value: unknown) => {
    if (!value) return { mode: "all" };
    if (typeof value === "object") return value as Record<string, unknown>;
    try {
      return JSON.parse(value as string);
    } catch {
      // message.error("Scope JSON 格式不正确"); // Removed to avoid error on simple string
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

  const testKey = async (apiKey: string) => {
    if (!apiKey) return;
    setTestLoading(true);
    try {
      const res = await api.post<KeyTestResponse>("/api/keys/test", { apiKey });
      if (res.data.valid) {
        message.success("API Key 测试通过");
      } else {
        message.error(`API Key 无效：${formatTestReason(res.data.reason)}`);
      }
    } catch {
      message.error("API Key 测试失败");
    } finally {
      setTestLoading(false);
    }
  };

  const regenerateKey = async (id: string) => {
    Modal.confirm({
      title: "确认重置 Key?",
      content: "重置后，旧的 Key 将立即失效，您将获得一个新的 Key。",
      onOk: async () => {
        try {
          const res = await api.post<CreateResponse>(`/api/keys/${id}/regenerate`);
          message.success("Key 已重置，请立即保存新 Key");
          setCreatedKey(res.data.apiKey);
          loadKeys();
        } catch {
          message.error("重置失败");
        }
      }
    });
  };

  const createKey = async () => {
    const values = await form.validateFields();
    // provider is handled directly by the API in create
    const res = await api.post<CreateResponse>("/api/keys", {
      ...values,
      expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null
    });
    message.success("Key 已创建，请立即保存明文 Key");
    setCreatedKey(res.data.apiKey);
    setCreateOpen(false);
    form.resetFields();
    loadKeys();
  };

  const updateKey = async () => {
    const values = await editForm.validateFields();
    if (!editKey) return;
    
    // Convert provider back to scopes for update
    const scopes = { 
        provider: values.provider,
        mode: values.provider === 'codex-only' ? 'codex-only' : 'all' // Keep backward compatibility if needed
    };

    await api.patch(`/api/keys/${editKey.id}`, {
      ...values,
      scopes,
      status: values.status ? "active" : "disabled",
      expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null
    });
    message.success("Key 已更新");
    setEditKey(null);
    loadKeys();
  };

  const deleteKeys = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => api.delete(`/api/keys/${id}`)));
      message.success(`已删除 ${ids.length} 个 Key`);
      setSelectedRowKeys([]);
      loadKeys();
    } catch {
      message.error("批量删除失败");
    }
  };

  const deleteKey = async (id: string) => {
    await api.delete(`/api/keys/${id}`);
    message.success("Key 已删除");
    loadKeys();
  };

  return (
    <Card>
      <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>API 密钥管理</Title>
          {selectedRowKeys.length > 0 && (
            <Button 
              danger 
              onClick={() => {
                Modal.confirm({
                  title: `确认删除选中的 ${selectedRowKeys.length} 个 Key?`,
                  content: "此操作不可恢复",
                  onOk: () => deleteKeys(selectedRowKeys as string[])
                });
              }}
            >
              批量删除 ({selectedRowKeys.length})
            </Button>
          )}
        </Space>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          创建 Key
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={keys}
        style={{ marginTop: 16 }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: keys.length,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          }
        }}
        columns={[
          { title: "名称", dataIndex: "name" },
          {
            title: "Key 前缀",
            dataIndex: "prefix",
            render: (value) => (
              <Space>
                <Tag color="blue">{value}...</Tag>
                <Button 
                  type="text" 
                  size="small" 
                  onClick={() => {
                    // Only prefix is available for security, but we can copy the prefix
                    // Or if we had the full key in local state (which we don't for security), we could copy it
                    // For now, let's copy the prefix as a placeholder or indicate it's partial
                    navigator.clipboard.writeText(value);
                    message.success("Key 前缀已复制");
                  }}
                >
                  复制前缀
                </Button>
              </Space>
            )
          },
          {
            title: "Provider",
            dataIndex: "scopes",
            render: (value) => {
              const scopes = value as any;
              const provider = scopes?.provider ?? "all";
              const colorMap: Record<string, string> = {
                all: "blue",
                openai: "green",
                anthropic: "purple",
                gemini: "orange"
              };
              return <Tag color={colorMap[provider] ?? "default"}>{provider.toUpperCase()}</Tag>;
            }
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
                  provider: (record.scopes as any)?.provider ?? "all",
                  dailyUsdLimit: record.dailyUsdLimit,
                  totalUsdLimit: record.totalUsdLimit,
                  expiresAt: record.expiresAt ? dayjs(record.expiresAt) : null
                });
                }}>
                  编辑
                </Button>
                <Button size="small" onClick={() => regenerateKey(record.id)}>
                  重置 Key
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
          <Form.Item name="provider" label="供应商 (Provider)" initialValue="all">
            <Select>
              <Select.Option value="all">全部 (All)</Select.Option>
              <Select.Option value="openai">OpenAI</Select.Option>
              <Select.Option value="anthropic">Anthropic</Select.Option>
              <Select.Option value="gemini">Gemini</Select.Option>
            </Select>
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
          <Form.Item name="provider" label="供应商 (Provider)">
            <Select>
              <Select.Option value="all">全部 (All)</Select.Option>
              <Select.Option value="openai">OpenAI</Select.Option>
              <Select.Option value="anthropic">Anthropic</Select.Option>
              <Select.Option value="gemini">Gemini</Select.Option>
            </Select>
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
        title="新 Key 已生成"
        open={!!createdKey}
        onCancel={() => setCreatedKey(null)}
        onOk={() => setCreatedKey(null)}
        okText="完成"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text type="secondary">明文 Key 仅显示一次，请立即保存。</Text>
          <Text strong>API Key:</Text>
          <Text
            style={{ wordBreak: "break-all" }}
            copyable={
              createdKey
                ? { text: createdKey, tooltips: ["复制", "已复制"] }
                : false
            }
          >
            {createdKey}
          </Text>
          <Button onClick={() => testKey(createdKey ?? "")} loading={testLoading}>
            测试 Key
          </Button>
        </Space>
      </Modal>
    </Card>
  );
}
