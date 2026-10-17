import {
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import { useLockFn } from 'ahooks'
import type { Ref } from 'react'
import { useImperativeHandle, useState } from 'react'

import { BaseDialog, DialogRef, Switch } from '@/components/base'
import { useVerge } from '@/hooks/use-verge'
import { showNotice } from '@/services/notice-service'

const DEFAULT_APPS = ['Safari', 'com.apple.WebKit.Networking']

/**
 * 按 App 分流（白名单）
 *
 * 开启后只有名单里的进程走代理，其余进程在第一条规则就被判成 DIRECT。
 * 名单内的进程仍然按订阅/合并后的规则分流（国内直连、国外走节点）。
 *
 * 进程名的取法：
 *  - Safari 的网页请求其实由 `com.apple.WebKit.Networking` 发起，两个都要写
 *  - 普通 App 一般写可执行文件名（如 ChatGPT、Cursor），Electron 类应用
 *    的网络请求常在同 bundle 的 Helper 里，可用 `per-app.py list` 查
 */
export function PerAppViewer({ ref }: { ref?: Ref<DialogRef> }) {
  const { verge, patchVerge } = useVerge()

  const [open, setOpen] = useState(false)
  const [enable, setEnable] = useState(false)
  const [text, setText] = useState('')

  useImperativeHandle(ref, () => ({
    open: () => {
      const apps = verge?.per_app_apps ?? []
      setEnable(verge?.per_app_enable ?? false)
      setText((apps.length ? apps : DEFAULT_APPS).join('\n'))
      setOpen(true)
    },
    close: () => setOpen(false),
  }))

  const onSave = useLockFn(async () => {
    const apps = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    try {
      await patchVerge({ per_app_enable: enable, per_app_apps: apps })
      setOpen(false)
    } catch (err) {
      showNotice.error(err)
    }
  })

  return (
    <BaseDialog
      open={open}
      title="按 App 分流（白名单）"
      contentSx={{ width: 520 }}
      okBtn="保存"
      cancelBtn="取消"
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
      onOk={onSave}
    >
      <List>
        <ListItem sx={{ padding: '5px 2px' }}>
          <ListItemText
            primary="启用白名单"
            secondary="只有名单内的 App 走代理，其他 App 一律直连"
          />
          <Switch
            edge="end"
            checked={enable}
            onChange={(_, checked) => setEnable(checked)}
            sx={{ marginLeft: 'auto' }}
          />
        </ListItem>

        <ListItem sx={{ padding: '5px 2px', flexDirection: 'column', alignItems: 'stretch' }}>
          <TextField
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            multiline
            minRows={6}
            maxRows={12}
            label="进程名（每行一个，按 PROCESS-NAME 匹配）"
            placeholder={'Safari\ncom.apple.WebKit.Networking\nChatGPT\nCursor\ngit-remote-*'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            slotProps={{ input: { style: { fontFamily: 'monospace', fontSize: 13 } } }}
          />
        </ListItem>

        <ListItem sx={{ padding: '5px 2px' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            提示：支持通配符（如 git-remote-*，会生成 PROCESS-NAME-WILDCARD）；
            Safari 的网页请求由 com.apple.WebKit.Networking 发起，只写 Safari 抓不到；Electron 类应用（Cursor/Figma 等）的网络请求常在 App bundle 内的
            Helper 进程里。另外这个功能依赖内核以 Service 模式运行（root），
            否则判定不到进程，所有 App 都会变成直连。
          </Typography>
        </ListItem>
      </List>
    </BaseDialog>
  )
}
