import { useState } from "react";
import { Button, Card, Form, Input, Space, Typography, message, AutoComplete } from "antd";
import { api } from "../api/client";

const { Title, Text } = Typography;
const { TextArea } = Input;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildTranscript(messages: ChatMessage[]) {
  return messages
    .map((item) => `${item.role === "user" ? "用户" : "助手"}：${item.content}`)
    .join("\n");
}

function extractOutputText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  // Check for standard OpenAI chat completion format
  if (Array.isArray(data?.choices) && data.choices.length > 0) {
    const choice = data.choices[0];
    if (typeof choice?.message?.content === "string") {
      return choice.message.content;
    }
  }

  const outputs = Array.isArray(data?.output) ? data.output : [];
  const chunks: string[] = [];
  for (const output of outputs) {
    const content = Array.isArray(output?.content) ? output.content : [];
    for (const part of content) {
      if (typeof part?.text === "string") {
        chunks.push(part.text);
      }
    }
    if (typeof output?.text === "string") {
      chunks.push(output.text);
    }
  }
  const text = chunks.join("");
  if (text.trim()) {
    return text;
  }

  if (typeof data?.error?.message === "string" && data.error.message.trim()) {
    return data.error.message;
  }

  return "未返回可读文本";
}

function getErrorMessage(error: any) {
  const data = error?.response?.data;
  if (typeof data?.error?.message === "string" && data.error.message.trim()) {
    return data.error.message;
  }
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }
  return "请求失败";
}

export default function ChatPage() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const modelOptions = [
    {
      label: "OpenAI",
      options: [
        { value: "gpt-4o", label: "GPT-4o" },
        { value: "gpt-4o-2024-08-06", label: "GPT-4o (2024-08-06)" },
        { value: "gpt-4o-mini", label: "GPT-4o Mini" },
        { value: "o1", label: "o1" },
        { value: "o1-mini", label: "o1-mini" },
        { value: "gpt-4.1", label: "GPT-4.1" },
        { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
        { value: "gpt-5", label: "GPT-5" },
        { value: "gpt-5-mini", label: "GPT-5 Mini" },
        { value: "gpt-5.1", label: "GPT-5.1" },
        { value: "gpt-5.2", label: "GPT-5.2" },
        { value: "dall-e-3", label: "DALL-E 3" },
        { value: "tts-1", label: "TTS-1" },
        { value: "whisper-1", label: "Whisper-1" }
      ]
    },
    {
      label: "Anthropic",
      options: [
        { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (New)" },
        { value: "claude-sonnet-4-5-20250929", label: "Claude 4.5 Sonnet" },
        { value: "claude-opus-4-5-20251101", label: "Claude 4.5 Opus" },
        { value: "claude-haiku-4-5-20251001", label: "Claude 4.5 Haiku" }
      ]
    },
    {
      label: "Gemini",
      options: [
        { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
        { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
        { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
        { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
        { value: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview" }
      ]
    },
    {
      label: "Others",
      options: [
        { value: "deepseek-r1", label: "DeepSeek R1" },
        { value: "grok-3", label: "Grok 3" },
        { value: "grok-4", label: "Grok 4" }
      ]
    }
  ];

  const sendMessage = async () => {
    const trimmedKey = apiKey.trim();
    const trimmedInput = input.trim();
    if (!trimmedKey) {
      message.warning("请先输入 API Key");
      return;
    }
    if (!trimmedInput) return;

    const nextMessages = [...messages, { role: "user", content: trimmedInput }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post(
        "/openai/v1/responses",
        {
          model: model.trim() || "gpt-4o",
          messages: nextMessages, // Changed to standard messages format
          stream: false
        },
        {
          headers: {
            Authorization: `Bearer ${trimmedKey}`
          }
        }
      );
      // Fallback for custom backend that might still expect input field or return non-standard response
      // But trying to align with standard OpenAI format if possible
      
      const replyText = extractOutputText(res.data) || res.data?.choices?.[0]?.message?.content || "No response";
      setMessages((prev) => [...prev, { role: "assistant", content: replyText }]);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div>
      <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={4}>对话测试</Title>
        <Button onClick={clearChat} disabled={messages.length === 0 || loading}>
          清空对话
        </Button>
      </Space>

      <Card style={{ marginTop: 16 }}>
        <Form layout="vertical">
          <Form.Item label="API Key">
            <Input.Password
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="模型">
            <AutoComplete
              options={modelOptions}
              placeholder="选择或输入模型..."
              value={model}
              onChange={setModel}
              filterOption={(inputValue, option) => {
                if (!option?.value) return false;
                return option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1;
              }}
            />
          </Form.Item>
          <Text type="secondary">请求将发送到 /openai/v1/responses。</Text>
        </Form>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 220 }}>
          {messages.length === 0 ? (
            <Text type="secondary">输入消息开始对话。</Text>
          ) : (
            messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                style={{
                  alignSelf: item.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  background: item.role === "user" ? "#e6f4ff" : "#f6f6f6",
                  padding: "10px 12px",
                  borderRadius: 8,
                  whiteSpace: "pre-wrap"
                }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.role === "user" ? "你" : "助手"}
                </Text>
                <div>{item.content}</div>
              </div>
            ))
          )}
        </div>

        <TextArea
          style={{ marginTop: 16 }}
          autoSize={{ minRows: 2, maxRows: 6 }}
          placeholder="输入你的问题..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Space style={{ marginTop: 12 }}>
          <Button
            type="primary"
            onClick={sendMessage}
            loading={loading}
            disabled={!apiKey.trim() || !input.trim() || loading}
          >
            发送
          </Button>
        </Space>
      </Card>
    </div>
  );
}
