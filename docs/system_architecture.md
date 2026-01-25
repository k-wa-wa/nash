# Nash システム基本設計書

## プロジェクト概要
**Nash**: モバイルファーストなWebベースSSHクライアント（シングルバイナリ）。
ブラウザ（特にモバイル端末）から快適にSSH操作を行うことを目的とし、PWA対応やUIの最適化を行っています。

## 技術スタック
- **Frontend**: React, TypeScript, Vite
- **Backend**: Go (Gin / Standard Lib), Gorilla WebSocket, ssh/crypto
- **Communication**: WebSocket (SSHストリーム転送)
- **Terminal Emulator**: xterm.js

## アーキテクチャ構成

### 1. Backend (Go)
- **Web Server**: ポート `:8080` で動作。
  - 静的ファイル配信: フロントエンドのビルド成果物 (`dist/`) を埋め込み配信。
  - WebSocket (`/ws`): クライアントとの双方向通信を確立。
- **SSH Client**:
  - `golang.org/x/crypto/ssh` を使用してリモートホストへ接続。
  - 認証方式: 
    - パスワード認証
    - 公開鍵認証（ファイルパス指定 / クライアントからのアップロード）
    - Keyboard Interactive / OTP（WebSocket経由でのトンネリング）
  - 擬似端末 (PTY) を割り当て、シェルセッションを開始。
  - 入出力（Stdin/Stdout/Stderr）をWebSocketメッセージとして中継。

### 2. Frontend (React)
- **SPA構成**: `react-router-dom` によるページ遷移（Home -> Terminal）。
- **WebSocket接続**: `/api.ts` で定義されたエンドポイントへ接続。
- **コンポーネント設計**:
  - `TerminalPage`: 画面全体のレイアウトと状態管理（バッファモード、Socket接続）。
  - `TerminalOutput`: xterm.js ラッパー。ソケットからのデータを描画。
  - `CommandInput`: 固定入力バー。
  - `ShortcutBar`: モバイル用補助キー。

## 開発環境 (DevX)
- **ビルドツール**: `Makefile` で一元管理。
  - `make run`: バックエンド（Go）とフロントエンド（Vite Dev Server）を同時起動。
  - プロキシ設定により、Vite (`:5173`) から Go (`:8080`) へのAPI転送を透過的に処理。
- **モバイルデバッグ**:
  - QRコード表示により実機確認を容易化。
  - `visualViewport` APIを利用したキーボード表示時のレイアウト調整。

## 機能仕様

### PWA / モバイル対応
- **Manifest**: `standalone` モード対応。ホーム画面に追加することでブラウザUI無しで起動可能。
- **iOS対応**:
  - `apple-mobile-web-app-capable` メタタグ。
  - ソフトウェアキーボード表示時のビューポート高さの動的調整。

### UI モード
- **Normal Mode**: 通常のシェル操作。固定入力バーを使用。
- **Interactive Mode**: `top`, `vim` などの全画面アプリ。入力バーを隠し、ターミナル領域を最大化。
