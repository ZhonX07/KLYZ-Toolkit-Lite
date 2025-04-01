// 字体预加载脚本
document.addEventListener('DOMContentLoaded', () => {
  // 创建字体加载检测元素
  const fontLoader = document.createElement('div');
  fontLoader.style.visibility = 'hidden';
  fontLoader.style.position = 'absolute';
  fontLoader.style.top = '-9999px';
  fontLoader.style.left = '-9999px';
  
  // 添加所有需要预加载的字体
  const fontsToLoad = [
    { name: 'cjdmh', text: '字体预加载' },
    { name: 'Sans', text: '字体预加载' },
    { name: 'whgsqzj', text: '字体预加载' }
  ];
  
  fontsToLoad.forEach(font => {
    const element = document.createElement('span');
    element.style.fontFamily = font.name + ', serif';
    element.innerHTML = font.text;
    fontLoader.appendChild(element);
    console.log(`正在预加载字体: ${font.name}`);
  });
  
  document.body.appendChild(fontLoader);
  console.log('字体预加载完成');
});
