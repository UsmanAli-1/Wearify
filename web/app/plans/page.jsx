import { Suspense } from "react";
import PlansPage from "../../components/Plans/PlansPage";

export const dynamic = "force-dynamic";

export default function Plans() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlansPage />
    </Suspense>
  );
}