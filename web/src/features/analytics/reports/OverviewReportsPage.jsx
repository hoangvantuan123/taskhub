import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import Tabs from '../../../shared/ui/Tabs';
import {
  BarChart3,
  Globe,
  Database,
  Clock,
  Building2,
  Users,
  FileSpreadsheet,
  Download,
  Layers,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import SystemTaskReportsTab from './SystemTaskReportsTab';
import SharepointProgressReportsTab from './SharepointProgressReportsTab';
import { taskService } from '../../tasks/services/taskService';

class ReportErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ReportErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-white dark:bg-slate-900">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Không thể tải giao diện báo cáo
          </h3>
          <p className="text-xs text-slate-500 max-w-md">
            {this.state.error?.message || 'Đã xảy ra lỗi không mong muốn khi dựng biểu đồ phân tích.'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition"
          >
            <RotateCcw size={14} /> Tải lại báo cáo
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function OverviewReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const subParam = searchParams.get('sub');

  // Determine active tab from URL pathname or searchParams
  const getInitialTab = () => {
    if (subParam) return subParam;
    if (location.pathname.includes('/deadlines')) return 'deadlines';
    if (location.pathname.includes('/departments')) return 'departments';
    if (location.pathname.includes('/employees')) return 'employees';
    if (location.pathname.includes('/performance')) return 'performance';
    if (location.pathname.includes('/export')) return 'export';
    return 'system';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  const [dbReportTitle, setDbReportTitle] = useState(() => {
    return localStorage.getItem('goldsun_sharepoint_report_name') || 'Báo cáo tiến độ SharePoint';
  });

  // Load config from PostgreSQL Database
  const fetchDbConfig = useCallback(async () => {
    try {
      const cfg = await taskService.getReportConfig('sharepoint_progress');
      if (cfg && cfg.title) {
        setDbReportTitle(cfg.title);
        localStorage.setItem('goldsun_sharepoint_report_name', cfg.title);
      }
    } catch (e) {
      console.warn('Could not load report config from DB:', e);
    }
  }, []);

  useEffect(() => {
    fetchDbConfig();
  }, [fetchDbConfig]);

  // Sync tab with URL query parameter or pathname changes
  useEffect(() => {
    const currentTab = getInitialTab();
    if (currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [subParam, location.pathname]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (location.pathname !== '/app/reports') {
      navigate(`/app/reports?sub=${tabId}`);
    } else {
      setSearchParams({ sub: tabId });
    }
  };

  // If viewing SharePoint report (from sidebar menu /app/reports?sub=sharepoint),
  // render the dedicated single view directly with NO tabs and allow full vertical page scroll:
  if (subParam === 'sharepoint' || activeTab === 'sharepoint') {
    return (
      <div className="h-full w-full flex-1 min-h-0 flex flex-col overflow-y-auto">
        <ReportErrorBoundary>
          <SharepointProgressReportsTab
            onConfigUpdated={(newTitle) => {
              if (newTitle) setDbReportTitle(newTitle);
            }}
          />
        </ReportErrorBoundary>
      </div>
    );
  }

  const reportTitles = {
    system: 'Báo cáo công việc hệ thống',
    sharepoint: dbReportTitle || 'Báo cáo tiến độ SharePoint',
    deadlines: 'Tiến độ & Deadline',
    departments: 'Báo cáo phòng ban',
    employees: 'Báo cáo nhân viên',
    performance: 'Hiệu suất & Thời gian',
    export: 'Xuất báo cáo',
  };
  const currentTitle = reportTitles[activeTab] || 'Tổng quan báo cáo';

  return (
    <ManagementFrame
      className="h-full"
      scrollableContent={false}
      header={
        <>
          <Tabs
            tabs={[{ id: activeTab, label: currentTitle }]}
            activeTab={activeTab}
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Database size={12} /> CSDL PostgreSQL
            </span>
          </div>
        </>
      }
    >
      <div className="h-full w-full flex-1 min-h-0 flex flex-col overflow-hidden">
        <ReportErrorBoundary>
          {activeTab === 'sharepoint' ? (
            <SharepointProgressReportsTab
              onConfigUpdated={(newTitle) => {
                if (newTitle) setDbReportTitle(newTitle);
              }}
            />
          ) : (
            <SystemTaskReportsTab reportMode={activeTab} />
          )}
        </ReportErrorBoundary>
      </div>
    </ManagementFrame>
  );
}
