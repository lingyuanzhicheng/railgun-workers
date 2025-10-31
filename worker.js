import { connect } from 'cloudflare:sockets';

let userID = '';
let proxyIP = '';
let socks5Address = '';
let enableSocks = false;
let enableHttp = false;
let proxyIPs;
let socks5s;
let go2Socks5s = [
    '*tapecontent.net',
    '*cloudatacdn.com',
    '*.loadshare.org',
];
let httpsPorts = ["2053", "2083", "2087", "2096", "8443"];
let userIDLow;
let banHosts = [atob('c3BlZWQuY2xvdWRmbGFyZS5jb20=')];

export default {
    async fetch(request, env) {
        try {
            userID = env.UUID || env.uuid || env.PASSWORD || env.pswd || userID;

            proxyIP = env.PROXYIP || env.proxyip || proxyIP;
            proxyIPs = await 整理(proxyIP);
            proxyIP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];
            proxyIP = proxyIP ? proxyIP.toLowerCase() : request.cf.colo + '.PrOXYip.CMLiussss.NeT';
            socks5Address = env.HTTP || env.SOCKS5 || socks5Address;
            socks5s = await 整理(socks5Address);
            socks5Address = socks5s[Math.floor(Math.random() * socks5s.length)];
            enableHttp = env.HTTP ? true : socks5Address.toLowerCase().includes('http://');
            socks5Address = socks5Address.split('//')[1] || socks5Address;
            if (env.GO2SOCKS5) go2Socks5s = await 整理(env.GO2SOCKS5);
            if (env.CFPORTS) httpsPorts = await 整理(env.CFPORTS);
            if (env.BAN) banHosts = await 整理(env.BAN);

            const upgradeHeader = request.headers.get('Upgrade');
            const url = new URL(request.url);
            if (!upgradeHeader || upgradeHeader !== 'websocket') {

                const 路径 = url.pathname.toLowerCase();

                if (env.URL302) {  
                    return Response.redirect(env.URL302, 302);  
                } else if (env.URL) {  
                    return await 代理URL(env.URL, url);  
                } else if (路径 == '/') {  
                    return new Response(await nginx(), {  
                        status: 200,  
                        headers: {  
                            'Content-Type': 'text/html; charset=UTF-8',  
                        },  
                    });  
                }
                
            } else {
                socks5Address = url.searchParams.get('socks5') || url.searchParams.get('http') || socks5Address;
                enableHttp = url.searchParams.get('http') ? true : enableHttp;
                go2Socks5s = url.searchParams.has('globalproxy') ? ['all in'] : go2Socks5s;

                if (url.pathname.toLowerCase().includes('/socks5://') || url.pathname.toLowerCase().includes('/http://')) {  
                    enableHttp = url.pathname.includes('http://');  
                    socks5Address = url.pathname.split('://')[1].split('#')[0];  
                    if (socks5Address.includes('@')) {  
                        const lastAtIndex = socks5Address.lastIndexOf('@');  
                        let userPassword = socks5Address.substring(0, lastAtIndex).replaceAll('%3D', '=');  
                        const base64Regex = /^(?:[A-Z0-9+/]{4})*(?:[A-Z0-9+/]{2}==|[A-Z0-9+/]{3}=)?$/i;  
                        if (base64Regex.test(userPassword) && !userPassword.includes(':')) userPassword = atob(userPassword);  
                        socks5Address = `${userPassword}@${socks5Address.substring(lastAtIndex + 1)}`;  
                    }  
                    go2Socks5s = ['all in']; // 开启全局SOCKS5  
                }

                if (socks5Address) {
                    try {
                        socks5AddressParser(socks5Address);
                        enableSocks = true;
                    } catch (err) {
                        let e = err;
                        console.log(e.toString());
                        enableSocks = false;
                    }
                } else {
                    enableSocks = false;
                }

                if (url.searchParams.has('proxyip')) {
                    proxyIP = url.searchParams.get('proxyip');
                    enableSocks = false;
                } else if (new RegExp('/proxyip=', 'i').test(url.pathname)) {
                    proxyIP = url.pathname.toLowerCase().split('/proxyip=')[1];
                    enableSocks = false;
                } else if (new RegExp('/proxyip.', 'i').test(url.pathname)) {
                    proxyIP = `proxyip.${url.pathname.toLowerCase().split("/proxyip.")[1]}`;
                    enableSocks = false;
                } else if (new RegExp('/proxyip://', 'i').test(url.pathname)) {
                    proxyIP = url.pathname.toLowerCase().split('/proxyip://')[1];
                    enableSocks = false;
                }

                return handleWebSocket(request);
            }
        } catch (err) {
            let e = err;
            return new Response(e.toString());
        }
    },
};

async function socks5AddressParser(address) {
    // 使用 "@" 分割地址，分为认证部分和服务器地址部分
    const lastAtIndex = address.lastIndexOf("@");
    let [latter, former] = lastAtIndex === -1 ? [address, undefined] : [address.substring(lastAtIndex + 1), address.substring(0, lastAtIndex)];
    let username, password, hostname, port;

    // 如果存在 former 部分，说明提供了认证信息
    if (former) {
        const formers = former.split(":");
        if (formers.length !== 2) {
            throw new Error('无效的 SOCKS 地址格式：认证部分必须是 "username:password" 的形式');
        }
        [username, password] = formers;
    }

    // 解析服务器地址部分
    const latters = latter.split(":");
    // 检查是否是IPv6地址带端口格式 [xxx]:port
    if (latters.length > 2 && latter.includes("]:")) {
        // IPv6地址带端口格式：[2001:db8::1]:8080
        port = Number(latter.split("]:")[1].replace(/[^\d]/g, ''));
        hostname = latter.split("]:")[0] + "]"; // 正确提取hostname部分
    } else if (latters.length === 2) {
        // IPv4地址带端口或域名带端口
        port = Number(latters.pop().replace(/[^\d]/g, ''));
        hostname = latters.join(":");
    } else {
        port = 80;
        hostname = latter;
    }

    if (isNaN(port)) {
        throw new Error('无效的 SOCKS 地址格式：端口号必须是数字');
    }

    // 处理 IPv6 地址的特殊情况
    // IPv6 地址包含多个冒号，所以必须用方括号括起来，如 [2001:db8::1]
    const regex = /^\[.*\]$/;
    if (hostname.includes(":") && !regex.test(hostname)) {
        throw new Error('无效的 SOCKS 地址格式：IPv6 地址必须用方括号括起来，如 [2001:db8::1]');
    }

    //if (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(hostname)) hostname = `${atob('d3d3Lg==')}${hostname}${atob('LmlwLjA5MDIyNy54eXo=')}`;
    // 返回解析后的结果
    return {
        username,  // 用户名，如果没有则为 undefined
        password,  // 密码，如果没有则为 undefined
        hostname,  // 主机名，可以是域名、IPv4 或 IPv6 地址
        port,	 // 端口号，已转换为数字类型
    }
}

async function 代理URL(代理网址, 目标网址) {
    const 网址列表 = await 整理(代理网址);
    const 完整网址 = 网址列表[Math.floor(Math.random() * 网址列表.length)];

    // 解析目标 URL
    let 解析后的网址 = new URL(完整网址);
    console.log(解析后的网址);
    // 提取并可能修改 URL 组件
    let 协议 = 解析后的网址.protocol.slice(0, -1) || 'https';
    let 主机名 = 解析后的网址.hostname;
    let 路径名 = 解析后的网址.pathname;
    let 查询参数 = 解析后的网址.search;

    // 处理路径名
    if (路径名.charAt(路径名.length - 1) == '/') {
        路径名 = 路径名.slice(0, -1);
    }
    路径名 += 目标网址.pathname;

    // 构建新的 URL
    let 新网址 = `${协议}://${主机名}${路径名}${查询参数}`;

    // 反向代理请求
    let 响应 = await fetch(新网址);

    // 创建新的响应
    let 新响应 = new Response(响应.body, {
        status: 响应.status,
        statusText: 响应.statusText,
        headers: 响应.headers
    });

    // 添加自定义头部，包含 URL 信息
    //新响应.headers.set('X-Proxied-By', 'Cloudflare Worker');
    //新响应.headers.set('X-Original-URL', 完整网址);
    新响应.headers.set('X-New-URL', 新网址);

    return 新响应;
}

async function 整理(内容) {
    // 将制表符、双引号、单引号和换行符都替换为逗号
    // 然后将连续的多个逗号替换为单个逗号
    var 替换后的内容 = 内容.replace(/[	"'\r\n]+/g, ',').replace(/,+/g, ',');

    // 删除开头和结尾的逗号（如果有的话）
    if (替换后的内容.charAt(0) == ',') 替换后的内容 = 替换后的内容.slice(1);
    if (替换后的内容.charAt(替换后的内容.length - 1) == ',') 替换后的内容 = 替换后的内容.slice(0, 替换后的内容.length - 1);

    // 使用逗号分割字符串，得到地址数组
    const 地址数组 = 替换后的内容.split(',');

    return 地址数组;
}

async function nginx() {
    const text = `
	<!DOCTYPE html>
	<html>
	<head>
	<title>Welcome to nginx!</title>
	<style>
		body {
			width: 35em;
			margin: 0 auto;
			font-family: Tahoma, Verdana, Arial, sans-serif;
		}
	</style>
	</head>
	<body>
	<h1>Welcome to nginx!</h1>
	<p>If you see this page, the nginx web server is successfully installed and
	working. Further configuration is required.</p>
	
	<p>For online documentation and support please refer to
	<a href="http://nginx.org/">nginx.org</a>.<br/>
	Commercial support is available at
	<a href="http://nginx.com/">nginx.com</a>.</p>
	
	<p><em>Thank you for using nginx.</em></p>
	</body>
	</html>
	`
    return text;
}

////////////////////////////////////////////////socks5/http函数/////////////////////////////////////////////////////
async function socks5Connect(targetHost, targetPort) {
    const parsedSocks5Address = await socks5AddressParser(socks5Address);
    const { username, password, hostname, port } = parsedSocks5Address;
    const sock = connect({
        hostname: hostname,
        port: port
    });
    await sock.opened;
    const w = sock.writable.getWriter();
    const r = sock.readable.getReader();
    await w.write(new Uint8Array([5, 2, 0, 2]));
    const auth = (await r.read()).value;
    if (auth[1] === 2 && username) {
        const user = new TextEncoder().encode(username);
        const pass = new TextEncoder().encode(password);
        await w.write(new Uint8Array([1, user.length, ...user, pass.length, ...pass]));
        await r.read();
    }
    const domain = new TextEncoder().encode(targetHost);
    await w.write(new Uint8Array([5, 1, 0, 3, domain.length, ...domain,
        targetPort >> 8, targetPort & 0xff
    ]));
    await r.read();
    w.releaseLock();
    r.releaseLock();
    return sock;
}

async function httpConnect(addressRemote, portRemote) {
    const parsedSocks5Address = await socks5AddressParser(socks5Address);
    const { username, password, hostname, port } = parsedSocks5Address;
    const sock = await connect({
        hostname: hostname,
        port: port
    });

    // 构建HTTP CONNECT请求
    let connectRequest = `CONNECT ${addressRemote}:${portRemote} HTTP/1.1\r\n`;
    connectRequest += `Host: ${addressRemote}:${portRemote}\r\n`;

    // 添加代理认证（如果需要）
    if (username && password) {
        const authString = `${username}:${password}`;
        const base64Auth = btoa(authString);
        connectRequest += `Proxy-Authorization: Basic ${base64Auth}\r\n`;
    }

    connectRequest += `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n`;
    connectRequest += `Proxy-Connection: Keep-Alive\r\n`;
    connectRequest += `Connection: Keep-Alive\r\n`; // 添加标准 Connection 头
    connectRequest += `\r\n`;

    try {
        // 发送连接请求
        const writer = sock.writable.getWriter();
        await writer.write(new TextEncoder().encode(connectRequest));
        writer.releaseLock();
    } catch (err) {
        console.error('发送HTTP CONNECT请求失败:', err);
        throw new Error(`发送HTTP CONNECT请求失败: ${err.message}`);
    }

    // 读取HTTP响应
    const reader = sock.readable.getReader();
    let respText = '';
    let connected = false;
    let responseBuffer = new Uint8Array(0);

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                console.error('HTTP代理连接中断');
                throw new Error('HTTP代理连接中断');
            }

            // 合并接收到的数据
            const newBuffer = new Uint8Array(responseBuffer.length + value.length);
            newBuffer.set(responseBuffer);
            newBuffer.set(value, responseBuffer.length);
            responseBuffer = newBuffer;

            // 将收到的数据转换为文本
            respText = new TextDecoder().decode(responseBuffer);

            // 检查是否收到完整的HTTP响应头
            if (respText.includes('\r\n\r\n')) {
                // 分离HTTP头和可能的数据部分
                const headersEndPos = respText.indexOf('\r\n\r\n') + 4;
                const headers = respText.substring(0, headersEndPos);

                // 检查响应状态
                if (headers.startsWith('HTTP/1.1 200') || headers.startsWith('HTTP/1.0 200')) {
                    connected = true;

                    // 如果响应头之后还有数据，我们需要保存这些数据以便后续处理
                    if (headersEndPos < responseBuffer.length) {
                        const remainingData = responseBuffer.slice(headersEndPos);
                        // 创建一个缓冲区来存储这些数据，以便稍后使用
                        const dataStream = new ReadableStream({
                            start(controller) {
                                controller.enqueue(remainingData);
                            }
                        });

                        // 创建一个新的TransformStream来处理额外数据
                        const { readable, writable } = new TransformStream();
                        dataStream.pipeTo(writable).catch(err => console.error('处理剩余数据错误:', err));

                        // 替换原始readable流
                        // @ts-ignore
                        sock.readable = readable;
                    }
                } else {
                    const errorMsg = `HTTP代理连接失败: ${headers.split('\r\n')[0]}`;
                    console.error(errorMsg);
                    throw new Error(errorMsg);
                }
                break;
            }
        }
    } catch (err) {
        reader.releaseLock();
        throw new Error(`处理HTTP代理响应失败: ${err.message}`);
    }

    reader.releaseLock();

    if (!connected) {
        throw new Error('HTTP代理连接失败: 未收到成功响应');
    }

    return sock;
}

//////////////////////////////////////////////////////////////////////ws处理函数/////////////////////////////////////////////////////
async function handleWebSocket(request) {
    const [client, ws] = Object.values(new WebSocketPair());
    ws.accept();

    let remote = null,
        udpWriter = null,
        isDNS = false;

    new ReadableStream({
        start(ctrl) {
            ws.addEventListener('message', e => ctrl.enqueue(e.data));
            ws.addEventListener('close', () => {
                remote?.close();
                ctrl.close();
            });
            ws.addEventListener('error', () => {
                remote?.close();
                ctrl.error();
            });

            const early = request.headers.get('sec-websocket-protocol');
            if (early) {
                try {
                    ctrl.enqueue(Uint8Array.from(atob(early.replace(/-/g, '+').replace(/_/g, '/')),
                        c => c.charCodeAt(0)).buffer);
                } catch { }
            }
        }
    }).pipeTo(new WritableStream({
        async write(data) {
            if (isDNS) return udpWriter?.write(data);
            if (remote) {
                const w = remote.writable.getWriter();
                await w.write(data);
                w.releaseLock();
                return;
            }

            if (data.byteLength < 24) return;

            // UUID验证 - 支持userID和userIDLow,匹配任意一个即通过
            const uuidBytes = new Uint8Array(data.slice(1, 17));
            const checkUUID = (uuid) => {
                const hex = uuid.replace(/-/g, '');
                for (let i = 0; i < 16; i++) {
                    if (uuidBytes[i] !== parseInt(hex.substr(i * 2, 2), 16)) return false;
                }
                return true;
            };
            if (!checkUUID(userID) && !(userIDLow && checkUUID(userIDLow))) return;

            const view = new DataView(data);
            const version = view.getUint8(0); // 提取版本号
            const optLen = view.getUint8(17);
            const cmd = view.getUint8(18 + optLen);
            if (cmd !== 1 && cmd !== 2) return;

            let pos = 19 + optLen;
            const port = view.getUint16(pos);
            const type = view.getUint8(pos + 2);
            pos += 3;

            let addr = '';
            if (type === 1) {
                addr =
                    `${view.getUint8(pos)}.${view.getUint8(pos + 1)}.${view.getUint8(pos + 2)}.${view.getUint8(pos + 3)}`;
                pos += 4;
            } else if (type === 2) {
                const len = view.getUint8(pos++);
                addr = new TextDecoder().decode(data.slice(pos, pos + len));
                pos += len;
            } else if (type === 3) {
                const ipv6 = [];
                for (let i = 0; i < 8; i++, pos += 2) ipv6.push(view.getUint16(pos).toString(16));
                addr = ipv6.join(':');
            } else return;
            if (banHosts.includes(addr)) throw new Error(`黑名单关闭 TCP 出站连接 ${addr}`);
            const header = new Uint8Array([version, 0]); // 使用提取的版本号
            const payload = data.slice(pos);

            // UDP DNS
            if (cmd === 2) {
                if (port !== 53) return;
                isDNS = true;
                let sent = false;
                const {
                    readable,
                    writable
                } = new TransformStream({
                    transform(chunk, ctrl) {
                        for (let i = 0; i < chunk.byteLength;) {
                            const len = new DataView(chunk.slice(i, i + 2)).getUint16(0);
                            ctrl.enqueue(chunk.slice(i + 2, i + 2 + len));
                            i += 2 + len;
                        }
                    }
                });

                readable.pipeTo(new WritableStream({
                    async write(query) {
                        try {
                            const resp = await fetch('https://1.1.1.1/dns-query', {
                                method: 'POST',
                                headers: {
                                    'content-type': 'application/dns-message'
                                },
                                body: query
                            });
                            if (ws.readyState === 1) {
                                const result = new Uint8Array(await resp
                                    .arrayBuffer());
                                ws.send(new Uint8Array([...(sent ? [] : header),
                                result.length >> 8, result.length &
                                0xff, ...result
                                ]));
                                sent = true;
                            }
                        } catch { }
                    }
                }));
                udpWriter = writable.getWriter();
                return udpWriter.write(payload);
            }
            async function useSocks5Pattern(address) {
                if (go2Socks5s.includes(atob('YWxsIGlu')) || go2Socks5s.includes(atob('Kg=='))) return true;
                return go2Socks5s.some(pattern => {
                    let regexPattern = pattern.replace(/\*/g, '.*');
                    let regex = new RegExp(`^${regexPattern}$`, 'i');
                    return regex.test(address);
                });
            }
            const 启用SOCKS5全局反代 = (go2Socks5s.length > 0 && enableSocks) ? await useSocks5Pattern(addr) : null;
            // TCP连接
            let sock = null;
            if (启用SOCKS5全局反代) {
                sock = enableHttp ? await httpConnect(addr, port) : await socks5Connect(addr, port);
            } else {
                try {
                    sock = connect({ hostname: addr, port: port });
                    await sock.opened;
                } catch {
                    if (enableSocks) {
                        sock = enableHttp ? await httpConnect(addr, port) : await socks5Connect(addr, port);
                    } else {
                        let 反代IP地址 = proxyIP, 反代IP端口 = 443;
                        if (proxyIP.includes(']:')) {
                            反代IP端口 = parseInt(proxyIP.split(']:')[1]) || 反代IP端口;
                            反代IP地址 = proxyIP.split(']:')[0] + "]" || 反代IP地址;
                        } else if (proxyIP.split(':').length === 2) {
                            反代IP端口 = parseInt(proxyIP.split(':')[1]) || 反代IP端口;
                            反代IP地址 = proxyIP.split(':')[0] || 反代IP地址;
                        }
                        if (proxyIP.toLowerCase().includes('.tp')) 反代IP端口 = parseInt(proxyIP.toLowerCase().split('.tp')[1].split('.')[0]) || 反代IP端口;
                        try {
                            sock = connect({ hostname: 反代IP地址, port: 反代IP端口 });
                        } catch {
                            sock = connect({ hostname: atob('UFJPWFlJUC50cDEuMDkwMjI3Lnh5eg=='), port: 1 });
                        }
                    }
                }
            }
            await sock.opened;
            if (!sock) return;

            remote = sock;
            const w = sock.writable.getWriter();
            await w.write(payload);
            w.releaseLock();

            let sent = false;
            sock.readable.pipeTo(new WritableStream({
                write(chunk) {
                    if (ws.readyState === 1) {
                        ws.send(sent ? chunk : new Uint8Array([...header, ...
                            new Uint8Array(chunk)
                        ]));
                        sent = true;
                    }
                },
                close: () => ws.readyState === 1 && ws.close(),
                abort: () => ws.readyState === 1 && ws.close()
            })).catch(() => { });
        }
    })).catch(() => { });

    return new Response(null, {
        status: 101,
        webSocket: client
    });
}