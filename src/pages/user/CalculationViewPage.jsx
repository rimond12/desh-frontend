import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import CalcEngine from '../../components/calcEngine/CalcEngine.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function CalculationViewPage() {
    const { id } = useParams();
    const { dbUser } = useAuth();
    const [searchParams] = useSearchParams();
    const ax = useAxiosSecure();

    const projectId = searchParams.get('projectId');
    const inputId = searchParams.get('inputId');
    const readOnlyQuery = searchParams.get('readOnly') === 'true';

    const [project, setProject] = useState(null);

    // Use activeRole for sidebar — respects the role the user is currently acting as
    const activeRole = dbUser?.activeRole || dbUser?.role;
    const isAdmin    = activeRole === 'admin';
    const isManager  = activeRole === 'desh_manager';
    const isReviewer = ['reviewer', 'desh_reviewer', 'desh_assessor'].includes(activeRole);

    // If project is closed/locked, or user is reviewer/admin/manager, enforce read-only
    const isProjectLocked = project?.status === 'submitted' || project?.status === 'approved' || project?.status === 'rejected';
    const forceReadOnly = readOnlyQuery || isReviewer || isAdmin || isManager || isProjectLocked;

    useEffect(() => {
        if (!projectId) return;
        async function fetchProject() {
            try {
                const res = await ax.get(`/projects/${projectId}`);
                setProject(res.data.project || null);
            } catch (err) {
                console.error("Failed to load project info", err);
            }
        }
        fetchProject();
    }, [projectId, ax]);

    return (
        <Layout isAdmin={isAdmin} isReviewer={isReviewer} isManager={isManager}>
            {/* Navigation / Project Context Header */}
            <div style={{
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-soft)',
                padding: '12px 20px',
                borderRadius: 12,
                border: '1px solid var(--border)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tx-muted)' }}>
                        {projectId && project ? (
                            <>
                                <span>Projects</span>
                                <span>/</span>
                                <span style={{ fontWeight: 600 }}>{project.title}</span>
                                <span>/</span>
                            </>
                        ) : (
                            <>
                                <span>Calculations</span>
                                <span>/</span>
                            </>
                        )}
                        <span style={{ color: 'var(--tx)' }}>Calculation Sheet</span>
                    </div>
                    {project && (
                        <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--tx)' }}>
                            {project.title} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx-muted)' }}>({project.categoryId?.name})</span>
                        </h2>
                    )}
                </div>

                <div>
                    {projectId ? (
                        <button
                            onClick={() => window.close()}
                            style={{
                                color: 'var(--tx)', fontSize: 13, fontWeight: 700,
                                background: '#fff', border: '1.5px solid var(--border-md)',
                                padding: '8px 16px', borderRadius: 9, cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 4
                            }}
                        >
                            ✕ Close Tab
                        </button>
                    ) : (
                        <Link
                            to="/calculations"
                            style={{
                                color: 'var(--g600)', fontSize: 13, fontWeight: 700,
                                textDecoration: 'none', display: 'inline-flex',
                                alignItems: 'center', gap: 4,
                            }}
                        >
                            ← Back to Calculations
                        </Link>
                    )}
                </div>
            </div>

            {/* Calculation engine */}
            <CalcEngine 
                calcId={id} 
                projectId={projectId} 
                inputId={inputId} 
                readOnly={forceReadOnly} 
            />
        </Layout>
    );
}
