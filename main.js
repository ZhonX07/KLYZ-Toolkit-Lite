const { app, BrowserWindow, globalShortcut, Menu, ipcMain, protocol, shell } = require('electron/main')
const path = require('path')
const fs = require('fs')
const url = require('url')
const { execFile } = require('child_process')

// 检查是否是打包后的应用
const isPackaged = app.isPackaged;
// 根据是否打包选择正确的路径
const basePath = isPackaged ? path.join(process.resourcesPath, 'app') : __dirname;

// 添加对光标文件路径的引用
const cursorPath = path.join(basePath, 'Web-Files', 'cursor')

// 字体文件目录
const fontDir = path.join(basePath, 'Web-Files', 'html');

let win;

const createWindow = () => {
  // 设置菜单为null
  Menu.setApplicationMenu(null);
  
  win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,          // 启用Node集成，允许访问本地文件
      contextIsolation: false,        // 关闭上下文隔离
      enableRemoteModule: true,       // 启用远程模块
      webSecurity: false,             // 禁用web安全性，允许访问本地文件
      autoHideMenuBar: true,          // 不显示菜单栏
    }
  })
  
  // 检查光标文件并输出调试信息
  if (fs.existsSync(cursorPath)) {
    console.log('光标文件夹存在:', cursorPath);
    
    // 列出光标文件
    const cursorFiles = fs.readdirSync(cursorPath);
    console.log('光标文件:', cursorFiles);
    
    // 检查关键光标文件是否存在
    const requiredCursors = ['normal.ani', 'text.ani', 'link.ani'];
    const missingCursors = requiredCursors.filter(
      cursor => !cursorFiles.includes(cursor)
    );
    
    if (missingCursors.length > 0) {
      console.error('缺少必要的光标文件:', missingCursors);
    } else {
      console.log('所有必要的光标文件都存在');
    }
  } else {
    console.error('光标文件夹不存在:', cursorPath);
  }
  
  // 在加载页面前添加资源请求处理，确保光标文件可以被加载
  win.webContents.session.webRequest.onBeforeRequest(
    { urls: ['file://*cursor*'] },
    (details, callback) => {
      console.log('资源请求:', details.url);
      callback({});
    }
  );
  
  win.maximize()
  win.show()
  
  // 禁止右键菜单
  win.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // 监听窗口状态变化
  win.on('maximize', () => {
    win.webContents.send('window-state-changed', true);
  });
  
  win.on('unmaximize', () => {
    win.webContents.send('window-state-changed', false);
  });

  // 拦截所有导航并处理外部链接
  win.webContents.on('will-navigate', (event, url) => {
    // 检查URL是否为外部链接（非file://）
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  
  // 处理在页面上创建的新窗口
  win.webContents.setWindowOpenHandler(({ url }) => {
    // 在系统默认浏览器中打开外部链接
    if (!url.startsWith('file://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  win.loadFile('Web-Files/index.html')
  
  // 默认打开开发者工具
}

// 当Electron完成初始化时
app.whenReady().then(() => {
  // 注册自定义协议处理程序，以确保可以加载光标文件
  protocol.registerFileProtocol('cursor', (request, callback) => {
    const url = request.url.substring(9); // 移除 'cursor://'
    const filePath = path.join(__dirname, 'Web-Files', 'cursor', url);
    console.log('处理光标请求:', filePath);
    callback({ path: filePath });
  });

  // 注册字体协议处理器（在应用准备好之前）
  protocol.registerFileProtocol('font', (request, callback) => {
    const url = request.url.substring(7); // 移除 "font://" 前缀
    try {
      // 构建字体文件的绝对路径
      const fontPath = path.join(fontDir, url);
      console.log('加载字体文件:', fontPath);
      if (fs.existsSync(fontPath)) {
        callback({ path: fontPath });
      } else {
        console.error('字体文件不存在:', fontPath);
        callback({ error: -6 }); // FILE_NOT_FOUND
      }
    } catch (error) {
      console.error('字体加载错误:', error);
      callback({ error: -2 /* FAILED */ });
    }
  });
  
  createWindow();
  
  // 确保菜单栏已被移除
  Menu.setApplicationMenu(null);
  
  // 禁用开发者工具快捷键
  // 注释掉下面的代码
  /*
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (win && win.webContents) {
      win.webContents.toggleDevTools();
    }
  });
  */
  
  // 注册刷新页面快捷键 (F5 或 Ctrl+R)
  globalShortcut.register('F5', () => {
    if (win && win.webContents) {
      win.webContents.reload();
    }
  });
  
  globalShortcut.register('CommandOrControl+R', () => {
    if (win && win.webContents) {
      win.webContents.reload();
    }
  });

  // 注册文件协议处理程序，替代原来的file://访问
  protocol.registerFileProtocol('app', (request, callback) => {
    const filePath = path.join(__dirname, 'Web-Files', request.url.substring(6));
    console.log('处理app协议请求:', filePath);
    callback({ path: filePath });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  });
});

// 处理窗口控制消息
ipcMain.on('window-minimize', () => {
  if (win) win.minimize();
});

ipcMain.on('window-maximize', () => {
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (win) win.close();
});

// 应用退出前清理快捷键注册
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

// 获取应用路径
ipcMain.on('get-app-path', (event) => {
  event.returnValue = app.getAppPath();
});

// 检查文件是否存在
ipcMain.on('check-file-exists', (event, filePath) => {
  try {
    let fullPath = filePath;
    if (!path.isAbsolute(filePath)) {
      fullPath = path.join(__dirname, 'Web-Files', filePath);
    }
    
    console.log('检查文件是否存在:', fullPath);
    event.returnValue = fs.existsSync(fullPath);
  } catch (error) {
    console.error('检查文件存在性出错:', error);
    event.returnValue = false;
  }
});

// 监听打开本地文件的请求
ipcMain.on('open-local-file', (event, filePath) => {
  console.log('收到打开本地文件请求:', filePath);
  openLocalFile(filePath, event);
});

// 在指定目录中打开文件
ipcMain.on('open-local-file-in-directory', (event, { filePath, directory }) => {
  const dirPath = path.join(__dirname, 'Web-Files', directory);
  const fullPath = path.join(dirPath, filePath);
  
  console.log('尝试在指定目录打开文件:', fullPath);
  
  if (!fs.existsSync(fullPath)) {
    console.error('指定目录中文件不存在:', fullPath);
    event.reply('open-local-file-result', {
      success: false,
      error: `指定目录中文件不存在: ${fullPath}`
    });
    return;
  }
  
  shell.openPath(fullPath)
    .then((result) => {
      if (result === '') {
        console.log('文件成功打开');
        event.reply('open-local-file-result', { success: true });
      } else {
        console.error('打开文件失败:', result);
        event.reply('open-local-file-result', {
          success: false,
          error: result
        });
      }
    })
    .catch(err => {
      console.error('打开文件时发生异常:', err);
      event.reply('open-local-file-result', {
        success: false,
        error: err.message
      });
    });
});

// 提取共享的文件打开逻辑到一个函数
function openLocalFile(filePath, event) {
  if (fs.existsSync(filePath)) {
    execFile(filePath, (error) => {
      if (error) {
        console.error('执行文件时出错:', error);
        event.reply('open-local-file-error', error.message);
      }
    });
  } else {
    console.error('文件不存在:', filePath);
    event.reply('open-local-file-error', '找不到程序文件: ' + filePath);
  }
}

// 打印当前工作目录，这对调试路径问题很有用
console.log('当前工作目录:', process.cwd());
console.log('应用目录:', app.getAppPath());