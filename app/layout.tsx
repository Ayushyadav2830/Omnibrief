import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL("https://omnibrief-nine.vercel.app"),
    title: "OmniBrief - AI-Powered Instant Summaries",
    description: "Upload documents, audio, videos, and images to get instant AI-generated insights. Save time with OmniBrief's intelligent summarization technology.",
    keywords: ["AI", "summarization", "audio transcription", "video summary", "document summary", "image analysis", "insights", "productivity"],
    openGraph: {
        title: "OmniBrief - AI-Powered Instant Summaries",
        description: "Transform Hours of Content into Instant Insights with AI",
        url: "https://omnibrief-nine.vercel.app",
        siteName: "OmniBrief",
        locale: "en_US",
        type: "website",
    },
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
