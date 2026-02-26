import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { Login } from "./pages/Login";
import { WorkspaceSelect } from "./pages/WorkspaceSelect";
import { Dashboard } from "./pages/Dashboard";
import { JobsList } from "./pages/JobsList";
import { JobDetail } from "./pages/JobDetail";
import { JobEdit } from "./pages/JobEdit";
import { WorkflowsList } from "./pages/WorkflowsList";
import { WorkflowDetail } from "./pages/WorkflowDetail";
import { WorkflowEditor } from "./pages/WorkflowEditor";
import { SchedulesList } from "./pages/SchedulesList";
import { ScheduleEdit } from "./pages/ScheduleEdit";
import { TriggersList } from "./pages/TriggersList";
import { TriggerDetail } from "./pages/TriggerDetail";
import { RunsList } from "./pages/RunsList";
import { RunDetail } from "./pages/RunDetail";
import { AlertsList } from "./pages/AlertsList";
import { AlertRules } from "./pages/AlertRules";
import { ConnectionsList } from "./pages/ConnectionsList";
import { ConnectionDetail } from "./pages/ConnectionDetail";
import { Settings } from "./pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "jobs", Component: JobsList },
      { path: "jobs/:id", Component: JobDetail },
      { path: "jobs/:id/edit", Component: JobEdit },
      { path: "jobs/new", Component: JobEdit },
      { path: "workflows", Component: WorkflowsList },
      { path: "workflows/:id", Component: WorkflowDetail },
      { path: "workflows/:id/edit", Component: WorkflowEditor },
      { path: "workflows/new", Component: WorkflowEditor },
      { path: "schedules", Component: SchedulesList },
      { path: "schedules/:id/edit", Component: ScheduleEdit },
      { path: "schedules/new", Component: ScheduleEdit },
      { path: "triggers", Component: TriggersList },
      { path: "triggers/:id", Component: TriggerDetail },
      { path: "runs", Component: RunsList },
      { path: "runs/:id", Component: RunDetail },
      { path: "alerts", Component: AlertsList },
      { path: "alerts/rules", Component: AlertRules },
      { path: "connections", Component: ConnectionsList },
      { path: "connections/:id", Component: ConnectionDetail },
      { path: "settings", Component: Settings },
    ],
  },
]);