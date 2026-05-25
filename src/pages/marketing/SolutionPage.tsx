import { useParams, Navigate } from "react-router-dom";
import { getSolutionBySlug } from "@/data/marketingContent";
import { DashboardDetailPage } from "@/components/marketing/DashboardDetailPage";

const SolutionPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const solution = slug ? getSolutionBySlug(slug) : undefined;

  if (!solution) {
    return <Navigate to="/" replace />;
  }

  return <DashboardDetailPage solution={solution} />;
};

export default SolutionPage;
