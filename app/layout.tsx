import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "OmniBrief - AI-Powered Instant Summaries",
    description: "Upload documents, audio, videos, and images to get instant AI-generated insights. Save time with OmniBrief's intelligent summarization technology.",
    keywords: ["AI", "summarization", "audio transcription", "video summary", "document summary", "image analysis", "insights", "productivity"],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </head>
            <body suppressHydrationWarning>{children}</body>
        </html>
    );
}
