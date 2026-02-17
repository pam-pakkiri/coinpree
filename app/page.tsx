import LandingPage from "@/components/LandingPage";
import { getLandingPageData } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getLandingPageData();

  return <LandingPage initialData={data} />;
}
