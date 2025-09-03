# 修复API配置问题

如果遇到"请先配置API密钥"的问题，请按以下步骤操作：

## 方法1：使用浏览器控制台快速修复

1. 打开浏览器开发者工具（F12或右键->检查）
2. 切换到Console（控制台）标签
3. 输入以下命令并回车：
```javascript
await debugHelpers.resetApiConfigs()
```

4. 刷新页面，API配置应该已经恢复正常
5. 进入批量测试页面，现在应该可以正常使用了

## 方法2：手动重新配置

1. 打开浏览器开发者工具Console
2. 清除现有配置：
```javascript
await debugHelpers.viewAllApiConfigs()  // 查看当前配置
```

3. 如果配置有问题，执行重置：
```javascript
await debugHelpers.resetApiConfigs()  // 重置为默认配置
```

4. 或者手动设置API密钥：
```javascript
await debugHelpers.setApiKey('sk-KUUvvvlJ13yJiSKSeNSVtrSAMVMwdVZkamkeTDnDQceFiojq')
```

## 方法3：通过设置页面重新配置

1. 进入"系统设置"页面
2. 删除现有配置（如果有的话）
3. 点击"使用Kimi K2配置"快速填充
4. 确保以下字段都已填写：
   - 配置名称
   - API密钥（重要！）
   - 勾选"设为默认配置"
5. 点击"保存配置"
6. 点击"测试连接"确认配置正确

## 验证修复

1. 返回"批量测试"页面
2. 点击API配置旁的刷新按钮
3. 选择至少一个测试模板
4. "开始测试"按钮应该变为可点击状态

## 常见问题

- **Q: 为什么配置了还是不行？**
  A: 可能是isDefault字段没有正确保存，使用控制台命令重置

- **Q: 控制台命令报错？**
  A: 等待页面完全加载后再执行，或刷新页面后重试

- **Q: 如何查看当前配置？**
  A: 在控制台执行 `await debugHelpers.viewAllApiConfigs()`