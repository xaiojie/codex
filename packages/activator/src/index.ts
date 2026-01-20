import inquirer from "inquirer";
import axios from "axios";
import fs from "fs";
import os from "os";
import path from "path";

const apiBaseUrl = process.env.CRS_API_BASE_URL || "http://localhost:8080";

async function main() {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "cardCode",
      message: "请输入卡密 (card code):",
      validate: (value: string) => (value ? true : "卡密不能为空")
    }
  ]);

  const response = await axios.post(`${apiBaseUrl}/api/activate`, {
    cardCode: answers.cardCode
  });

  const apiKey = response.data.apiKey as string;
  const configToml = `model_provider="crs"\nmodel="gpt-5.2-codex"\nmodel_reasoning_effort="high"\ndisable_response_storage=true\npreferred_auth_method="apikey"\n\n[model_providers.crs]\nname="crs"\nbase_url="http://localhost:8080/openai"\nwire_api="responses"\nrequires_openai_auth=true\nenv_key="CRS_OAI_KEY"\n`;

  const configDir = path.join(os.homedir(), ".codex");
  const configPath = path.join(configDir, "config.toml");
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configPath, configToml, "utf-8");

  console.log("激活成功! API Key 已生成 (仅此一次显示):");
  console.log(apiKey);
  console.log("\n已写入配置文件:", configPath);

  if (process.platform === "win32") {
    console.log(`\n请执行以下命令写入环境变量:\nsetx CRS_OAI_KEY \"${apiKey}\"`);
  } else {
    console.log(`\n请执行以下命令写入环境变量:\nexport CRS_OAI_KEY=\"${apiKey}\"`);
  }
}

main().catch((error) => {
  if (axios.isAxiosError(error)) {
    console.error("激活失败:", error.response?.data ?? error.message);
  } else {
    console.error("激活失败:", error);
  }
  process.exit(1);
});
