# ターミナルUI 仕様書

## 概要
NashのターミナルUIは、モバイルファーストを意識したレイアウトを採用しています。
画面領域を最大限活用するため、必要な要素（キーボード、入力欄）を効率的に配置し、インタラクティブなアプリケーション（vim等）の使用時には自動的にモードを切り替えます。

## コンポーネント構成と画面対応

画面のレイアウトと、各エリアに対応するコンポーネントおよびファイルは以下の通りです。

```text
+-------------------------------------------------------+
|  $ Connected to server...                             |
|  $ ls -la                                             | Area: TerminalOutput
|  drwxr-xr-x  2 user  staff   64 Jan 10 12:00 .        | File: src/components/TerminalOutput.tsx
|  $ _                                                  | Desc: ログ表示とxterm端末エリア
|                                                       |
+-------------------------------------------------------+
|                                                       | Area: CommandInput
|  > ls -la                        [ ↵ ]                | File: src/components/CommandInput.tsx
|                                                       | Desc: コマンド入力と送信ボタン(青色)
+-------------------------------------------------------+
|                                                       | Area: ShortcutBar
|  [ESC] [TAB] [CTRL-C] [↑] [↓] ...                     | File: src/components/ShortcutBar.tsx
|                                                       | Desc: 補助キー(常に最下部に固定)
+-------------------------------------------------------+
```

## コンポーネント詳細仕様

### 1. TerminalOutput (`src/components/TerminalOutput.tsx`)
- **役割**:
  - `xterm.js` インスタンスの生成と管理。
  - バックエンドからのログデータの描画。
  - リサイズイベントの検知とハンドリング。
  - **バッファ監視**: ターミナルのバッファモード（通常 / 代替画面）を監視し、`onBufferChange` コールバックを通じて親コンポーネントに通知します。
- **Props**:
  - `onData(data: string)`: ユーザー入力をバックエンドへ送信。
  - `onResize(cols, rows)`: リサイズ情報を通知。
  - `onBufferChange(isAlt: boolean)`: バッファ状態の変更を通知。

### 2. CommandInput (`src/components/CommandInput.tsx`)
- **役割**:
  - コマンドライン入力のインターフェース。
  - テキストボックスと送信ボタンを提供。
  - `autoFocus` と `ref.focus()` による入力フォーカスの制御。
- **デザイン**:
  - Glassmorphism（すりガラス）スタイルの背景。
  - 右端に青色の送信ボタン (`CornerDownLeft` アイコン)。
  - `value` が空でも送信可能（改行コード送信）。
- **Props**:
  - `value`: 入力中の文字列。
  - `onChange`: 入力更新ハンドラ。
  - `onEnter`: 送信アクションハンドラ。
  - `visible`: 表示/非表示フラグ。

### 3. ShortcutBar (`src/components/ShortcutBar.tsx`)
- **役割**:
  - モバイル端末で入力しにくいキー（ESC, TAB, CTRL, 矢印キー）へのクイックアクセス。
  - 横スクロール可能なバーとして画面最下部に常駐。
- **デザイン**:
  - 入力エリアと同じGlassmorphismスタイル。
  - ボタンはタップしやすいサイズに調整。

## 動作・振る舞い

### 通常モード (Shell)
- **初期状態**: アプリ（SSH接続）起動時に自動的に `CommandInput` にフォーカスが当たり、ソフトウェアキーボードが開きます。
- **入力**: ユーザーは `CommandInput` にコマンドを入力し、送信ボタン（またはEnterキー）で実行します。
- **フォーカス維持**: 送信後もフォーカスは外れず、連続入力が可能です。

### インタラクティブモード (vim / top / less 等)
- **検知**: `xterm.js` の Alternate Buffer への切り替えを検知して遷移します。
- **最大化**:
  - `CommandInput` が非表示になります。
  - `TerminalOutput` が拡張され、`ShortcutBar` の直上まで領域を使います。
- **操作**: ユーザーは `ShortcutBar`（ESC等）やソフトウェアキーボード（直接入力）を使用してアプリを操作します。
- **終了**: アプリを終了すると、自動的に通常モード（入力バーあり）に戻ります。
