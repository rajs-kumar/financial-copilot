// /src/app/ingestion/layout.tsx

"use client";

import React from "react";
import AuthGuard from "../../components/AuthGuard";

export default function IngestionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
