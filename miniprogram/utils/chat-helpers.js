// utils/chat-helpers.js - 聊天工具函数

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function formatTime(timestamp) {
  const d = new Date(timestamp)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${h}:${m}`
}

function arrayBufferToString(buffer) {
  const uint8 = new Uint8Array(buffer)
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(uint8)
  }
  let str = ''
  for (let i = 0; i < uint8.length; i++) str += String.fromCharCode(uint8[i])
  try { return decodeURIComponent(escape(str)) } catch (e) { return str }
}

module.exports = { generateUUID, formatTime, arrayBufferToString }
