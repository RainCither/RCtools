import { Navigate } from "react-router";
export default function FallbackPage() {
  return <Navigate to="/" replace />;
}
