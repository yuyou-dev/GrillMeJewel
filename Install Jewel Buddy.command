#!/bin/zsh
set -u

repo_root="$(cd -- "$(dirname -- "$0")" && pwd)"
cd "$repo_root" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "找不到 Node.js。Jewel Buddy 需要 Node.js 20 或更高版本。"
  echo "按任意键关闭窗口。"
  read -r -k 1
  exit 1
fi

node scripts/workbuddy-connector.mjs install
status=$?
echo
if [ "$status" -eq 0 ]; then
  echo "安装完成。请按上方步骤前往 WorkBuddy → 连接器 → 自定义连接，信任脚本并开启 jewel-buddy。"
  echo "不要在旧消息中重试，也不要回退到原生对话卡片。"
else
  echo "安装失败。请保留上方原始错误。"
fi
echo "按任意键关闭窗口。"
read -r -k 1
exit "$status"
