# ⚡️ Railgun Workers

Railgun 是一套基于 Cloudflare Workers 的轻量级代理服务脚本集合，适用于快速部署代理服务。本项目根据不同功能模块拆分了多个版本的 `workers.js` 文件，便于用户根据实际需求选择对应的部署脚本。

---

## 📋 版本概述

| 文件名 | 特点说明 | 最新 |
|-------------------|------------------------------------|----|
| `workers.nano.js` | 加入了使用量接口与子路径代理请求      |✅|
| `workers.lite.js` | 支持通过 `/proxyip=` 使用地区代码    |❌|
| `workers.core.js` | 仅保留 `/proxyip://` 类型代理支持    |❌|
| `workers.sync.js` | 支持 `/sync` 端口远程管理 UUID       |❌|
| `workers.kv.js`   | 支持 KV 数据库方式配置多 UUID        |❌|
| `workers.js`      | 基础代理功能，支持多种代理配置方式    |❌|

---

## 📄 各版本详细说明

### workers.nano.js

**简介**：在 `workers.lite.js` 基础上增加通过 `/reprequests` 路径获取 Cloudflare Workers AND Pages Functions 调用次数。移除了URL环境变量，仅保留URL302环境变量。加入 `/proxy/` 路径来代理请求指定地址，可用于加速下载文件。

**可用参数**：
- `URL302`（可选）：自定义 302 跳转目标地址
- `APIKEY`（可选）：Sync API 访问密钥
- `ProxyIPGroup`（可选）：ProxyIP分组数据文件夹源
- `AccountID`（可选）：Cloudflare 的 AccountID
- `APIToken`（可选）：Cloudflare 的 APIToken

**支持的代理配置方式**：
```
/proxyip://proxyip.cmliussss.net
/proxyip=CN
```

**参数说明**
- `URL302` 参数如果指定，则访问根路径时会做302跳转到指定网址。如果不指定则访问根路径显示仿NGINX默认页。
- `/reprequests` 路径获取 Cloudflare Workers AND Pages Functions 调用次数，依赖于 `AccountID` 与 `APIToken` 的值作为访问 Cloudflare GraphQL API 凭据。
- 如需需要通过 `/proxyip=` 方式使用指定地区代码来获取随机 ProxyIP 的话，必须设置 `ProxyIPGroup` 环境变量。（可使用我的 [railgun-ipsync/proxyip/data](https://github.com/lingyuanzhicheng/railgun-ipsync/tree/main/proxyip/data) 仓库作为远程 ProxyIP 文件夹： `https://raw.githubusercontent.com/lingyuanzhicheng/railgun-ipsync/refs/heads/main/proxyip/data` ）
- 如需使用 Sync API 来远程管理 UUID 信息，必须设置 `APIKEY` 作为API的访问密钥。

---

### workers.lite.js

**简介**：在 `workers.core.js` 基础上增加通过 `/proxyip=` 方式使用地区代码设置代理的支持。

**可用参数**：
- `URL302`（可选）：自定义 302 跳转目标地址
- `URL`（可选）：自定义反代目标地址
- `APIKEY`（可选）：Sync API 访问密钥
- `ProxyIPGroup`（可选）：ProxyIP分组数据文件夹源

**支持的代理配置方式**：
```
/proxyip://proxyip.cmliussss.net
/proxyip=CN
```

**参数说明**
- `URL302` 参数如果指定，则访问根路径时会做302跳转到指定网址。如果不指定则检查是否设定 `URL` 参数。如果设定了 `URL` 参数，则将 `URL` 参数设定的网址作为根路径反代。如果 `URL` 参数也没设定，则访问根路径显示仿NGINX默认页。
- 如需需要通过 `/proxyip=` 方式使用指定地区代码来获取随机 ProxyIP 的话，必须设置 `ProxyIPGroup` 环境变量。（可使用我的 [railgun-ipsync/proxyip/data](https://github.com/lingyuanzhicheng/railgun-ipsync/tree/main/proxyip/data) 仓库作为远程 ProxyIP 文件夹： `https://raw.githubusercontent.com/lingyuanzhicheng/railgun-ipsync/refs/heads/main/proxyip/data` ）
- 如需使用 Sync API 来远程管理 UUID 信息，必须设置 `APIKEY` 作为API的访问密钥。

---

### workers.core.js

**简介**：在 `workers.sync.js` 基础上移除 http 与 socks5 相关部分的代码，仅保留 proxyip 类型代理支持，简化结构。

**可用参数**：
- `URL302`（可选）：自定义 302 跳转目标地址
- `URL`（可选）：自定义反代目标地址
- `APIKEY`（可选）：Sync API 访问密钥

**支持的代理配置方式**：
```
/proxyip://proxyip.cmliussss.net
```

**参数说明**
- `URL302` 参数如果指定，则访问根路径时会做302跳转到指定网址。如果不指定则检查是否设定 `URL` 参数。如果设定了 `URL` 参数，则将 `URL` 参数设定的网址作为根路径反代。如果 `URL` 参数也没设定，则访问根路径显示仿NGINX默认页。
- 如需使用 Sync API 来远程管理 UUID 信息，必须设置 `APIKEY` 作为API的访问密钥。

---

### workers.sync.js

**简介**：在 `workers.kv.js` 基础上增加 `/sync` 端点，支持远程同步管理 UUID。

**可用参数**：
- `URL302`（可选）：自定义 302 跳转目标地址
- `URL`（可选）：自定义反代目标地址
- `APIKEY`（可选）：API 访问密钥

**支持的代理配置方式**：
```
/proxyip=proxyip.cmliussss.net
/proxyip://proxyip.cmliussss.net
proxyip.cmliussss.net
/socks5://user:password@127.0.0.1:1080
/http://user:password@127.0.0.1:8080
```

**参数说明**
- `URL302` 参数如果指定，则访问根路径时会做302跳转到指定网址。如果不指定则检查是否设定 `URL` 参数。如果设定了 `URL` 参数，则将 `URL` 参数设定的网址作为根路径反代。如果 `URL` 参数也没设定，则访问根路径显示仿NGINX默认页。
- 如需使用 Sync API 来远程管理 UUID 信息，必须设置 `APIKEY` 作为API的访问密钥。

---

### workers.kv.js

**简介**：在 `workers.js` 基础上增加 KV 数据库存储支持，可持久化配置项。

**可用参数**：
- `URL302`（可选）：自定义 302 跳转目标地址
- `URL`（可选）：自定义反代目标地址

**支持的代理配置方式**：
```
/proxyip=proxyip.cmliussss.net
/proxyip://proxyip.cmliussss.net
proxyip.cmliussss.net
/socks5://user:password@127.0.0.1:1080
/http://user:password@127.0.0.1:8080
```

---

### workers.js

**简介**：最基础的版本，移除了大量附件功能代码，保留核心代理逻辑。

**可用参数**：
- `UUID`（必须）：用于认证的 UUID
- `URL302`（可选）：自定义 302 跳转目标地址
- `URL`（可选）：自定义反代目标地址

**支持的代理配置方式**：
```
/proxyip=proxyip.cmliussss.net
/proxyip://proxyip.cmliussss.net
proxyip.cmliussss.net
/socks5://user:password@127.0.0.1:1080
/http://user:password@127.0.0.1:8080
```

---

## 📦 KV 数据库绑定

> 仅适用于 `workers.kv.js` 及以上版本。

1. 登录到 [Cloudflare Dashboard](https://dash.cloudflare.com)。
2. 创建一个新的 KV 命名空间：
   - 导航至 **Workers & Pages > KV**。
   - 点击 "Create a namespace" 并填写名称（如 `railgun`）。
3. 在你的 Worker 中添加绑定：
   - 打开 Worker 设置页，点击 "**Settings**" > "**Variables**"。
   - 添加一个变量绑定：
     - **Variable name**: `AUTH_KV`
     - **KV namespace**: 选择刚创建的命名空间。
4. 保存并重新部署 Worker。

---

## 🔄 `/sync` 接口使用

> 仅适用于 `workers.sync.js` 及以上版本。

### 请求头
```http
Authorization: Bearer <your-secret-key>
Content-Type: application/json
```

### 接口列表

#### 1. 列出所有 UUID
```bash
curl -X POST https://example.workers.dev/sync \
  -H "Authorization: Bearer mySecretKey123" \
  -H "Content-Type: application/json" \
  -d '{"action": "list"}'
```

#### 2. 获取单个 UUID 数据
```bash
curl -X POST https://example.workers.dev/sync \
  -H "Authorization: Bearer mySecretKey123" \
  -H "Content-Type: application/json" \
  -d '{"action": "get", "uuid": "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8"}'
```

#### 3. 新增或更新一个 UUID 条目
```bash
curl -X POST https://example.workers.dev/sync \
  -H "Authorization: Bearer mySecretKey123" \
  -H "Content-Type: application/json" \
  -d '{"action": "put", "uuid": "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8", "value": "true"}'
```

#### 4. 删除指定 UUID
```bash
curl -X POST https://example.workers.dev/sync \
  -H "Authorization: Bearer mySecretKey123" \
  -H "Content-Type: application/json" \
  -d '{"action": "delete", "uuid": "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8"}'
```

#### 5. 全量同步 UUID 数据
```bash
curl -X POST https://example.workers.dev/sync \
  -H "Authorization: Bearer mySecretKey123" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sync",
    "data": [
      {"uuid": "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8", "statu": true},
      {"uuid": "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n9", "statu": false}
    ]
  }'
```

---

## 📜 说明汇总

- 对于非强制性的参数，我都备注的可选。只要影响到使用的才写的必须。
- 如果 `URL302` 设置了则访问绑定域名根路径的时候会302跳转到设置的地址。
- 如果 `URL` 设置了访问绑定域名根路径的时候会看到类似反代目标地址的页面。
- 绑定域名根路径访问判定顺序：`URL302` -> `URL` -> 伪装的NGINX默认页。
- `URL302` 与 `URL` 参数设置一个即可，都不设置则采用伪装的NGINX默认页。
- `ProxyIPGroup` 目标地址需要参考 [railgun-ipsync/proxyip/data](https://github.com/lingyuanzhicheng/railgun-ipsync/tree/main/proxyip/data) 中文件夹内的文件结构自托管。
- `ProxyIPGroup` 参数可设置 `https://raw.githubusercontent.com/lingyuanzhicheng/railgun-ipsync/refs/heads/main/proxyip/data` 为远程文件夹目标源。
- `ProxyIPGroup` 的 ProxyIP 机制是根据用户通过 `/proxyip=` 传入的地区代码，请求 `ProxyIPGroup` 参数设置的远程文件夹目标源里的地区代号json文件。将对应的地区代号json文件里的 ProxyIP 随机获取一个使用。
- 使用 Cloudflare Workers 的代理在访问非 Cloudflare CDN 下的网站时，其出口是用户连接的 Cloudflare 的服务器地区。由于 Cloudflare 的机制，无法访问 Cloudflare CDN 下的网站，故此需要 ProxyIP 来中转。所以在访问 Cloudflare CDN 下的网站时，出口是 ProxyIP 的地区。
- ProxyIP 的参数授予逻辑是先根据访问的目标 Cloudflare 服务器的 `colo` 从 `*.proxyip.cmliussss.net` 中获取。然后检查是不是 `/proxyip://` 方式指定了目标服务器，再检查是不是 `/proxyip=` 方式指定的目标地区。即先是设置为 `*.proxyip.cmliussss.net` 了。后续被检查 ProxyIP
 的传入进行覆盖。如果想要使用内置的 `*.proxyip.cmliussss.net` 方式，则不设置 path 值，即不传入 ProxyIP 值。使用`*.proxyip.cmliussss.net` 方式的话，访问的不论是不是 Cloudflare CDN 下的网站都是当前用户连接的 Cloudflare 的服务器所在地区出口。
 - `/reprequests` 路径获取 Cloudflare Workers AND Pages Functions 调用次数，依赖于 `AccountID` 与 `APIToken` 的值作为访问 Cloudflare GraphQL API 凭据。
 
---

## 🙏 鸣谢

- [cmliu/edgetunnel](https://github.com/cmliu/edgetunnel)
- [xiyosenstore/Emilia](https://github.com/xiyosenstore/Emilia)