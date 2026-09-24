import { fetchHomeSearchSeed } from '@/lib/homeSearchSeed';
import HomePageClient from './HomePageClient';

export default async function HomePage() {
  const initialSearch = await fetchHomeSearchSeed();
  return <HomePageClient initialSearch={initialSearch} />;
}
