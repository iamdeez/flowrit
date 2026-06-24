import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

const SITE_URL = 'https://flowrit.motionbit.kr'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Flowrit',
    template: '%s | Flowrit',
  },
  description: '고객 의뢰·수정 요청·납품 링크를 한 곳에서 관리하세요',
  keywords: ['프리랜서', '고객 관리', '의뢰 관리', '수정 요청', '납품', '워크플로우', 'Flowrit'],
  authors: [{ name: 'Flowrit' }],
  icons: {
    icon: '/FLOWRIT_icon_logo.svg',
    shortcut: '/FLOWRIT_icon_logo.svg',
    apple: '/FLOWRIT_icon_logo.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: 'Flowrit',
    title: 'Flowrit — 고객 의뢰·수정 요청·납품 링크를 한 곳에서',
    description: '고객 의뢰·수정 요청·납품 링크를 한 곳에서 관리하세요',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flowrit — 고객 의뢰·수정 요청·납품 링크를 한 곳에서',
    description: '고객 의뢰·수정 요청·납품 링크를 한 곳에서 관리하세요',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
