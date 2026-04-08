// utils/zhipu-auth.js - 智谱AI JWT鉴权 (纯JS HMAC-SHA256)

const SHA256_K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
])

function ror(n, d) {
  return ((n >>> d) | (n << (32 - d))) >>> 0
}

function strToBytes(s) {
  const arr = []
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i)
    if (c < 0x80) {
      arr.push(c)
    } else if (c < 0x800) {
      arr.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
    } else {
      arr.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
    }
  }
  return new Uint8Array(arr)
}

function sha256(bytes) {
  if (typeof bytes === 'string') bytes = strToBytes(bytes)
  if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes)

  const msgLen = bytes.length
  const bitLen = msgLen * 8
  const paddingLen = ((56 - (msgLen + 1) % 64) + 64) % 64
  const padded = new Uint8Array(msgLen + 1 + paddingLen + 8)
  padded.set(bytes)
  padded[msgLen] = 0x80
  const dv = new DataView(padded.buffer)
  dv.setUint32(padded.length - 4, bitLen, false)

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19
  const w = new Uint32Array(64)

  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false)
    for (let i = 16; i < 64; i++) {
      const s0 = ror(w[i-15], 7) ^ ror(w[i-15], 18) ^ (w[i-15] >>> 3)
      const s1 = ror(w[i-2], 17) ^ ror(w[i-2], 19) ^ (w[i-2] >>> 10)
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0
    }
    let a=h0, b=h1, c=h2, d=h3, e=h4, f=h5, g=h6, h=h7
    for (let i = 0; i < 64; i++) {
      const S1 = ror(e,6) ^ ror(e,11) ^ ror(e,25)
      const ch = (e & f) ^ ((~e) & g)
      const t1 = (h + S1 + ch + SHA256_K[i] + w[i]) | 0
      const S0 = ror(a,2) ^ ror(a,13) ^ ror(a,22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) | 0
      h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0
    }
    h0=(h0+a)|0; h1=(h1+b)|0; h2=(h2+c)|0; h3=(h3+d)|0
    h4=(h4+e)|0; h5=(h5+f)|0; h6=(h6+g)|0; h7=(h7+h)|0
  }

  const result = new Uint8Array(32)
  const rv = new DataView(result.buffer)
  rv.setUint32(0,h0,false); rv.setUint32(4,h1,false)
  rv.setUint32(8,h2,false); rv.setUint32(12,h3,false)
  rv.setUint32(16,h4,false); rv.setUint32(20,h5,false)
  rv.setUint32(24,h6,false); rv.setUint32(28,h7,false)
  return result
}

function hmacSha256(key, msg) {
  if (typeof key === 'string') key = strToBytes(key)
  if (typeof msg === 'string') msg = strToBytes(msg)
  if (key.length > 64) key = sha256(key)

  const paddedKey = new Uint8Array(64)
  paddedKey.set(key)

  const ipad = new Uint8Array(64 + msg.length)
  const opad = new Uint8Array(64 + 32)

  for (let i = 0; i < 64; i++) {
    ipad[i] = paddedKey[i] ^ 0x36
    opad[i] = paddedKey[i] ^ 0x5c
  }
  ipad.set(msg, 64)

  const innerHash = sha256(ipad)
  opad.set(innerHash, 64)
  return sha256(opad)
}

function base64url(buf) {
  if (buf instanceof Uint8Array) buf = buf.buffer
  return wx.arrayBufferToBase64(buf)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * 生成智谱AI JWT Token
 * @param {string} apiKey - 格式: {id}.{secret}
 * @returns {string} JWT token
 */
function generateToken(apiKey) {
  const dotIdx = apiKey.indexOf('.')
  const id = apiKey.substring(0, dotIdx)
  const secret = apiKey.substring(dotIdx + 1)
  const now = Math.floor(Date.now() / 1000)

  const headerStr = JSON.stringify({ alg: 'HS256', sign_type: 'SIGN' })
  const payloadStr = JSON.stringify({ api_key: id, exp: now + 1800, timestamp: now })

  const header = base64url(strToBytes(headerStr))
  const payload = base64url(strToBytes(payloadStr))
  const sig = hmacSha256(secret, header + '.' + payload)

  return header + '.' + payload + '.' + base64url(sig)
}

module.exports = { generateToken }
