import { X, Building2, User, Users, MapPin, Calendar, Globe, Mail, Phone, Award, Shield, TrendingUp, Layers, Clock } from 'lucide-react';
import GpsMap, { parseGps } from './GpsMap.jsx';

const STATUS_CFG = {
  under_review: { label: 'Under Review', color: '#92400E', bg: '#FEF9C3', border: '#FDE68A', dot: '#D97706' },
  verified:     { label: 'Verified',     color: '#145C28', bg: '#D6F5E3', border: '#A8EFC0', dot: '#22A84B' },
  cancelled:    { label: 'Cancelled',    color: '#991B1B', bg: '#FEE2E2', border: '#FECACA', dot: '#EF4444' },
};

function SectionStatusBadge({ status }) {
  const cfg = STATUS_CFG[status];
  if (!cfg) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function InfoRow({ label, value, icon: Icon, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{
        fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.12em', color: '#6A9278',
        fontFamily: 'Montserrat,sans-serif',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: 13,
        color: accent ? '#145C28' : '#0A2016',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        {Icon && <Icon size={12} color="#22A84B" />}
        {value || '—'}
      </span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #D0E8D8',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,40,16,0.07)',
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 18px',
        background: 'linear-gradient(90deg, #EFF9F4 0%, #F4F8F5 100%)',
        borderBottom: '1px solid #D0E8D8',
      }}>
        {Icon && (
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #1A7A35, #22A84B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={14} color="#fff" />
          </span>
        )}
        <h3 style={{
          fontFamily: 'Montserrat,sans-serif', fontWeight: 800,
          fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
          color: '#145C28', margin: 0,
        }}>
          {title}
        </h3>
      </div>
      {/* Card body */}
      <div style={{ padding: '16px 18px' }}>
        {children}
      </div>
    </div>
  );
}

export default function ProjectSummaryReportModal({ project, categories, onClose }) {
  if (!project) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getCategoryName = (catId) => {
    if (!catId) return '—';
    const found = categories?.find(c => c._id === catId || c.name === catId);
    return found ? found.name : catId;
  };

  const scorePct = Math.min(project.scorePercent || 0, 100);

  const leafLevel = project.adminOverride || project.leafLevel;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(5,26,10,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        className="fade-in-up"
        style={{
          width: '100%', maxWidth: 900,
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 24,
          background: '#F4F8F5',
          border: '1.5px solid #A8EFC0',
          boxShadow: '0 32px 80px rgba(0,40,16,0.35), 0 8px 24px rgba(0,40,16,0.18)',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'linear-gradient(135deg, #051A0A 0%, #0A2D14 50%, #145C28 100%)',
          borderRadius: '22px 22px 0 0',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', gap: 14,
          borderBottom: '1.5px solid rgba(52,201,97,0.25)',
        }}>
          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(34,168,75,0.3), rgba(52,201,97,0.15))',
            border: '1.5px solid rgba(93,216,130,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Building2 size={20} color="#5DD882" />
          </div>

          {/* Title block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              display: 'block', fontSize: 9, fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.15em',
              color: 'rgba(93,216,130,0.7)', fontFamily: 'Montserrat,sans-serif',
              marginBottom: 3,
            }}>
              Digital Summary Report
            </span>
            <h2 style={{
              fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
              fontSize: 18, color: '#fff', margin: 0, lineHeight: 1.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {project.projectName || project.title || 'Project Details'}
            </h2>
          </div>

          {/* Status + close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{
              padding: '4px 12px', borderRadius: 99,
              fontSize: 10, fontWeight: 800,
              fontFamily: 'Montserrat,sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              ...(project.status === 'submitted'
                ? { background: 'rgba(34,168,75,0.2)', color: '#5DD882', border: '1px solid rgba(93,216,130,0.35)' }
                : { background: 'rgba(251,191,36,0.2)', color: '#FCD34D', border: '1px solid rgba(251,191,36,0.35)' }
              ),
            }}>
              ● {project.status === 'submitted' ? 'Submitted' : 'Draft'}
            </span>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#FCA5A5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Score Strip ── */}
        <div style={{
          background: '#EFF9F4',
          borderBottom: '1px solid #D0E8D8',
          padding: '18px 24px',
          display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
        }}>
          {/* Big score */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{
              fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
              fontSize: 48, lineHeight: 1, color: '#145C28',
            }}>
              {project.scorePercent || 0}
            </span>
            <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 22, color: '#1A7A35' }}>%</span>
          </div>

          <div style={{ width: 1.5, height: 44, background: '#A8EFC0', flexShrink: 0 }} />

          {/* Points + level */}
          <div>
            <p style={{
              fontFamily: 'Montserrat,sans-serif', fontWeight: 800,
              fontSize: 16, color: '#145C28', margin: 0,
            }}>
              {Math.round(project.totalPoints || 0)} / {Math.round(project.maxPoints || 0)} pts
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {leafLevel && (
                <span style={{
                  padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 800,
                  fontFamily: 'Montserrat,sans-serif',
                  background: '#D6F5E3', color: '#145C28', border: '1px solid #A8EFC0',
                }}>
                  🌿 {leafLevel}
                </span>
              )}
              {/* Section statuses summary */}
              {project.sectionStatuses?.map((ss, i) => (
                <SectionStatusBadge key={i} status={ss.status} />
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{
              fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3D6B50',
              marginBottom: 6,
            }}>
              Overall Score
            </p>
            <div style={{
              height: 10, background: '#D6F5E3', borderRadius: 99, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 99, width: `${scorePct}%`,
                background: 'linear-gradient(90deg, #1A7A35, #22A84B)',
                transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
            <p style={{
              fontFamily: 'Montserrat,sans-serif', fontSize: 10, fontWeight: 700,
              color: '#1A7A35', marginTop: 5,
            }}>
              {scorePct}% achieved
            </p>
          </div>

          {/* Date */}
          <div style={{ flexShrink: 0 }}>
            <p style={{
              fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6A9278',
              marginBottom: 4,
            }}>
              Last Updated
            </p>
            <p style={{
              fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: 13, color: '#145C28',
              display: 'flex', alignItems: 'center', gap: 5, margin: 0,
            }}>
              <Clock size={12} color="#22A84B" />
              {formatDate(project.updatedAt)}
            </p>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Stat pills row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: 'Project Type', value: getCategoryName(project.projectType || project.categoryId), icon: Layers },
              { label: 'Size Classification', value: project.projectSize || '—', icon: TrendingUp },
              { label: 'Site Area', value: project.siteArea ? `${Number(project.siteArea).toLocaleString()} sqm` : '—', icon: Globe },
              { label: 'Built-Up Area', value: project.totalBuiltUpArea ? `${Number(project.totalBuiltUpArea).toLocaleString()} sqm` : '—', icon: Building2 },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} style={{
                background: '#fff',
                border: '1px solid #D0E8D8',
                borderRadius: 12,
                padding: '12px 14px',
                boxShadow: '0 1px 4px rgba(0,40,16,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Icon size={13} color="#22A84B" />
                  <span style={{
                    fontFamily: 'Montserrat,sans-serif', fontSize: 9, fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6A9278',
                  }}>{label}</span>
                </div>
                <p style={{
                  fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 14,
                  color: '#0A2016', margin: 0,
                }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Left: General Info */}
            <SectionCard title="General Project Information" icon={Globe}>
              {/* parse coords once */}
              {(() => {
                const gpsCoord = parseGps(project.gpsCoordinates);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* GPS coordinates field */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                          letterSpacing: '0.12em', color: '#6A9278',
                          fontFamily: 'Montserrat,sans-serif',
                        }}>GPS Coordinates</span>
                        <span style={{
                          fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: 13,
                          color: '#0A2016', display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <MapPin size={12} color="#22A84B" />
                          {project.gpsCoordinates || '—'}
                        </span>
                      </div>
                      <InfoRow label="Postal Code" value={project.postCode} />
                      <InfoRow
                        label="Construction Start"
                        value={formatDate(project.constructionStartDate)}
                        icon={Calendar}
                      />
                      <InfoRow
                        label="Expected Completion"
                        value={formatDate(project.constructionEndDate)}
                        icon={Calendar}
                      />
                      <div style={{ gridColumn: 'span 2' }}>
                        <InfoRow label="Site Address" value={project.address} icon={MapPin} />
                      </div>
                    </div>

                    {/* Embedded map — only shown when coords are valid */}
                    {gpsCoord && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 10px',
                          background: 'linear-gradient(90deg, var(--g50, #EFF9F4), #fff)',
                          borderRadius: 8, border: '1px solid #D0E8D8',
                        }}>
                          <MapPin size={12} color="#22A84B" />
                          <span style={{
                            fontFamily: 'Montserrat,sans-serif', fontSize: 9, fontWeight: 800,
                            textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3D6B50',
                          }}>Project Location Map</span>
                          <span style={{
                            marginLeft: 'auto', fontFamily: 'Nunito,sans-serif',
                            fontSize: 10, fontWeight: 700, color: '#6A9278',
                          }}>
                            {gpsCoord.lat.toFixed(5)}, {gpsCoord.lng.toFixed(5)}
                          </span>
                        </div>
                        <GpsMap
                          lat={gpsCoord.lat}
                          lng={gpsCoord.lng}
                          interactive={false}
                          height={210}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </SectionCard>

            {/* Right: Engineer / Owner */}
            <SectionCard title="Engineer / Owner Info" icon={User}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <InfoRow label="Owner / Engineer Name" value={project.engineerName} accent />
                <InfoRow label="Designation" value={project.designation} />
                <InfoRow label="Organization" value={project.organization} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <InfoRow label="Mobile" value={project.mobile} icon={Phone} />
                  <InfoRow label="Telephone" value={project.telephone} icon={Phone} />
                </div>
                <InfoRow label="Email" value={project.email} icon={Mail} accent />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <InfoRow label="Postal Code" value={project.officePostCode} />
                  <InfoRow label="Office Address" value={project.officeAddress} />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Associates & Consultants — full width */}
          <SectionCard title="Associates and Consultants" icon={Users}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <InfoRow label="Project Coordinator Details" value={project.projectCoordinatorDetails} />
              </div>
              <InfoRow label="Architect Name" value={project.architectName} />
              <InfoRow label="IAB Membership No." value={project.iabMembershipNo} icon={Award} />
              <div style={{ gridColumn: 'span 2' }}>
                <InfoRow label="Green Building Consultant Details" value={project.greenBuildingConsultantDetails} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <InfoRow label="SREDA Registration Number" value={project.sredaRegistrationNumber} icon={Shield} />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #D0E8D8',
          background: '#EFF9F4',
          borderRadius: '0 0 22px 22px',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            className="btn-primary-green"
            style={{ padding: '10px 24px', fontSize: 13 }}
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
