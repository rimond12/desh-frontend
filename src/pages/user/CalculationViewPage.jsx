import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import CalcEngine from '../../components/calcEngine/CalcEngine.jsx';

export default function CalculationViewPage() {
    const { id } = useParams();
    const { dbUser } = useAuth();

    // Use activeRole for sidebar — respects the role the user is currently acting as
    const activeRole = dbUser?.activeRole || dbUser?.role;
    const isAdmin    = activeRole === 'admin';
    const isManager  = activeRole === 'desh_manager';
    const isReviewer = ['reviewer', 'desh_reviewer', 'desh_assessor'].includes(activeRole);

    return (
        <Layout isAdmin={isAdmin} isReviewer={isReviewer} isManager={isManager}>
            {/* Back link */}
            <div style={{ marginBottom: 20 }}>
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
            </div>

            {/* Calculation engine */}
            <CalcEngine calcId={id} />
        </Layout>
    );
}
