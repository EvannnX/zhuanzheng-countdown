# 转正倒计时 · 安装和启动

需要：macOS 11 或更新的系统、能上网。不用提前安装任何东西。

## 1. 打开「终端」

按 `Command + 空格`，输入 `终端`（或 `Terminal`），回车。

## 2. 安装（只做一次）

复制下面整段，粘贴到终端，回车。它会从 GitHub 下载游戏并解压到「下载」文件夹：

```bash
cd ~/Downloads && curl -fL -o zhuanzheng-countdown.zip https://github.com/EvannnX/zhuanzheng-countdown/releases/latest/download/zhuanzheng-countdown.zip && unzip -oq zhuanzheng-countdown.zip && chmod +x zhuanzheng-countdown/run.sh && echo "安装完成"
```

看到「安装完成」就好了。以后游戏更新了，再运行一次这条指令即可。

## 3. 启动游戏

朋友不在同一个 Wi-Fi（公网链接）：

```bash
~/Downloads/zhuanzheng-countdown/run.sh public
```

朋友在同一个 Wi-Fi：

```bash
~/Downloads/zhuanzheng-countdown/run.sh lan
```

第一次启动会自动下载运行环境（约 50MB），等一两分钟。

## 4. 把链接发给朋友

终端里会显示链接：

- 公网模式：一行 `https://xxxx.trycloudflare.com`，把它发给朋友。
- 局域网模式：一行 `http://192.168.x.x:5173`，把它发给朋友。
- 这台电脑自己玩：打开 `http://localhost:5173`。

然后：一个人点「创建房间」→ 把 4 位房间号告诉大家 → 其他人输入房间号加入 → 房主按 Enter 开局。

## 5. 关闭游戏

在终端窗口里按 `Control + C`，或者直接关掉终端窗口。

## 常见问题

- **终端窗口不能关**：关掉游戏就停了，房间也会消失。
- **公网链接每次启动都不一样**：重新启动后要把新链接再发一次。
- **提示「端口 5173 已被占用」**：游戏已经在另一个终端窗口里运行了，关掉那个窗口再试。
- **画面卡**：游戏里按 `P` 调低画质，按 `M` 静音。
- **朋友打不开局域网链接**：改用公网模式。
