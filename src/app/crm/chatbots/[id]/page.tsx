import React from 'react';
import FlowCanvas from './client-page';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default async function ChatbotBuilderPage({ params }: { params: { id: string } }) {
  // We handle layout in the unified client component
  return <FlowCanvas chatbotId={params.id} />;
}
