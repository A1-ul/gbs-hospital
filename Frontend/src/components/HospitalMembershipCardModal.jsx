import React, { useState } from 'react';
import {
  Printer, Download, Copy, Check, X, ShieldCheck, Building2,
  Phone, Mail, MapPin, CreditCard, RefreshCw
} from 'lucide-react';

/**
 * Deterministic 2D Verification Matrix (QR-Style Seal) rendered locally as clean SVG
 * from the card's cryptographic SHA-256 verification hash — zero third-party API calls.
 */
function VerificationMatrixSvg({ seedText, size = 96 }) {
  const str = String(seedText || 'GBS-HOSPITAL-VERIFIED');
  const grid = 15;
  const cells = [];

  // Deterministic pseudo-hash bit stream
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  const isFinder = (r, c) =>
    (r < 4 && c < 4) ||
    (r < 4 && c >= grid - 4) ||
    (r >= grid - 4 && c < 4);

  for (let r = 0; r < grid; r += 1) {
    for (let c = 0; c < grid; c += 1) {
      let filled = false;
      if (isFinder(r, c)) {
        const lr = r >= grid - 4 ? r - (grid - 4) : r;
        const lc = c >= grid - 4 ? c - (grid - 4) : c;
        filled = lr === 0 || lr === 3 || lc === 0 || lc === 3 || (lr === 1 && lc === 1) || (lr === 2 && lc === 2) || (lr === 1 && lc === 2) || (lr === 2 && lc === 1);
      } else {
        h ^= (r * 31 + c * 17 + str.charCodeAt((r * grid + c) % str.length));
        h = Math.imul(h, 16777619);
        filled = ((h >>> 0) % 100) < 48;
      }
      if (filled) {
        cells.push(<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#091830" />);
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`-1 -1 ${grid + 2} ${grid + 2}`}
      role="img"
      aria-label="Hospital Membership Verification Seal"
      style={{ background: '#FFFFFF', borderRadius: '8px', border: '1.5px solid #C29B4F', display: 'block' }}
    >
      <rect x={-1} y={-1} width={grid + 2} height={grid + 2} fill="#FFFFFF" />
      {cells}
    </svg>
  );
}

function getInitials(name) {
  const parts = String(name || 'GBS').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'GB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDateShort(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  } catch (_e) {
    return String(iso).slice(0, 10);
  }
}

/**
 * Official GBS Hospital Registration & Membership ID Card Modal
 * Displays Front & Back of an official accepted-member ID Card styled in Official GBS
 * Midnight Navy (#091830), Antique Gold (#C29B4F), Champagne Gold (#E7CF88) & Warm Ivory (#F7F5EF),
 * with one-click Print and High-Resolution PNG Download.
 */
export default function HospitalMembershipCardModal({
  isOpen,
  cardData,
  loading = false,
  error = null,
  onClose,
  onRetry,
}) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const member = cardData?.member || {};
  const hospital = cardData?.hospital || {};
  const dates = cardData?.dates || {};
  const logoSrc = hospital.logoUrl || '/gbs-official-logo.png';

  const handleCopyVerify = () => {
    if (!cardData?.verificationHash) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${cardData.cardSerial} | ${cardData.verificationHash}`).catch(() => {});
    }
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handlePrintCard = () => {
    if (!cardData || typeof window === 'undefined') return;
    const printWin = window.open('', '_blank', 'width=940,height=720');
    if (!printWin) {
      window.print();
      return;
    }
    const esc = (v) => String(v ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Hospital Membership Card — ${esc(cardData.cardSerial)}</title>
<style>
  * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { margin: 24px; background: #F7F5EF; color: #1B1A1B; }
  .sheet { display: flex; flex-direction: column; gap: 22px; align-items: center; }
  .card { width: 540px; border-radius: 16px; overflow: hidden; border: 2px solid #C29B4F; background: #F7F5EF; box-shadow: 0 8px 24px rgba(9,24,48,0.18); page-break-inside: avoid; }
  .card-top { background: #091830; color: #F7F5EF; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #C29B4F; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo { width: 46px; height: 46px; border-radius: 8px; border: 1.5px solid #E7CF88; background: #091830; object-fit: contain; padding: 2px; }
  .hosp-name { font-size: 15px; font-weight: 800; color: #E7CF88; }
  .hosp-motto { font-size: 11px; color: #D8D2C5; }
  .status-pill { background: #047857; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 999px; border: 1px solid #6EE7B7; }
  .body { padding: 16px 18px; display: grid; grid-template-columns: 92px 1fr; gap: 16px; align-items: start; }
  .avatar { width: 88px; height: 88px; border-radius: 12px; background: #091830; color: #E7CF88; border: 2px solid #C29B4F; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; }
  .member-name { font-size: 18px; font-weight: 800; color: #091830; margin: 0 0 2px; }
  .member-role { font-size: 12px; font-weight: 700; color: #745418; margin-bottom: 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; font-size: 11px; }
  .k { font-size: 9px; text-transform: uppercase; color: #4A5260; font-weight: 700; }
  .v { font-size: 12px; font-weight: 700; color: #1B1A1B; }
  .foot { background: #091830; color: #E7CF88; padding: 9px 18px; font-size: 10px; display: flex; justify-content: space-between; border-top: 2px solid #C29B4F; }
  .back-body { padding: 16px 18px; }
  .back-title { font-size: 12px; font-weight: 800; color: #091830; text-transform: uppercase; border-bottom: 1.5px solid #C29B4F; padding-bottom: 5px; margin-bottom: 10px; }
  .info-row { font-size: 11.5px; margin-bottom: 5px; color: #1B1A1B; }
  .notice { margin-top: 10px; padding: 9px 12px; background: #FFFFFF; border-left: 3px solid #C29B4F; font-size: 10.5px; color: #1B1A1B; line-height: 1.45; }
</style>
</head>
<body>
<div class="sheet">
  <div class="card">
    <div class="card-top">
      <div class="brand">
        <img class="logo" src="${esc(window.location.origin + logoSrc)}" alt="Hospital Logo" />
        <div>
          <div class="hosp-name">${esc(hospital.hospitalName)}</div>
          <div class="hosp-motto">${esc(hospital.motto)}</div>
        </div>
      </div>
      <div class="status-pill">✓ ${esc(cardData.membershipStatus)}</div>
    </div>
    <div class="body">
      <div class="avatar">${esc(getInitials(member.fullName))}</div>
      <div>
        <div class="member-name">${esc(member.fullName)}</div>
        <div class="member-role">${esc(member.roleLabel)} • ${esc(member.department)}</div>
        <div class="grid">
          <div><div class="k">Member / MRN ID</div><div class="v">${esc(member.memberNumber)}</div></div>
          <div><div class="k">Card Serial</div><div class="v">${esc(cardData.cardSerial)}</div></div>
          ${member.bloodGroup ? `<div><div class="k">Blood / Genotype</div><div class="v">${esc(member.bloodGroup)} / ${esc(member.genotype || 'On File')}</div></div>` : `<div><div class="k">Email</div><div class="v">${esc(member.email)}</div></div>`}
          ${member.nhisNumber ? `<div><div class="k">NHIS / Insurance</div><div class="v">${esc(member.nhisNumber)}</div></div>` : `<div><div class="k">Accepted Date</div><div class="v">${esc(formatDateShort(dates.registeredAt))}</div></div>`}
          <div><div class="k">Issued On</div><div class="v">${esc(formatDateShort(dates.issuedAt))}</div></div>
          <div><div class="k">Valid Through</div><div class="v">${esc(formatDateShort(dates.validThrough))}</div></div>
        </div>
      </div>
    </div>
    <div class="foot">
      <span>${esc(cardData.cardCategoryLabel)}</span>
      <span>Verify: ${esc(cardData.verificationHash)}</span>
    </div>
  </div>

  <div class="card">
    <div class="card-top">
      <div style="font-weight:800;font-size:13px;color:#E7CF88;">OFFICIAL HOSPITAL MEMBERSHIP INFORMATION (BACK)</div>
      <div style="font-size:11px;color:#D8D2C5;">Code: ${esc(hospital.hospitalCode)}</div>
    </div>
    <div class="back-body">
      <div class="back-title">${esc(hospital.hospitalName)} — Registered Facility Details</div>
      <div class="info-row"><strong>Hospital Address:</strong> ${esc(hospital.address)}</div>
      <div class="info-row"><strong>Hospital Phone:</strong> ${esc(hospital.phone)} &nbsp;|&nbsp; <strong>Emergency Line:</strong> ${esc(hospital.emergencyLine)}</div>
      <div class="info-row"><strong>Hospital Email:</strong> ${esc(hospital.email)}</div>
      <div class="info-row"><strong>Health Insurance Scheme:</strong> ${esc(hospital.healthInsuranceScheme)}</div>
      ${member.folderNumber ? `<div class="info-row"><strong>Medical Folder Archive:</strong> ${esc(member.folderNumber)} (${esc(member.shelfLocation || 'Active Vault')})</div>` : ''}
      <div class="notice">
        This official registration card certifies that <strong>${esc(member.fullName)}</strong> is an accepted, active member stored in the <strong>${esc(hospital.hospitalName)}</strong> database (${esc(hospital.mainSystemName)}). Present this card at Reception, OPD, Pharmacy, Laboratory, or Billing. If found, please return to ${esc(hospital.hospitalName)} or call ${esc(hospital.phone)}.
      </div>
    </div>
    <div class="foot">
      <span>Serial: ${esc(cardData.cardSerial)}</span>
      <span>Seal: ${esc(cardData.verificationHash)}</span>
    </div>
  </div>
</div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body>
</html>`;
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  const handleDownloadPng = () => {
    if (!cardData || typeof document === 'undefined') return;
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1120;
      canvas.height = 680;
      const ctx = canvas.getContext('2d');

      // Warm Ivory Card Surface
      ctx.fillStyle = '#F7F5EF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer Antique Gold Frame
      ctx.strokeStyle = '#C29B4F';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

      // Top Midnight Navy Brand Header
      ctx.fillStyle = '#091830';
      ctx.fillRect(10, 10, canvas.width - 20, 148);
      ctx.fillStyle = '#C29B4F';
      ctx.fillRect(10, 158, canvas.width - 20, 6);

      // Header Text
      ctx.fillStyle = '#E7CF88';
      ctx.font = 'bold 34px "Segoe UI", Arial, sans-serif';
      ctx.fillText(hospital.hospitalName || 'GBS Hospital', 48, 72);
      ctx.fillStyle = '#D8D2C5';
      ctx.font = '19px "Segoe UI", Arial, sans-serif';
      ctx.fillText(`${hospital.motto || 'Smart Healthcare, Better Care.'} • ${hospital.hospitalCode || ''}`, 48, 108);
      ctx.fillStyle = '#6EE7B7';
      ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
      ctx.fillText(`✓ ${cardData.membershipStatus || 'ACCEPTED MEMBER'}`, 48, 140);

      // Member Initials Medallion
      ctx.fillStyle = '#091830';
      ctx.fillRect(48, 198, 160, 160);
      ctx.strokeStyle = '#C29B4F';
      ctx.lineWidth = 5;
      ctx.strokeRect(48, 198, 160, 160);
      ctx.fillStyle = '#E7CF88';
      ctx.font = 'bold 58px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(getInitials(member.fullName), 128, 298);
      ctx.textAlign = 'left';

      // Member Details
      ctx.fillStyle = '#091830';
      ctx.font = 'bold 38px "Segoe UI", Arial, sans-serif';
      ctx.fillText(member.fullName || 'Hospital Member', 240, 240);
      ctx.fillStyle = '#745418';
      ctx.font = 'bold 21px "Segoe UI", Arial, sans-serif';
      ctx.fillText(`${member.roleLabel || 'Accepted Member'} • ${member.department || ''}`, 240, 276);

      const fields = [
        ['MEMBER / MRN ID', member.memberNumber || '—'],
        ['CARD SERIAL', cardData.cardSerial || '—'],
        ['ACCEPTED DATE', formatDateShort(dates.registeredAt)],
        ['VALID THROUGH', formatDateShort(dates.validThrough)],
        [member.bloodGroup ? 'BLOOD / GENOTYPE' : 'EMAIL', member.bloodGroup ? `${member.bloodGroup} / ${member.genotype || 'On File'}` : (member.email || '—')],
        [member.nhisNumber ? 'NHIS NUMBER' : 'HOSPITAL PHONE', member.nhisNumber || hospital.phone || '—'],
      ];
      fields.forEach(([label, value], i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 240 + col * 420;
        const y = 326 + row * 72;
        ctx.fillStyle = '#4A5260';
        ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
        ctx.fillText(label, x, y);
        ctx.fillStyle = '#1B1A1B';
        ctx.font = 'bold 21px "Segoe UI", Arial, sans-serif';
        ctx.fillText(String(value).slice(0, 34), x, y + 27);
      });

      // Hospital Contact Block
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(48, 520, canvas.width - 96, 76);
      ctx.strokeStyle = '#C29B4F';
      ctx.lineWidth = 2;
      ctx.strokeRect(48, 520, canvas.width - 96, 76);
      ctx.fillStyle = '#091830';
      ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
      ctx.fillText(`Hospital Address: ${hospital.address || 'Main Campus'}`, 68, 550);
      ctx.fillStyle = '#1B1A1B';
      ctx.font = '15px "Segoe UI", Arial, sans-serif';
      ctx.fillText(`Tel: ${hospital.phone || '—'}  |  Emergency: ${hospital.emergencyLine || '112'}  |  Email: ${hospital.email || '—'}`, 68, 578);

      // Footer Navy Seal
      ctx.fillStyle = '#091830';
      ctx.fillRect(10, canvas.height - 62, canvas.width - 20, 52);
      ctx.fillStyle = '#E7CF88';
      ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
      ctx.fillText(cardData.cardCategoryLabel || 'OFFICIAL HOSPITAL MEMBERSHIP ID CARD', 48, canvas.height - 30);
      ctx.textAlign = 'right';
      ctx.fillText(`Verification Seal: ${cardData.verificationHash || ''}`, canvas.width - 48, canvas.height - 30);

      const link = document.createElement('a');
      link.download = `GBS_Membership_Card_${cardData.cardSerial || 'Official'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Official Hospital Registration Membership ID Card"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10040,
        background: 'rgba(5, 11, 22, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '940px',
          maxHeight: '94vh',
          overflowY: 'auto',
          borderRadius: '16px',
          background: '#091830',
          border: '1.5px solid #C29B4F',
          color: '#F7F5EF',
          boxShadow: '0 26px 70px rgba(0, 0, 0, 0.92)',
        }}
      >
        {/* Top Modal Bar */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(194, 155, 79, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={20} style={{ color: '#E7CF88' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#E7CF88' }}>
                Official Hospital Registration &amp; Membership ID Card
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#D8D2C5' }}>
                Verified live from the hospital PostgreSQL database • Front &amp; Back Printable Executive Card
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {cardData && (
              <>
                <button
                  type="button"
                  onClick={handlePrintCard}
                  className="btn-gold"
                  style={{ padding: '7px 14px', fontSize: '0.78rem' }}
                >
                  <Printer size={14} /> Print Card (Front &amp; Back)
                </button>
                <button
                  type="button"
                  disabled={downloading}
                  onClick={handleDownloadPng}
                  className="btn-outline-gold"
                  style={{ padding: '7px 12px', fontSize: '0.78rem' }}
                >
                  <Download size={14} /> {downloading ? 'Preparing PNG...' : 'Download PNG'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyVerify}
                  className="btn-outline-gold"
                  style={{ padding: '7px 12px', fontSize: '0.78rem' }}
                >
                  {copiedHash ? <Check size={14} /> : <Copy size={14} />}
                  {copiedHash ? 'Seal Copied' : 'Copy Verify Seal'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close membership card modal"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(194, 155, 79, 0.4)',
                borderRadius: '8px',
                color: '#F7F5EF',
                padding: '6px',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {loading ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#E7CF88', fontSize: '0.9rem' }}>
              Generating verified official hospital membership ID card...
            </div>
          ) : error ? (
            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                background: 'rgba(220, 38, 38, 0.16)',
                border: '1px solid #EF4444',
                color: '#FCA5A5',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{error}</div>
              {typeof onRetry === 'function' && (
                <button type="button" onClick={onRetry} className="btn-outline-gold" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                  <RefreshCw size={14} /> Retry
                </button>
              )}
            </div>
          ) : cardData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
              {/* FRONT OF OFFICIAL HOSPITAL MEMBERSHIP ID CARD */}
              <div
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '2px solid #C29B4F',
                  background: '#F7F5EF',
                  color: '#1B1A1B',
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Card Header (Official Midnight Navy #091830 + Unmodified GBS Crest) */}
                <div
                  style={{
                    background: '#091830',
                    color: '#F7F5EF',
                    padding: '14px 16px',
                    borderBottom: '3px solid #C29B4F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        minWidth: '44px',
                        borderRadius: '8px',
                        border: '1.5px solid #E7CF88',
                        background: '#091830',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={logoSrc}
                        alt="Official Hospital Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', borderRadius: '5px' }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#E7CF88', lineHeight: 1.2 }}>
                        {hospital.hospitalName}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#D8D2C5' }}>
                        {hospital.motto}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 9px',
                      borderRadius: '999px',
                      background: '#047857',
                      color: '#FFFFFF',
                      border: '1px solid #6EE7B7',
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ShieldCheck size={12} /> {cardData.membershipStatus}
                  </span>
                </div>

                {/* Front Body (Official Warm Ivory #F7F5EF + Charcoal #1B1A1B & Navy #091830 Text) */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '12px',
                        background: '#091830',
                        border: '2px solid #C29B4F',
                        color: '#E7CF88',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(member.fullName)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#745418', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {cardData.cardCategoryLabel}
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#091830', lineHeight: 1.2 }}>
                        {member.fullName}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#333B48', fontWeight: 600 }}>
                        {member.roleLabel} • {member.department}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid rgba(194, 155, 79, 0.5)' }}>
                    <div>
                      <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#4A5260', textTransform: 'uppercase' }}>Member / MRN ID</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#091830', fontFamily: 'var(--font-mono)' }}>{member.memberNumber}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#4A5260', textTransform: 'uppercase' }}>Card Serial</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#745418', fontFamily: 'var(--font-mono)' }}>{cardData.cardSerial}</div>
                    </div>
                    {member.bloodGroup ? (
                      <div>
                        <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#4A5260', textTransform: 'uppercase' }}>Blood / Genotype</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1B1A1B' }}>{member.bloodGroup} • {member.genotype || 'On File'}</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#4A5260', textTransform: 'uppercase' }}>Official Email</div>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1B1A1B', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email || '—'}</div>
                      </div>
                    )}
                    {member.nhisNumber ? (
                      <div>
                        <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#4A5260', textTransform: 'uppercase' }}>NHIS / Insurance</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1B1A1B', fontFamily: 'var(--font-mono)' }}>{member.nhisNumber}</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#4A5260', textTransform: 'uppercase' }}>Accepted Date</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1B1A1B' }}>{formatDateShort(dates.registeredAt)}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#4A5260', textTransform: 'uppercase' }}>Date Issued</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1B1A1B' }}>{formatDateShort(dates.issuedAt)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#4A5260', textTransform: 'uppercase' }}>Valid Through</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1B1A1B' }}>{formatDateShort(dates.validThrough)}</div>
                    </div>
                  </div>
                </div>

                {/* Front Bottom Navy Bar */}
                <div
                  style={{
                    background: '#091830',
                    color: '#E7CF88',
                    padding: '9px 16px',
                    borderTop: '2px solid #C29B4F',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span>FRONT • {hospital.hospitalCode}</span>
                  <span>SEAL: {cardData.verificationHash}</span>
                </div>
              </div>

              {/* BACK OF OFFICIAL HOSPITAL MEMBERSHIP ID CARD (Complete Hospital Details + Seal) */}
              <div
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '2px solid #C29B4F',
                  background: '#F7F5EF',
                  color: '#1B1A1B',
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    background: '#091830',
                    color: '#E7CF88',
                    padding: '13px 16px',
                    borderBottom: '3px solid #C29B4F',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={15} /> HOSPITAL FACILITY INFORMATION (BACK)
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#D8D2C5', fontFamily: 'var(--font-mono)' }}>
                    {hospital.countryFlag} {hospital.country}
                  </span>
                </div>

                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, fontSize: '0.78rem', color: '#1B1A1B' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#091830' }}>{hospital.hospitalName}</div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <MapPin size={14} style={{ color: '#745418', flexShrink: 0, marginTop: '2px' }} />
                        <span>{hospital.address}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} style={{ color: '#745418', flexShrink: 0 }} />
                        <span>{hospital.phone} • Emergency: <strong>{hospital.emergencyLine}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} style={{ color: '#745418', flexShrink: 0 }} />
                        <span>{hospital.email}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <VerificationMatrixSvg seedText={cardData.qrPayload || cardData.verificationHash} size={94} />
                      <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: '#091830', fontWeight: 800, marginTop: '4px' }}>
                        {cardData.verificationHash}
                      </div>
                    </div>
                  </div>

                  {member.folderNumber && (
                    <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid rgba(194, 155, 79, 0.45)', fontSize: '0.74rem' }}>
                      <strong style={{ color: '#091830' }}>Medical Records Archive:</strong> {member.folderNumber} ({member.shelfLocation || 'Active Records Vault'})
                    </div>
                  )}

                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      borderLeft: '3px solid #C29B4F',
                      fontSize: '0.73rem',
                      lineHeight: 1.5,
                      color: '#1B1A1B',
                    }}
                  >
                    This official registration card certifies that <strong>{member.fullName}</strong> is an accepted member registered in the{' '}
                    <strong>{hospital.hospitalName}</strong> system ({hospital.mainSystemName}). Present this card at Front Desk, OPD, Pharmacy, Lab, or Billing. If found, please return to {hospital.hospitalName} or call {hospital.phone}.
                  </div>
                </div>

                <div
                  style={{
                    background: '#091830',
                    color: '#D8D2C5',
                    padding: '9px 16px',
                    borderTop: '2px solid #C29B4F',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.68rem',
                  }}
                >
                  <span>Scheme: {hospital.healthInsuranceScheme}</span>
                  <span style={{ color: '#E7CF88', fontWeight: 700 }}>GBS Verified Membership</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
