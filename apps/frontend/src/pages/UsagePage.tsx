import { useEffect, useMemo, useState } from "react";
import { Card, DatePicker, Table, Typography, Space, Tag } from "antd";
import dayjs from "dayjs";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "../api/client";

const { Title } = Typography;
const { RangePicker } = DatePicker;

type Summary = {
  user_id: string;
  calls: number;
  cost_used: number;
  daily_limit: number | null;
  total_limit: number | null;
  expires_at: string | null;
};

type LogsResponse = {
  total: number;
  page: number;
  pageSize: number;
  rows: Array<{
    id: string;
    tool?: string | null;
    channel?: string | null;
    model: string;
    created_at: string;
    conversation_length: number;
    input_tokens: number;
    output_tokens: number;
    cache_tokens: number;
    cost: number;
    cumulative_cost: number;
  }>;
};

export default function UsagePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [logs, setLogs] = useState<LogsResponse | null>(null);
  const [timeseries, setTimeseries] = useState<Record<string, Record<string, number>>>({});
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(6, "day"),
    dayjs()
  ]);
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    const from = range[0].format("YYYY-MM-DD");
    const to = range[1].format("YYYY-MM-DD");
    const [summaryRes, seriesRes, logsRes] = await Promise.all([
      api.get<Summary>("/api/codexusage/summary", { params: { from, to } }),
      api.get<Record<string, Record<string, number>>>("/api/codexusage/timeseries", {
        params: { from, to }
      }),
      api.get<LogsResponse>("/api/codexusage/logs", {
        params: { from, to, page, pageSize: 10 }
      })
    ]);
    setSummary(summaryRes.data);
    setTimeseries(seriesRes.data);
    setLogs(logsRes.data);
  };

  useEffect(() => {
    fetchData();
  }, [range, page]);

  const chartData = useMemo(() => {
    const dates = new Set<string>();
    Object.values(timeseries).forEach((series) => {
      Object.keys(series).forEach((date) => dates.add(date));
    });
    const sortedDates = Array.from(dates).sort();
    return sortedDates.map((date) => {
      const row: Record<string, number | string> = { date };
      Object.entries(timeseries).forEach(([model, series]) => {
        row[model] = series[date] ?? 0;
      });
      return row;
    });
  }, [timeseries]);

  const models = Object.keys(timeseries);

  return (
    <div>
      <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={4}>使用统计</Title>
        <RangePicker value={range} onChange={(values) => values && setRange(values as any)} />
      </Space>

      <div className="card-grid" style={{ marginTop: 16 }}>
        <Card>
          <div>调用次数</div>
          <Title level={3}>{summary?.calls ?? 0}</Title>
        </Card>
        <Card>
          <div>已用金额 (USD)</div>
          <Title level={3}>{summary?.cost_used.toFixed(4) ?? "0.0000"}</Title>
        </Card>
        <Card>
          <div>日额度</div>
          <Title level={3}>{summary?.daily_limit ?? "-"}</Title>
        </Card>
        <Card>
          <div>总额度</div>
          <Title level={3}>{summary?.total_limit ?? "-"}</Title>
        </Card>
        <Card>
          <div>到期时间</div>
          <Title level={3}>{summary?.expires_at ? dayjs(summary.expires_at).format("YYYY-MM-DD") : "-"}</Title>
        </Card>
      </div>

      <Card className="chart-card">
        <Title level={5}>模型用量趋势（按天成本）</Title>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {models.map((model, index) => (
              <Line
                key={model}
                type="monotone"
                dataKey={model}
                stroke={["#1677ff", "#13c2c2", "#722ed1"][index % 3]}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Title level={5}>使用明细</Title>
        <Table
          rowKey="id"
          dataSource={logs?.rows ?? []}
          pagination={{
            total: logs?.total ?? 0,
            current: page,
            pageSize: logs?.pageSize ?? 10,
            onChange: (p) => setPage(p)
          }}
          columns={[
            { title: "Tool", dataIndex: "tool", render: (value) => value ?? "-" },
            { title: "渠道", dataIndex: "channel", render: (value) => value ?? "-" },
            { title: "模型", dataIndex: "model" },
            {
              title: "时间",
              dataIndex: "created_at",
              render: (value) => dayjs(value).format("YYYY-MM-DD HH:mm")
            },
            { title: "对话长度", dataIndex: "conversation_length" },
            { title: "输入", dataIndex: "input_tokens" },
            { title: "输出", dataIndex: "output_tokens" },
            { title: "缓存", dataIndex: "cache_tokens" },
            {
              title: "费用",
              dataIndex: "cost",
              render: (value) => <Tag color="blue">${value.toFixed(4)}</Tag>
            },
            {
              title: "累计消费",
              dataIndex: "cumulative_cost",
              render: (value) => <Tag color="purple">${value.toFixed(4)}</Tag>
            }
          ]}
        />
      </Card>
    </div>
  );
}
