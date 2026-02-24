import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { DashboardPage } from "./pages/DashboardPage/DashboardPage";
import { JobDetailPage } from "./pages/JobDetailPage/JobDetailPage";

/**
 * Responsibilities:
 * 	1. Wrap the app in BrowserRouter so all child components can use
 * 	   useNavigate(), useParams(), and <Link> from react-router-dom.
 * 	2. Define which URL paths render which page components.
 * 
 * Route map:
 * 	/			→ DashboardPage		(machines + job queue)
 * 	/jobs/:id	→ JobDetailPage		(single job + event history)
 * 	*			→ redirect to /		(catch unkown URLs)
 */
export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<DashboardPage />} />
				<Route path="/jobs/:id" element={<JobDetailPage />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	);
}