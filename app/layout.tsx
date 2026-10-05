import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知条件 · 自然语言选股实验室",
  description: "把投资意图变成透明、可修改、可验证的筛选条件。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
