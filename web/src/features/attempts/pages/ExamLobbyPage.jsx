import ManagementFrame from '../../../shared/ui/ManagementFrame';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../../shared/ui/Card';
import Button from '../../../shared/ui/Button';
import Badge from '../../../shared/ui/Badge';
import Modal from '../../../shared/ui/Modal';
import { mockApi } from '../../../mocks/mockService';
import { assessmentsApi } from '../../assessments/services/assessments.api';
import { useAuth } from '../../../shared/hooks/useAuth';
import { ArrowLeft, CheckCircle2, Clock, ArrowRight, AlertCircle } from 'lucide-react';

export default function ExamLobbyPage() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { currentUser } = useAuth();
  const [exam, setExam] = useState(null);
  const [starting, setStarting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    assessmentsApi.listSessions().then((res) => {
      const found = (res.data || []).find((e) => e.id === examId);
      if (found) {
        setExam(found);
      } else {
        mockApi.getExamById(examId).then((mockRes) => setExam(mockRes.data));
      }
    }).catch(() => {
      mockApi.getExamById(examId).then((mockRes) => setExam(mockRes.data));
    });
  }, [examId]);

  const [errorMessage, setErrorMessage] = useState('');
  const [now, setNow] = useState(Date.now());

  // Đồng hồ đếm thời gian thực cập nhật mỗi 1 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tính toán thời gian của ca thi (StartTime, EndTime, Duration)
  const startTimeMs = exam?.startTime ? new Date(exam.startTime).getTime() : null;
  const endTimeMs = exam?.endTime ? new Date(exam.endTime).getTime() : null;

  const isUpcoming = startTimeMs ? now < startTimeMs : false;
  const isExpired = endTimeMs ? now > endTimeMs : false;
  const isOpen = (!startTimeMs || now >= startTimeMs) && (!endTimeMs || now <= endTimeMs);

  // Thời gian còn lại của ca thi tới lúc đóng phòng (Hard deadline)
  const msUntilClose = endTimeMs ? Math.max(0, endTimeMs - now) : null;
  const secondsUntilClose = msUntilClose !== null ? Math.floor(msUntilClose / 1000) : null;
  const minutesUntilClose = secondsUntilClose !== null ? Math.floor(secondsUntilClose / 60) : null;

  // Thời gian còn lại tới khi mở ca thi (nếu chưa tới giờ)
  const msUntilStart = startTimeMs && isUpcoming ? Math.max(0, startTimeMs - now) : null;
  const secondsUntilStart = msUntilStart !== null ? Math.floor(msUntilStart / 1000) : null;

  // Thời gian làm bài danh định và thời gian làm bài thực tế đáp ứng
  const configuredDurationMinutes = exam?.durationMinutes || 45;
  const effectiveDurationMinutes = minutesUntilClose !== null 
    ? Math.min(configuredDurationMinutes, minutesUntilClose) 
    : configuredDurationMinutes;
  const isDurationCappedBySession = minutesUntilClose !== null && minutesUntilClose < configuredDurationMinutes;

  const formatCountdown = (totalSec) => {
    if (totalSec === null || totalSec === undefined) return '--:--:--';
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const formatDateTimeVN = (dateStr) => {
    if (!dateStr) return 'Không giới hạn';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleStartExam = async () => {
    if (!agreed || isUpcoming || isExpired) return;
    
    // Kiểm tra trạng thái đăng nhập của thí sinh
    if (!currentUser) {
      setErrorMessage('Bạn chưa đăng nhập hệ thống hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập tài khoản trước khi vào phòng thi.');
      return;
    }

    setStarting(true);
    setErrorMessage('');
    try {
      // Sinh Browser Device Fingerprint đơn giản chống thi hộ
      const fingerprint = btoa(navigator.userAgent + '|' + screen.width + 'x' + screen.height + '|' + (navigator.hardwareConcurrency || 4)).slice(0, 48);
      const res = await assessmentsApi.startAttempt({
        examSessionId: examId,
        fingerprint,
        userAgent: navigator.userAgent,
      });
      const attempt = res?.data || res;
      if (!attempt || !attempt.sessionToken) {
        throw new Error(res?.message || 'Chưa thể xác thực quyền truy cập bài thi vào lúc này');
      }
      // Lưu session token và attempt data vào sessionStorage để AttemptPage tải trực tiếp
      sessionStorage.setItem('current_attempt_token', attempt.sessionToken);
      sessionStorage.setItem('current_attempt_id', attempt.attemptId);
      sessionStorage.setItem('current_attempt_data', JSON.stringify(attempt));
      navigate(`/exam/attempts/${attempt.attemptId}`);
    } catch (e) {
      // Lấy thông điệp lỗi chi tiết từ phản hồi backend nếu có
      let errMsg = e?.message || e?.error || 'Hệ thống chưa thể ghi nhận lượt thi vào lúc này';
      if (typeof e === 'string') errMsg = e;

      // Thử khởi tạo lượt thi từ mockApi nếu ca thi thuộc danh sách mock
      try {
        const mockRes = await mockApi.startAttempt(examId, currentUser?.id);
        if (mockRes?.data?.id) {
          navigate(`/exam/attempts/${mockRes.data.id}`);
          return;
        }
      } catch (_) {}

      // Lọc bỏ các từ ngữ thô ráp, giữ nguyên thông điệp nghiệp vụ
      const refinedMsg = errMsg.replace(/máy chủ/gi, 'hệ thống khảo thí');
      setErrorMessage(refinedMsg);
      setStarting(false);
    }
  };

  if (!exam) return <div style={{ padding: '40px', textAlign: 'center' }}>Đang nạp phòng thi...</div>;

  return (
    <ManagementFrame className="management-screen" header={<span className="management-tab-active">Thông tin ca thi</span>} status={<strong>{isOpen ? 'Đang mở' : isUpcoming ? 'Chưa bắt đầu' : 'Đã kết thúc'}</strong>}><div className="management-body-scroll">
      <Card style={{ padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Badge variant={isOpen ? 'green' : isUpcoming ? 'amber' : 'red'} size="md">
            {isOpen ? 'Ca thi đang diễn ra' : isUpcoming ? 'Ca thi sắp diễn ra' : 'Ca thi đã đóng'}
          </Badge>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--navy)', marginTop: '10px', marginBottom: '4px' }}>
            {exam.title}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--navy-muted)' }}>
            Mã ca thi: <strong>{exam.code}</strong> · Thí sinh: <strong>{currentUser?.name}</strong>
          </p>
        </div>

        {/* THỜI GIAN THI ĐÁP ỨNG & BỘ ĐẾM GIỜ CA THI */}
        <div style={{
          background: isOpen 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)' 
            : isUpcoming 
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.08) 100%)'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(185, 28, 28, 0.08) 100%)',
          border: `1.5px solid ${isOpen ? 'rgba(16, 185, 129, 0.3)' : isUpcoming ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          alignItems: 'center'
        }}>
          {/* Bộ đếm ngược thời gian ca thi */}
          <div style={{ textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--navy-muted)', fontWeight: 600, marginBottom: '4px' }}>
              {isUpcoming ? 'Thời gian đến khi mở ca' : isOpen ? 'Thời gian còn lại của ca thi' : 'Trạng thái ca thi'}
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: '800',
              fontFamily: 'monospace, monospace',
              color: isOpen ? '#059669' : isUpcoming ? '#d97706' : '#dc2626',
              letterSpacing: '1px'
            }}>
              {isUpcoming 
                ? formatCountdown(secondsUntilStart) 
                : isOpen 
                ? (secondsUntilClose !== null ? formatCountdown(secondsUntilClose) : 'Không giới hạn') 
                : '00:00:00'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--navy-muted)', marginTop: '2px' }}>
              {isOpen && secondsUntilClose !== null && (
                <span>Đóng ca lúc: <strong>{formatDateTimeVN(exam.endTime)}</strong></span>
              )}
              {isUpcoming && (
                <span>Bắt đầu lúc: <strong>{formatDateTimeVN(exam.startTime)}</strong></span>
              )}
              {isExpired && (
                <span>Đã hết hạn nộp bài phòng thi</span>
              )}
            </div>
          </div>

          {/* Thời gian làm bài đáp ứng */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--navy-muted)', fontWeight: 600, marginBottom: '4px' }}>
              Thời lượng làm bài khả dụng
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
              <span style={{ fontSize: '32px', fontWeight: '800', color: isDurationCappedBySession ? '#d97706' : 'var(--navy)' }}>
                {effectiveDurationMinutes}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy-muted)' }}>phút</span>
            </div>
            <div style={{ fontSize: '11px', color: isDurationCappedBySession ? '#b45309' : 'var(--navy-muted)', marginTop: '2px' }}>
              {isDurationCappedBySession ? (
                <strong>⚠️ Giảm do ca thi sắp kết thúc lúc {formatDateTimeVN(exam.endTime)} (quy định {configuredDurationMinutes}p)</strong>
              ) : (
                <span>Định mức tiêu chuẩn: <strong>{configuredDurationMinutes} phút</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* System readiness checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--surface-canvas)', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>Xác thực danh tính thí sinh: <strong>{currentUser?.name} ({currentUser?.email})</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>Khung giờ ca thi: Từ <strong>{formatDateTimeVN(exam.startTime)}</strong> đến <strong>{formatDateTimeVN(exam.endTime)}</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>Cơ chế bảo vệ dữ liệu: <strong>Tự động lưu từng câu & Idempotent Submit kích hoạt</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <Clock size={18} color="var(--color-primary-600)" />
            <span>Đồng hồ tính giờ bài làm: <strong>Bắt đầu đếm ngược ngay khi bấm nút bắt đầu</strong></span>
          </div>
        </div>

        {/* Agreement checkbox */}
        <div style={{ padding: '14px', border: '1px solid var(--line)', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            id="agree-rules"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="agree-rules" style={{ fontSize: '13px', color: 'var(--navy)', cursor: 'pointer' }}>
            Tôi cam kết làm bài trung thực, không gian lận và tuân thủ mọi quy chế khảo thí của SkillHub.
          </label>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(`/app/exams/${examId}`)}>
            Quay lại
          </Button>

          <Button
            variant="primary"
            size="lg"
            disabled={!agreed || starting || !isOpen}
            loading={starting}
            icon={ArrowRight}
            iconPosition="right"
            onClick={handleStartExam}
          >
            {isUpcoming ? 'Chưa tới giờ vào thi' : isExpired ? 'Ca thi đã kết thúc' : 'Bắt đầu làm bài thi ngay'}
          </Button>
        </div>
      </Card>

      {/* MODAL THÔNG BÁO VÀO THI */}
      <Modal
        open={Boolean(errorMessage)}
        onClose={() => setErrorMessage('')}
        title="Thông báo ca thi"
        size="md"
      >
        <div className="flex flex-col items-center justify-center text-center p-4 space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
            <AlertCircle size={28} />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Chưa thể vào phòng thi
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 w-full">
            {errorMessage}
          </div>
          <div className="text-[11px] text-slate-400">
            Thí sinh vui lòng kiểm tra lại khung giờ ca thi hoặc liên hệ ban giám thị để được hỗ trợ cấp quyền tham gia.
          </div>
          <div className="pt-2 w-full flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setErrorMessage('')}>
              Đã hiểu & Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div></ManagementFrame>
  );
}
