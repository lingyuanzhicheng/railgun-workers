import { connect } from 'cloudflare:sockets';

let proxyIP = '';
let proxyIPs;
let httpsPorts = ["2053", "2083", "2087", "2096", "8443"];
let banHosts = [atob('c3BlZWQuY2xvdWRmbGFyZS5jb20=')];

export default {
    async fetch(request, env) {
        try {
            proxyIP = env.PROXYIP || env.proxyip || proxyIP;
            proxyIPs = await 整理(proxyIP);
            proxyIP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];
            proxyIP = proxyIP ? proxyIP.toLowerCase() : request.cf.colo + '.proxyip.cmliussss.net';

            if (env.CFPORTS) httpsPorts = await 整理(env.CFPORTS);
            if (env.BAN) banHosts = await 整理(env.BAN);

            const upgradeHeader = request.headers.get('Upgrade');
            const url = new URL(request.url);

            if (!upgradeHeader || upgradeHeader !== 'websocket') {
                const 路径 = url.pathname.toLowerCase();

                // 优先处理 /sync 路径
                if (路径 === '/sync') {
                    if (request.method !== 'POST') {
                        return new Response('Method Not Allowed', { status: 405 });
                    }
                
                    // API Key 验证
                    const expectedKey = env.APIKEY;
                    if (!expectedKey) {
                        return new Response('Sync endpoint disabled: APIKEY not configured', { status: 403 });
                    }
                
                    let providedKey = null;
                    const authHeader = request.headers.get('Authorization');
                    if (authHeader && authHeader.startsWith('Bearer ')) {
                        providedKey = authHeader.substring(7).trim();
                    }
                    if (!providedKey) {
                        providedKey = url.searchParams.get('apikey');
                    }
                    if (providedKey !== expectedKey) {
                        return new Response('Forbidden: Invalid API key', { status: 403 });
                    }
                
                    try {
                        const contentType = request.headers.get('content-type') || '';
                        if (!contentType.includes('application/json')) {
                            return new Response('Content-Type must be application/json', { status: 400 });
                        }
                
                        const payload = await request.json();
                        const action = payload.action;
                
                        if (action === 'list') {
                            const list = await env.AUTH_KV.list();
                            const entries = [];
                            for (const key of list.keys) {
                                const value = await env.AUTH_KV.get(key.name);
                                entries.push({ uuid: key.name, value });
                            }
                            return new Response(JSON.stringify(entries, null, 2), {
                                headers: { 'Content-Type': 'application/json; charset=utf-8' }
                            });
                
                        } else if (action === 'get') {
                            const { uuid } = payload;
                            if (typeof uuid !== 'string') {
                                return new Response('Missing or invalid "uuid"', { status: 400 });
                            }
                            const value = await env.AUTH_KV.get(uuid);
                            return new Response(JSON.stringify({ uuid, value }, null, 2), {
                                headers: { 'Content-Type': 'application/json; charset=utf-8' }
                            });
                
                        } else if (action === 'put') {
                            const { uuid, value } = payload;
                            if (typeof uuid !== 'string' || !['true', 'false'].includes(value)) {
                                return new Response('Invalid input: uuid (string) and value ("true" or "false") required', { status: 400 });
                            }
                            await env.AUTH_KV.put(uuid, value);
                            return new Response(JSON.stringify({ success: true, uuid, value }), {
                                headers: { 'Content-Type': 'application/json; charset=utf-8' }
                            });
                
                        } else if (action === 'delete') {
                            const { uuid } = payload;
                            if (typeof uuid !== 'string') {
                                return new Response('Missing or invalid "uuid"', { status: 400 });
                            }
                            await env.AUTH_KV.delete(uuid);
                            return new Response(JSON.stringify({ success: true, deleted: uuid }), {
                                headers: { 'Content-Type': 'application/json; charset=utf-8' }
                            });
                
                        } else if (action === 'sync') {
                            const { data } = payload;
                            if (!Array.isArray(data)) {
                                return new Response('sync "data" must be an array', { status: 400 });
                            }
                
                            const targetMap = new Map();
                            for (const item of data) {
                                if (typeof item.uuid !== 'string' || typeof item.statu !== 'boolean') {
                                    return new Response('Invalid sync item: { uuid: string, statu: boolean }', { status: 400 });
                                }
                                targetMap.set(item.uuid, item.statu ? "true" : "false");
                            }
                
                            const kvList = await env.AUTH_KV.list();
                            const currentKeys = new Set(kvList.keys.map(k => k.name));
                            const results = { added: 0, updated: 0, deleted: 0 };
                
                            for (const key of currentKeys) {
                                if (!targetMap.has(key)) {
                                    await env.AUTH_KV.delete(key);
                                    results.deleted++;
                                }
                            }

                            for (const [uuid, value] of targetMap.entries()) {
                                const currentValue = await env.AUTH_KV.get(uuid);
                                if (currentValue === null) {
                                    await env.AUTH_KV.put(uuid, value);
                                    results.added++;
                                } else if (currentValue !== value) {
                                    await env.AUTH_KV.put(uuid, value);
                                    results.updated++;
                                }
                            }
                
                            return new Response(JSON.stringify({ success: true, ...results }, null, 2), {
                                headers: { 'Content-Type': 'application/json; charset=utf-8' }
                            });
                
                        } else {
                            return new Response(`Unknown action: ${action}. Supported: list, get, put, delete, sync`, { status: 400 });
                        }
                
                    } catch (err) {
                        console.error('Sync API error:', err);
                        return new Response(`Error: ${err.message}`, { status: 400 });
                    }
                } else {
                    // 处理其他路径
                    if (env.URL302) {
                        return Response.redirect(env.URL302, 302);
                    } else if (env.URL) {
                        return await 代理URL(env.URL, url);
                    } else if (路径 === '/') {
                        return new Response(await nginx(), {
                            status: 200,
                            headers: { 'Content-Type': 'text/html; charset=UTF-8' },
                        });
                    }

                    if (!路径.startsWith('/proxyip://')) {
                        const key = 路径.substring(1);
                        if (key) {
                            try {
                                const value = await env.AUTH_KV.get(key);
                                return new Response(value === null ? 'null' : value, {
                                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                                });
                            } catch (err) {
                                return new Response(err.message || 'KV error', { status: 500 });
                            }
                        }
                    }
                }

            } else {
                if (new RegExp('/proxyip://', 'i').test(url.pathname)) {
                    proxyIP = url.pathname.toLowerCase().split('/proxyip://')[1];
                }

                return handleWebSocket(request, env);
            }
        } catch (err) {
            return new Response(err.toString());
        }
    },
};

async function 代理URL(代理网址, 目标网址) {
    const 网址列表 = await 整理(代理网址);
    const 完整网址 = 网址列表[Math.floor(Math.random() * 网址列表.length)];
    let 解析后的网址 = new URL(完整网址);
    let 协议 = 解析后的网址.protocol.slice(0, -1) || 'https';
    let 主机名 = 解析后的网址.hostname;
    let 路径名 = 解析后的网址.pathname;
    if (路径名.charAt(路径名.length - 1) == '/') 路径名 = 路径名.slice(0, -1);
    路径名 += 目标网址.pathname;
    let 查询参数 = 解析后的网址.search;
    let 新网址 = `${协议}://${主机名}${路径名}${查询参数}`;
    let 响应 = await fetch(新网址);
    let 新响应 = new Response(响应.body, {
        status: 响应.status,
        statusText: 响应.statusText,
        headers: 响应.headers
    });
    新响应.headers.set('X-New-URL', 新网址);
    return 新响应;
}

async function 整理(内容) {
    var 替换后的内容 = 内容.replace(/[	"'\r\n]+/g, ',').replace(/,+/g, ',');
    if (替换后的内容.charAt(0) == ',') 替换后的内容 = 替换后的内容.slice(1);
    if (替换后的内容.charAt(替换后的内容.length - 1) == ',') 替换后的内容 = 替换后的内容.slice(0, -1);
    return 替换后的内容.split(',');
}

async function nginx() {
    return `
	<!DOCTYPE html>
	<html>
	<head><title>Welcome to nginx!</title>
	<style>body{width:35em;margin:0 auto;font-family:Tahoma,Verdana,Arial,sans-serif;}</style>
	</head>
	<body>
	<h1>Welcome to nginx!</h1>
	<p>If you see this page, the nginx web server is successfully installed and working.</p>
	</body>
	</html>
	`;
}

async function handleWebSocket(request, env) {
    const [client, ws] = Object.values(new WebSocketPair());
    ws.accept();

    let remote = null,
        udpWriter = null,
        isDNS = false,
        validated = false;
    let firstChunk = null;

    new ReadableStream({
        start(ctrl) {
            ws.addEventListener('message', e => {
                if (!validated) {
                    firstChunk = e.data;
                    validateAndProceed();
                } else {
                    ctrl.enqueue(e.data);
                }
            });
            ws.addEventListener('close', () => {
                remote?.close();
                ctrl.close();
            });
            ws.addEventListener('error', () => {
                remote?.close();
                ctrl.error();
            });

            const early = request.headers.get('sec-websocket-protocol');
            if (early && !validated) {
                try {
                    firstChunk = Uint8Array.from(atob(early.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)).buffer;
                    validateAndProceed();
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
            await processChunk(data);
        }
    })).catch(() => { });

    async function validateAndProceed() {
        if (!firstChunk || validated) return;
        const data = firstChunk;
        if (data.byteLength < 24) {
            ws.close(1008, "Invalid protocol");
            return;
        }

        // 提取 16 字节 UUID 并转为标准格式（带 -）
        const uuidBytes = new Uint8Array(data.slice(1, 17));
        const uuidHex = Array.from(uuidBytes, b => b.toString(16).padStart(2, '0')).join('');
        const uuidWithDashes = 
            uuidHex.slice(0,8) + '-' +
            uuidHex.slice(8,12) + '-' +
            uuidHex.slice(12,16) + '-' +
            uuidHex.slice(16,20) + '-' +
            uuidHex.slice(20);

        // 查询 AUTH_KV
        let kvValue;
        try {
            kvValue = await env.AUTH_KV.get(uuidWithDashes);
        } catch (err) {
            console.error('KV error:', err);
            ws.close(1008, "Auth error");
            return;
        }

        if (kvValue !== "true") {
            console.warn(`Unauthorized UUID: ${uuidWithDashes}`);
            ws.close(1008, "Unauthorized");
            return;
        }

        validated = true;
        await processChunk(data);
    }

    async function processChunk(data) {
        if (isDNS) return udpWriter?.write(data);
        if (remote) {
            const w = remote.writable.getWriter();
            await w.write(data);
            w.releaseLock();
            return;
        }

        const view = new DataView(data);
        const version = view.getUint8(0);
        const optLen = view.getUint8(17);
        const cmd = view.getUint8(18 + optLen);
        if (cmd !== 1 && cmd !== 2) return;

        let pos = 19 + optLen;
        const port = view.getUint16(pos);
        const type = view.getUint8(pos + 2);
        pos += 3;

        let addr = '';
        if (type === 1) {
            addr = `${view.getUint8(pos)}.${view.getUint8(pos + 1)}.${view.getUint8(pos + 2)}.${view.getUint8(pos + 3)}`;
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

        if (banHosts.includes(addr)) {
            ws.close(1008, `Blocked: ${addr}`);
            return;
        }

        const header = new Uint8Array([version, 0]);
        const payload = data.slice(pos);

        if (cmd === 2) {
            if (port !== 53) return;
            isDNS = true;
            let sent = false;
            const { readable, writable } = new TransformStream({
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
                            headers: { 'content-type': 'application/dns-message' },
                            body: query
                        });
                        if (ws.readyState === 1) {
                            const result = new Uint8Array(await resp.arrayBuffer());
                            ws.send(new Uint8Array([...(sent ? [] : header), result.length >> 8, result.length & 0xff, ...result]));
                            sent = true;
                        }
                    } catch { }
                }
            }));
            udpWriter = writable.getWriter();
            return udpWriter.write(payload);
        }

        let sock = null;

        // 直接尝试直连
        try {
            sock = connect({ hostname: addr, port: port });
            await sock.opened;
        } catch {
            // 直连失败，尝试 proxyIP
            let 反代IP地址 = proxyIP, 反代IP端口 = 443;
            if (proxyIP.includes(']:')) {
                反代IP端口 = parseInt(proxyIP.split(']:')[1]) || 反代IP端口;
                反代IP地址 = proxyIP.split(']:')[0] + "]" || 反代IP地址;
            } else if (proxyIP.split(':').length === 2) {
                反代IP端口 = parseInt(proxyIP.split(':')[1]) || 反代IP端口;
                反代IP地址 = proxyIP.split(':')[0] || 反代IP地址;
            }
            if (proxyIP.toLowerCase().includes('.tp')) 
                反代IP端口 = parseInt(proxyIP.toLowerCase().split('.tp')[1].split('.')[0]) || 反代IP端口;
            try {
                sock = connect({ hostname: 反代IP地址, port: 反代IP端口 });
            } catch {
                sock = connect({ hostname: atob('UFJPWFlJUC50cDEuMDkwMjI3Lnh5eg=='), port: 1 });
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
                    ws.send(sent ? chunk : new Uint8Array([...header, ...new Uint8Array(chunk)]));
                    sent = true;
                }
            },
            close: () => ws.close(),
            abort: () => ws.close()
        })).catch(() => { });
    }

    return new Response(null, { status: 101, webSocket: client });
}