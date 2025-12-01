# 纹理修复指南

## 当前状态

✅ **已使用的平铺纹理**（正常工作）：
- `starfish_skin.jpg` - 海星纹理
- `leaf.jpg` - 海草纹理  
- `fish_scales.jpg` - 鱼鳞纹理

⚠️ **球形预览图**（已禁用，使用纯色替代）：
- `sand.png` - 地面（使用米黄色纯色）
- `wood.png` - 宝箱（使用棕色纯色）
- `gold.png` - 金属配件（使用金色纯色）

## 问题说明

从 CC0 Textures 等网站下载的纹理包中，通常包含：
- **球形预览图**（如 `Ground093C.png`）- 用于展示效果，不适合用作纹理
- **真正的纹理文件**（如 `Ground093C_1K-JPG_Color.jpg`）- 可以平铺使用

## 如何找到真正的纹理文件

### 方法 1: 在下载的文件夹中查找

如果你下载了完整的纹理包（如 `Ground093C_1K-JPG` 文件夹），应该包含：

1. **Color/Diffuse 贴图**（这是你需要的）：
   - `Ground093C_1K-JPG_Color.jpg` ✅ 使用这个
   - 或 `Ground093C_1K-JPG_Diffuse.jpg` ✅ 使用这个

2. **其他文件**（不需要）：
   - `Ground093C.png` ❌ 这是预览图
   - `_NormalGL.jpg` - 法线贴图（高级功能，不需要）
   - `_Roughness.jpg` - 粗糙度贴图（高级功能，不需要）
   - `_AmbientOcclusion.jpg` - AO贴图（高级功能，不需要）

### 方法 2: 重新下载正确的文件

1. 访问 **CC0 Textures**: https://cc0textures.com/
2. 搜索你需要的纹理（如 "sand", "wood", "gold metal"）
3. 点击纹理页面
4. 下载 **"Diffuse"** 或 **"Color"** 版本
5. 选择分辨率：**1K (1024x1024)** 或 **2K (2048x2048)**
6. 格式选择：**JPG**（文件更小）

### 方法 3: 使用当前设置（推荐用于快速测试）

当前代码已经配置为：
- 地面、宝箱、金属使用纯色（通过 `u_objectColor` 控制）
- 效果已经很好，可以正常使用

## 替换步骤（如果找到真正的纹理文件）

1. 将真正的纹理文件放到 `assets/textures/` 文件夹：
   - `sand_color.jpg` 或 `sand_diffuse.jpg`（地面）
   - `wood_color.jpg` 或 `wood_diffuse.jpg`（宝箱）
   - `gold_color.jpg` 或 `gold_diffuse.jpg`（金属）

2. 打开 `src/main.js`，找到 `texturePaths` 对象（约第 120 行）

3. 更新路径：
```javascript
const texturePaths = {
  ground: 'assets/textures/sand_color.jpg',    // 改成你的文件名
  chest: 'assets/textures/wood_color.jpg',     // 改成你的文件名
  metal: 'assets/textures/gold_color.jpg',     // 改成你的文件名
  // ... 其他保持不变
};
```

4. 将 `null` 改为实际路径：
```javascript
const texturePaths = {
  ground: 'assets/textures/sand_color.jpg',     // 从 null 改为实际路径
  chest: 'assets/textures/wood_color.jpg',      // 从 null 改为实际路径
  metal: 'assets/textures/gold_color.jpg',     // 从 null 改为实际路径
  starfish: 'assets/textures/starfish_skin.jpg',
  seaweed: 'assets/textures/leaf.jpg',
  fish: 'assets/textures/fish_scales.jpg'
};
```

5. 更新加载代码，取消注释这些纹理的加载

## 当前效果

即使没有真正的纹理文件，项目也能正常工作：
- ✅ 地面显示为米黄色（`u_objectColor: 0.6, 0.4, 0.2`）
- ✅ 宝箱显示为棕色（`u_objectColor: 0.5, 0.3, 0.1`）
- ✅ 金属配件显示为金色（`u_objectColor: 1, 0.84, 0`）
- ✅ 海星、海草、鱼使用真实的纹理

## 总结

**你现在不需要做任何事情！** 代码已经配置好了：
- 平铺纹理正常使用
- 球形预览图使用纯色替代
- 项目可以正常运行和提交

如果你想使用真正的纹理，按照上面的步骤找到 `_Color.jpg` 或 `_Diffuse.jpg` 文件即可。

