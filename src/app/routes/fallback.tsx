/** @file 未知路径的客户端兜底页面，将访问者带回首页。 */
import { Navigate } from "react-router";
/** 渲染未知地址的替换导航，将访问者带回目录首页。 */
export default function FallbackPage() {
  return <Navigate to="/" replace />;
}
