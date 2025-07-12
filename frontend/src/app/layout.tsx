import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from '@/components/layout/sidebar';
import { StagewiseToolbar } from '@stagewise/toolbar-next';
import ReactPlugin from '@stagewise-plugins/react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "智能排课系统 - K-12版",
  description: "面向K-12阶段的智能排课与场室管理系统",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        {/* 仅开发环境显示 */}
        <StagewiseToolbar config={{ plugins: [ReactPlugin] }} />
        {children}
      </body>
    </html>
  );
}
