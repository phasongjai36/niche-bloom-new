import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Bill from "./pages/Bill";
import Add from "./pages/Add";
import Closed from "./pages/Closed";
import Shell from "./components/ShellLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Shell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "bill", element: <Bill /> },
      { path: "add", element: <Add /> },
      { path: "closed", element: <Closed /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}