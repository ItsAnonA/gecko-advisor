import { permanentRedirect } from 'next/navigation';

export default function DomainIntelligenceApiRedirect() {
  permanentRedirect('/api-access');
}
