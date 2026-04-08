// utils/chat-config.js - 聊天功能配置
module.exports = {
  // DeepSeek AI
  API_URL: 'https://api.deepseek.com/chat/completions',
  API_KEY: 'sk-cea233d8fefd49c38f9585a9108f132a',
  MODEL: 'deepseek-chat',
  SYSTEM_PROMPT: '你是一个温暖贴心的AI助手，名叫「暖心AI」。你的语气温柔、真诚、有力量。你善于倾听，给人鼓励和安慰。回复简洁而温暖，每次回复控制在100字以内。适当使用温暖的表达，但不要过于夸张。',

  // 智谱 AI 文件解析
  ZHIPU_PARSER_URL: 'https://open.bigmodel.cn/api/paas/v4/files/parser/create',
  ZHIPU_RESULT_URL: 'https://open.bigmodel.cn/api/paas/v4/files/parser/result',
  ZHIPU_API_KEY: '44177b5247b14689a112c2f66589ccba.LL0GMfQVtnNWdl4L',

  // 本地存储 Key
  STORAGE_KEY: 'chat_messages',
  CONVERSATION_KEY: 'conversation_id',
  CONV_LIST_KEY: 'conversation_list'
}
