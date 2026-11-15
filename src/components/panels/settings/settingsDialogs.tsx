import ConfirmDialog from "../../ConfirmDialog";

interface DialogProps {
  open: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ResetSettingsDialog({
  open,
  busy = false,
  onConfirm,
  onCancel,
}: DialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="重置所有设置"
      message="所有设置将恢复默认，已保存的预设会被替换，“开机自启”也会关闭。此操作无法撤销。"
      confirmLabel="重置"
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export function ResetUsageDialog({
  open,
  busy = false,
  onConfirm,
  onCancel,
}: DialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="重置使用数据"
      message="所有已记录的会话将被删除，使用统计图表和总数将从头开始。此操作无法撤销。"
      confirmLabel="重置"
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export function ExtendedSpeedDialog({
  open,
  onConfirm,
  onCancel,
}: DialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="启用扩展点击速度上限？"
      message="上限将从每个间隔 500 次提升到 1000 次。较高的速度在配置较低的电脑上可能会卡顿。"
      confirmLabel="启用"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export function RestartStandardDialog({
  open,
  busy = false,
  onConfirm,
  onCancel,
}: DialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="以非管理员身份重启？"
      message="应用将关闭并以非管理员身份重新打开。跳过重启则本次运行仍保留管理员权限，直到你关闭它。"
      confirmLabel="立即重启"
      cancelLabel="暂不"
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export function RestartAdminDialog({
  open,
  busy = false,
  onConfirm,
  onCancel,
}: DialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="以管理员身份重启？"
      message="应用将关闭并以管理员身份重新打开。跳过重启则该设置将在下次启动时生效。"
      confirmLabel="立即重启"
      cancelLabel="暂不"
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
